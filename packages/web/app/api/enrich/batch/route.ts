/**
 * POST /api/enrich/batch - Start batch enrichment
 */

import { NextRequest, NextResponse } from 'next/server';
import { enrichBookmarkBatch, estimateBatchEnrichmentCost } from '@bookmark-gen/services';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookmark_ids, skip_intent, skip_context, skip_category, skip_connections } = body;

    // Estimate cost first
    const estimate = estimateBatchEnrichmentCost(bookmark_ids);

    if (estimate.bookmarks_count === 0) {
      return NextResponse.json({
        error: 'No bookmarks found to enrich',
        code: 'NO_BOOKMARKS',
      }, { status: 400 });
    }

    console.log(`🚀 Starting batch enrichment for ${estimate.bookmarks_count} bookmarks...`);
    console.log(`   Estimated cost: $${estimate.estimated_cost.toFixed(4)}`);
    console.log(`   Estimated tokens: ${estimate.estimated_tokens.toLocaleString()}`);

    // Run enrichment
    const result = await enrichBookmarkBatch(bookmark_ids, {
      skipIntent: skip_intent,
      skipContext: skip_context,
      skipCategory: skip_category,
      skipConnections: skip_connections,
    });

    return NextResponse.json({
      data: result,
      metadata: {
        estimate,
        actual_cost: result.total_cost,
        cost_accuracy: Math.abs(result.total_cost - estimate.estimated_cost) / estimate.estimated_cost,
      },
    });
  } catch (error) {
    console.error('❌ Batch enrichment error:', error);

    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Batch enrichment failed',
      code: 'ENRICHMENT_ERROR',
      details: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}

/**
 * GET /api/enrich/batch - Get enrichment estimate
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const bookmarkIdsParam = searchParams.get('bookmark_ids');

    const bookmarkIds = bookmarkIdsParam ? bookmarkIdsParam.split(',') : undefined;

    const estimate = estimateBatchEnrichmentCost(bookmarkIds);

    return NextResponse.json({
      data: estimate,
      metadata: {
        cost_per_bookmark: estimate.bookmarks_count > 0
          ? estimate.estimated_cost / estimate.bookmarks_count
          : 0,
      },
    });
  } catch (error) {
    console.error('❌ Cost estimation error:', error);

    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Cost estimation failed',
      code: 'ESTIMATION_ERROR',
    }, { status: 500 });
  }
}
