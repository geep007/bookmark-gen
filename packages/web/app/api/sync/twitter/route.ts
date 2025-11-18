/**
 * Twitter bookmark sync API endpoint
 * Epic 1, Story 1.3: MCP Integration - Twitter Bookmark Sync
 */

import { NextResponse } from 'next/server';
import { BookmarkSyncService } from '@bookmark-gen/services';

export async function POST() {
  try {
    const syncService = new BookmarkSyncService();

    console.log('Starting Twitter bookmark sync...');

    // Perform sync with progress logging
    const summary = await syncService.syncTwitter((progress) => {
      console.log(`Twitter sync: ${progress.message}`);
    });

    console.log('Twitter sync completed:', summary);

    // Return sync summary
    return NextResponse.json(
      {
        data: summary,
        metadata: {
          timestamp: new Date().toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Twitter sync error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Twitter sync failed',
        code: 'TWITTER_SYNC_ERROR',
      },
      { status: 500 }
    );
  }
}
