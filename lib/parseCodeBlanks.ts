'use strict';

import type { CodeSegment, BlankSegment } from '../types/curriculum';

/**
 * Keywords that will be replaced with fill-in-the-blank inputs.
 * Order matters: longer patterns (e.g. "this->") must come before
 * their substrings (e.g. "->").
 */
const BLANK_TARGETS: readonly string[] = [
  'this->',
  '->',
  'nullptr',
  'NULL',
  'new',
  'delete',
  'while',
];

/** Max number of blanks to create per snippet (keeps UX sane). */
const MAX_BLANKS = 6;

/**
 * Builds a RegExp that matches any of the blank target keywords.
 * Word boundaries (\b) are used only for purely alphabetic tokens;
 * operator-like tokens (->  this->) use literal matching.
 */
function buildPattern(): RegExp {
  const parts = BLANK_TARGETS.map((kw) => {
    // Escape regex special chars
    const escaped = kw.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    // Add word boundaries only for alpha tokens to avoid partial matches
    return /^[a-zA-Z_]+$/.test(kw) ? `\\b${escaped}\\b` : escaped;
  });
  return new RegExp(`(${parts.join('|')})`, 'g');
}

const BLANK_PATTERN = buildPattern();

/**
 * Parses `code` into an array of text / blank segments.
 * Blanks are capped at MAX_BLANKS; remaining occurrences become plain text.
 */
export function parseCodeWithBlanks(code: string): CodeSegment[] {
  const segments: CodeSegment[] = [];
  let lastIndex = 0;
  let blankCount = 0;
  let idCounter = 0;

  // Reset stateful regex before use
  BLANK_PATTERN.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = BLANK_PATTERN.exec(code)) !== null) {
    const matchStart = match.index;
    const matchValue = match[0];

    // Text before the match
    if (matchStart > lastIndex) {
      segments.push({
        type: 'text',
        value: code.slice(lastIndex, matchStart),
        id: idCounter++,
      });
    }

    if (blankCount < MAX_BLANKS) {
      segments.push({ type: 'blank', value: matchValue, id: idCounter++ });
      blankCount++;
    } else {
      // Past the cap → treat as plain text
      segments.push({ type: 'text', value: matchValue, id: idCounter++ });
    }

    lastIndex = matchStart + matchValue.length;
  }

  // Remaining text after last match
  if (lastIndex < code.length) {
    segments.push({
      type: 'text',
      value: code.slice(lastIndex),
      id: idCounter++,
    });
  }

  return segments;
}

/** Returns just the blank segments from a parsed array. */
export function getBlanks(segments: CodeSegment[]): BlankSegment[] {
  return segments.filter((s): s is BlankSegment => s.type === 'blank');
}

// Re-export the type so consumers don't need a separate import
export type { BlankSegment } from '../types/curriculum';
