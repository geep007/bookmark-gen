/**
 * Health check API endpoint
 * Epic 1, Story 1.6: Sync Status API & Basic Health Check
 */

import { NextResponse } from 'next/server';
import { checkHealth } from '@database/client';

export async function GET() {
  try {
    const dbHealth = checkHealth();

    if (dbHealth.status === 'ok') {
      return NextResponse.json({
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      {
        status: 'error',
        database: 'error',
        message: dbHealth.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        database: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
