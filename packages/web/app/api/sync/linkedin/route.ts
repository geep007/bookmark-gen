/**
 * LinkedIn bookmark sync API endpoint
 * Epic 1, Story 1.4: MCP Integration - LinkedIn Bookmark Sync
 */

import { NextResponse } from 'next/server';
import { BookmarkSyncService } from '@bookmark-gen/services';

export async function POST() {
  try {
    const syncService = new BookmarkSyncService();

    console.log('Starting LinkedIn bookmark sync...');

    // Perform sync with progress logging
    const summary = await syncService.syncLinkedIn((progress) => {
      console.log(`LinkedIn sync: ${progress.message}`);
    });

    console.log('LinkedIn sync completed:', summary);

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
    console.error('LinkedIn sync error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'LinkedIn sync failed',
        code: 'LINKEDIN_SYNC_ERROR',
      },
      { status: 500 }
    );
  }
}
