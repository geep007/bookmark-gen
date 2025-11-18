/**
 * Sync status API endpoint
 * Epic 1, Story 1.6: Sync Status API & Basic Health Check
 */

import { NextResponse } from 'next/server';
import { BookmarkRepository } from '@database/repositories/bookmarks';

export async function GET() {
  try {
    const bookmarkRepo = new BookmarkRepository();
    const counts = bookmarkRepo.countBySource();

    // TODO: Add sync history retrieval when sync_history table is used
    return NextResponse.json({
      twitter: {
        total_bookmarks: counts.twitter,
        last_sync_time: null, // To be implemented with sync history
        last_sync_summary: null,
      },
      linkedin: {
        total_bookmarks: counts.linkedin,
        last_sync_time: null,
        last_sync_summary: null,
      },
      eagle: {
        total_bookmarks: counts.eagle,
        last_sync_time: null,
        last_sync_summary: null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to get sync status',
      },
      { status: 500 }
    );
  }
}
