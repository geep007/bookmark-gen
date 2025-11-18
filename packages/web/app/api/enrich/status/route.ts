/**
 * GET /api/enrich/status - Get enrichment status
 */

import { NextResponse } from 'next/server';
import { getEnrichmentLogRepository, getBookmarkRepository } from '@bookmark-gen/database';

export async function GET() {
  try {
    const enrichmentLogRepo = getEnrichmentLogRepository();
    const bookmarkRepo = getBookmarkRepository();

    // Get recent enrichment logs
    const recentLogs = enrichmentLogRepo.getRecent(1);
    const lastEnrichment = recentLogs[0] || null;

    // Get unenriched bookmark count
    const unenrichedBookmarks = bookmarkRepo.findUnenriched();
    const unenrichedCount = unenrichedBookmarks.length;

    // Get total bookmarks
    const allBookmarks = bookmarkRepo.findAll();
    const totalBookmarks = allBookmarks.length;
    const enrichedCount = totalBookmarks - unenrichedCount;

    return NextResponse.json({
      data: {
        total_bookmarks: totalBookmarks,
        enriched_count: enrichedCount,
        unenriched_count: unenrichedCount,
        enrichment_percentage: totalBookmarks > 0 ? (enrichedCount / totalBookmarks) * 100 : 0,
        last_enrichment: lastEnrichment ? {
          timestamp: lastEnrichment.timestamp,
          bookmarks_processed: lastEnrichment.bookmarks_processed,
          cost: lastEnrichment.cost,
          tokens_used: lastEnrichment.tokens_used,
          model_used: lastEnrichment.model_used,
          enrichment_type: lastEnrichment.enrichment_type,
        } : null,
        status: unenrichedCount > 0 ? 'pending' : 'completed',
      },
      metadata: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('❌ Enrichment status error:', error);

    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Status retrieval failed',
      code: 'STATUS_ERROR',
      details: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}
