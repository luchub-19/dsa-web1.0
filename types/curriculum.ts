'use strict';

export interface Chunk {
  id: string;
  concept: string;
  theory_html: string;
  code_snippet: string | null;
  active_recall_q: string;
  feynman_prompt: string | null;
}

export type LessonPhase = 'theory' | 'active-recall' | 'feynman';

export interface BlankSegment {
  type: 'blank';
  value: string;   // correct answer
  id: number;
}

export interface TextSegment {
  type: 'text';
  value: string;
  id: number;
}

export type CodeSegment = TextSegment | BlankSegment;

export interface BlankState {
  [blankId: number]: {
    userValue: string;
    status: 'idle' | 'correct' | 'wrong';
  };
}
