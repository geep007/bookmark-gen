/**
 * Validation utilities for shared types
 */

import { CategoryType, BookmarkSource } from '../types/bookmark';

export const isValidCategory = (category: string): category is CategoryType => {
  return ['Inspo', 'Leads/Markets', 'Tutorials'].includes(category);
};

export const isValidSource = (source: string): source is BookmarkSource => {
  return ['twitter', 'linkedin', 'eagle'].includes(source);
};

export const validateConfidenceScore = (score: number): boolean => {
  return score >= 0 && score <= 1;
};

export const validateURL = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};
