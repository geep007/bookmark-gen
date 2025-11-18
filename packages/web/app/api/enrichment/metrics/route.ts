/**
 * GET /api/enrichment/metrics - Get enrichment cost and quality metrics
 */

import { NextResponse } from 'next/server';
import {
  getEnrichmentLogRepository,
  getMetadataRepository,
  getConnectionRepository,
} from '@bookmark-gen/database';

export async function GET() {
  try {
    const enrichmentLogRepo = getEnrichmentLogRepository();
    const metadataRepo = getMetadataRepository();
    const connectionRepo = getConnectionRepository();

    // Get total enrichment stats
    const totalCost = enrichmentLogRepo.getTotalCost();
    const totalTokens = enrichmentLogRepo.getTotalTokens();
    const totalEnriched = enrichmentLogRepo.getTotalEnriched();

    // Get cost breakdown by type
    const costByType = enrichmentLogRepo.getCostByType();

    // Get category distribution
    const categoryDistribution = metadataRepo.getCategoryDistribution();

    // Get connection count
    const totalConnections = connectionRepo.count();

    // Get recent logs
    const recentLogs = enrichmentLogRepo.getRecent(10);

    // Calculate quality metrics (simplified - we don't have quality scores yet)
    const lowConfidenceCount = 0; // TODO: Add query for low confidence bookmarks

    const avgQualityScore = 0; // TODO: Implement quality scoring

    return NextResponse.json({
      data: {
        total_bookmarks_enriched: totalEnriched,
        average_quality_score: avgQualityScore,
        total_cost: totalCost,
        cost_per_bookmark: totalEnriched > 0 ? totalCost / totalEnriched : 0,
        total_tokens: totalTokens,
        category_distribution: categoryDistribution,
        low_confidence_count: lowConfidenceCount,
        total_connections: totalConnections,
        breakdown_by_type: costByType.map(item => ({
          type: item.enrichment_type,
          cost: item.total_cost,
          tokens_used: item.total_tokens,
        })),
        recent_logs: recentLogs.map(log => ({
          timestamp: log.timestamp,
          bookmarks_processed: log.bookmarks_processed,
          cost: log.cost,
          tokens_used: log.tokens_used,
          model_used: log.model_used,
          enrichment_type: log.enrichment_type,
        })),
      },
      metadata: {
        timestamp: new Date().toISOString(),
        meets_cost_target: totalEnriched > 0 ? (totalCost / totalEnriched) < 0.02 : true,
        cost_target: 0.02,
      },
    });
  } catch (error) {
    console.error('❌ Metrics retrieval error:', error);

    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Metrics retrieval failed',
      code: 'METRICS_ERROR',
      details: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}
