/**
 * Sync status API endpoint
 * Epic 1, Story 1.6: Sync Status API & Basic Health Check
 */

import { NextResponse } from 'next/server';
import { BookmarkSyncService } from '@bookmark-gen/services';

export async function GET() {
  try {
    const syncService = new BookmarkSyncService();

    // Get sync status for each source
    const twitterStatus = syncService.getSyncStatus('twitter');
    const linkedinStatus = syncService.getSyncStatus('linkedin');
    const eagleStatus = syncService.getSyncStatus('eagle');

    return NextResponse.json({
      data: {
        twitter: twitterStatus,
        linkedin: linkedinStatus,
        eagle: eagleStatus,
      },
      metadata: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to get sync status',
        code: 'SYNC_STATUS_ERROR',
      },
      { status: 500 }
    );
  }
}
