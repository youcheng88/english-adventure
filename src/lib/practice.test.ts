import { describe, expect, it } from 'vitest';
import { bank, reviewRounds } from './engine';
import { longestStreak, shooterPreferences } from './shooter';
import { freshProgress, validateProgress, recordResult } from './storage';
import type { Answer, Result, Settings } from '../types';

describe('returning learners and review sessions', () => {
  it('loads old settings without removing previous progress', () => {
    const legacy = { ...freshProgress(), settings: { grade: 3, difficulty: 'easy', rate: .85 }, totalStars: 27 };
    const restored = validateProgress(legacy);
    expect(restored.totalStars).toBe(27);
    expect(shooterPreferences(restored.settings)).toEqual({ shooterPace: 'challenge', shooterAutoNext: true, shooterListening: false });
  });
  it('persists deliberate false preferences as well as listening and relaxed pace', () => {
    const progress = freshProgress();
    progress.settings = { ...progress.settings, shooterPace: 'relaxed', shooterAutoNext: false, shooterListening: true };
    const restored = validateProgress(JSON.parse(JSON.stringify(progress)));
    expect(shooterPreferences(restored.settings)).toEqual({ shooterPace: 'relaxed', shooterAutoNext: false, shooterListening: true });
  });
  it('normalizes malformed preferences instead of enabling arbitrary values', () => {
    expect(shooterPreferences({ shooterPace: 'invalid', shooterAutoNext: 'false', shooterListening: 'true' } as unknown as Settings)).toEqual(shooterPreferences({}));
  });
  it('keeps shooter vocabulary in shooter reviews and skips duplicate or stale IDs', () => {
    const q = bank.find(q => q.questionType === 'vocabulary')!;
    expect(reviewRounds([q.id, 'missing', q.id], 'shooter')).toEqual([{ question: q, mode: 'shooter' }]);
    expect(reviewRounds([], 'shooter')).toEqual([]);
    expect(reviewRounds([q.id], 'picture')[0].mode).toBe('picture');
  });
  it('preserves the right activity for non-vocabulary review content', () => {
    const types = ['sentence', 'reading', 'alphabet'] as const;
    const qs = types.map(t => bank.find(q => q.questionType === t)!);
    expect(reviewRounds(qs.map(q => q.id), 'shooter').map(r => r.mode)).toEqual(['sentence', 'reading', 'speed']);
  });
  it('calculates the longest actual streak across mistakes, not the last streak', () => {
    const answers = [true, true, true, false, true, true].map(correct => ({ correct }) as Answer);
    expect(longestStreak(answers)).toBe(3);
    expect(longestStreak([])).toBe(0);
    expect(longestStreak([{ correct: false } as Answer])).toBe(0);
  });
  it('clears a mistake only after a completed successful review, preserving the original result', () => {
    const q = bank.find(q => q.questionType === 'vocabulary')!;
    const first: Result = { id: 'first', grade: q.grade, game: 'shooter', difficulty: 'easy', shooterPace: 'relaxed', answers: [{ questionId: q.id, mode: 'shooter', correct: false, given: 'wrong' }], score: 0, stars: 0, seconds: 2, date: '2026-10-24' };
    const p = recordResult(freshProgress(), first);
    const review = { ...first, id: 'review', answers: [{ ...first.answers[0], correct: true, given: q.correctAnswer }], score: 100, stars: 3 };
    const updated = recordResult(p, review);
    expect(updated.mistakes).not.toContain(q.id);
    expect(updated.history[0]).toEqual(first);
    expect(updated.history).toHaveLength(2);
  });
});
