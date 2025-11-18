/**
 * Connection Detection Service
 * Identifies relationships between bookmarks
 */

import type { Bookmark, BookmarkMetadata } from '@bookmark-gen/shared';

/**
 * Connection type
 */
export type ConnectionType = 'same_author' | 'shared_topic' | 'semantic_similarity' | 'temporal_proximity';

/**
 * Detected connection
 */
export interface Connection {
  bookmark_id_1: string;
  bookmark_id_2: string;
  connection_type: ConnectionType;
  strength_score: number; // 0-1
}

/**
 * Enriched bookmark data for connection detection
 */
export interface EnrichedBookmarkData {
  bookmark: Bookmark;
  metadata?: Pick<BookmarkMetadata, 'primary_topic' | 'key_themes' | 'category'>;
}

/**
 * Detect connections between bookmarks
 */
export function detectConnections(
  enrichedBookmarks: EnrichedBookmarkData[],
  maxConnectionsPerBookmark: number = 5
): Connection[] {
  const connections: Connection[] = [];

  for (let i = 0; i < enrichedBookmarks.length; i++) {
    const bookmark1 = enrichedBookmarks[i];
    const candidateConnections: Connection[] = [];

    for (let j = i + 1; j < enrichedBookmarks.length; j++) {
      const bookmark2 = enrichedBookmarks[j];

      // Detect different types of connections
      const sameAuthorScore = detectSameAuthor(bookmark1.bookmark, bookmark2.bookmark);
      const sharedTopicScore = detectSharedTopic(bookmark1, bookmark2);
      const semanticScore = detectSemanticSimilarity(bookmark1, bookmark2);
      const temporalScore = detectTemporalProximity(bookmark1.bookmark, bookmark2.bookmark);

      // Create connections for each type that meets threshold
      if (sameAuthorScore > 0) {
        candidateConnections.push({
          bookmark_id_1: bookmark1.bookmark.id,
          bookmark_id_2: bookmark2.bookmark.id,
          connection_type: 'same_author',
          strength_score: sameAuthorScore,
        });
      }

      if (sharedTopicScore > 0.3) {
        candidateConnections.push({
          bookmark_id_1: bookmark1.bookmark.id,
          bookmark_id_2: bookmark2.bookmark.id,
          connection_type: 'shared_topic',
          strength_score: sharedTopicScore,
        });
      }

      if (semanticScore > 0.4) {
        candidateConnections.push({
          bookmark_id_1: bookmark1.bookmark.id,
          bookmark_id_2: bookmark2.bookmark.id,
          connection_type: 'semantic_similarity',
          strength_score: semanticScore,
        });
      }

      if (temporalScore > 0.5) {
        candidateConnections.push({
          bookmark_id_1: bookmark1.bookmark.id,
          bookmark_id_2: bookmark2.bookmark.id,
          connection_type: 'temporal_proximity',
          strength_score: temporalScore,
        });
      }
    }

    // Sort by strength and take top N connections
    candidateConnections.sort((a, b) => b.strength_score - a.strength_score);
    connections.push(...candidateConnections.slice(0, maxConnectionsPerBookmark));
  }

  return connections;
}

/**
 * Detect same author connection
 */
function detectSameAuthor(bookmark1: Bookmark, bookmark2: Bookmark): number {
  if (bookmark1.author.toLowerCase() === bookmark2.author.toLowerCase()) {
    // Higher score if also same topic/source
    let score = 0.8;

    if (bookmark1.source === bookmark2.source) {
      score += 0.1;
    }

    return Math.min(1.0, score);
  }

  return 0;
}

/**
 * Detect shared topic connection
 */
function detectSharedTopic(bookmark1: EnrichedBookmarkData, bookmark2: EnrichedBookmarkData): number {
  const meta1 = bookmark1.metadata;
  const meta2 = bookmark2.metadata;

  if (!meta1 || !meta2) return 0;

  let score = 0;

  // Exact topic match
  if (meta1.primary_topic && meta2.primary_topic &&
      meta1.primary_topic.toLowerCase() === meta2.primary_topic.toLowerCase()) {
    score += 0.6;
  }

  // Shared themes
  if (meta1.key_themes && meta2.key_themes) {
    const themes1 = meta1.key_themes.map(t => t.toLowerCase());
    const themes2 = meta2.key_themes.map(t => t.toLowerCase());
    const sharedThemes = themes1.filter(t => themes2.includes(t));

    if (sharedThemes.length > 0) {
      score += Math.min(0.4, sharedThemes.length * 0.15);
    }
  }

  // Same category bonus
  if (meta1.category && meta2.category && meta1.category === meta2.category) {
    score += 0.1;
  }

  return Math.min(1.0, score);
}

/**
 * Detect semantic similarity (basic text overlap)
 */
function detectSemanticSimilarity(bookmark1: EnrichedBookmarkData, bookmark2: EnrichedBookmarkData): number {
  const content1 = bookmark1.bookmark.content.toLowerCase();
  const content2 = bookmark2.bookmark.content.toLowerCase();

  // Extract words (simple tokenization)
  const words1 = new Set(content1.split(/\s+/).filter(w => w.length > 3));
  const words2 = new Set(content2.split(/\s+/).filter(w => w.length > 3));

  if (words1.size === 0 || words2.size === 0) return 0;

  // Calculate Jaccard similarity
  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);

  const jaccardScore = intersection.size / union.size;

  // Boost if themes also overlap
  let boost = 0;
  if (bookmark1.metadata?.key_themes && bookmark2.metadata?.key_themes) {
    const themes1 = new Set(bookmark1.metadata.key_themes.map(t => t.toLowerCase()));
    const themes2 = new Set(bookmark2.metadata.key_themes.map(t => t.toLowerCase()));
    const sharedThemes = [...themes1].filter(t => themes2.has(t));
    if (sharedThemes.length > 0) {
      boost = 0.2;
    }
  }

  return Math.min(1.0, jaccardScore + boost);
}

/**
 * Detect temporal proximity (bookmarked around the same time)
 */
function detectTemporalProximity(bookmark1: Bookmark, bookmark2: Bookmark): number {
  const time1 = new Date(bookmark1.bookmarked_at).getTime();
  const time2 = new Date(bookmark2.bookmarked_at).getTime();

  const timeDiffMs = Math.abs(time1 - time2);

  // Score based on time difference
  // Within 1 hour: 0.9
  // Within 1 day: 0.7
  // Within 1 week: 0.5
  // Beyond 1 week: decreasing

  const oneHour = 60 * 60 * 1000;
  const oneDay = 24 * oneHour;
  const oneWeek = 7 * oneDay;

  if (timeDiffMs < oneHour) {
    return 0.9;
  } else if (timeDiffMs < oneDay) {
    return 0.7;
  } else if (timeDiffMs < oneWeek) {
    return 0.5;
  } else if (timeDiffMs < oneWeek * 4) {
    // Decay over 4 weeks
    return Math.max(0, 0.5 - ((timeDiffMs - oneWeek) / (oneWeek * 3)) * 0.5);
  }

  return 0;
}

/**
 * Get connection summary statistics
 */
export function getConnectionSummary(connections: Connection[]): {
  total_connections: number;
  avg_connections_per_bookmark: number;
  by_type: Record<ConnectionType, number>;
  avg_strength_by_type: Record<ConnectionType, number>;
} {
  const byType: Record<ConnectionType, number> = {
    same_author: 0,
    shared_topic: 0,
    semantic_similarity: 0,
    temporal_proximity: 0,
  };

  const strengthByType: Record<ConnectionType, number[]> = {
    same_author: [],
    shared_topic: [],
    semantic_similarity: [],
    temporal_proximity: [],
  };

  for (const connection of connections) {
    byType[connection.connection_type]++;
    strengthByType[connection.connection_type].push(connection.strength_score);
  }

  const avgStrengthByType: Record<ConnectionType, number> = {
    same_author: 0,
    shared_topic: 0,
    semantic_similarity: 0,
    temporal_proximity: 0,
  };

  for (const type in strengthByType) {
    const strengths = strengthByType[type as ConnectionType];
    if (strengths.length > 0) {
      avgStrengthByType[type as ConnectionType] =
        strengths.reduce((sum, s) => sum + s, 0) / strengths.length;
    }
  }

  // Count unique bookmarks
  const uniqueBookmarks = new Set<string>();
  for (const connection of connections) {
    uniqueBookmarks.add(connection.bookmark_id_1);
    uniqueBookmarks.add(connection.bookmark_id_2);
  }

  return {
    total_connections: connections.length,
    avg_connections_per_bookmark: uniqueBookmarks.size > 0 ? connections.length / uniqueBookmarks.size : 0,
    by_type: byType,
    avg_strength_by_type: avgStrengthByType,
  };
}

/**
 * Filter connections by minimum strength
 */
export function filterByStrength(connections: Connection[], minStrength: number): Connection[] {
  return connections.filter(c => c.strength_score >= minStrength);
}

/**
 * Get connections for a specific bookmark
 */
export function getBookmarkConnections(
  bookmarkId: string,
  allConnections: Connection[]
): Array<{ connected_bookmark_id: string; connection_type: ConnectionType; strength_score: number }> {
  return allConnections
    .filter(c => c.bookmark_id_1 === bookmarkId || c.bookmark_id_2 === bookmarkId)
    .map(c => ({
      connected_bookmark_id: c.bookmark_id_1 === bookmarkId ? c.bookmark_id_2 : c.bookmark_id_1,
      connection_type: c.connection_type,
      strength_score: c.strength_score,
    }));
}
