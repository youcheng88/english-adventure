import { describe, it, expect } from 'vitest';
import { shooterReducer, shooterSeconds, targetPositions } from './shooter';
import type { ShooterState } from './shooter';
import { recordResult, freshProgress, validateProgress, badges } from './storage';
import { scoreAnswer } from './engine';
import type { Result } from '../types';

const initial: ShooterState = { phase: 'ready', remaining: 30000, shot: null };
const shot = { answer: 'apple', x: 25, y: 35 };
describe('bubble shooter round lifecycle', () => {
  it('does not accept a shot or spend time before starting', () => {
    expect(shooterReducer(initial, { type: 'fire', shot })).toBe(initial);
    expect(shooterReducer(initial, { type: 'tick', milliseconds: 5000 })).toBe(initial);
  });
  it('pauses countdown and shooting, then resumes the remaining time', () => {
    const playing = shooterReducer(initial, { type: 'start' });
    const elapsed = shooterReducer(playing, { type: 'tick', milliseconds: 12000 });
    const paused = shooterReducer(elapsed, { type: 'pause' });
    expect(paused.remaining).toBe(18000);
    expect(shooterReducer(paused, { type: 'tick', milliseconds: 90000 })).toBe(paused);
    expect(shooterReducer(paused, { type: 'fire', shot })).toBe(paused);
    expect(shooterReducer(paused, { type: 'resume' }).phase).toBe('playing');
  });
  it('accepts one shot only, freezes time during flight and ends exactly once', () => {
    const playing = shooterReducer(initial, { type: 'start' });
    const firing = shooterReducer(playing, { type: 'fire', shot });
    expect(shooterReducer(firing, { type: 'fire', shot: { ...shot, answer: 'cat' } })).toBe(firing);
    expect(shooterReducer(firing, { type: 'tick', milliseconds: 90000 })).toBe(firing);
    const finished = shooterReducer(firing, { type: 'finish' });
    expect(finished.phase).toBe('finished');
    expect(finished.shot?.answer).toBe('apple');
    expect(shooterReducer(finished, { type: 'finish' })).toBe(finished);
    expect(shooterReducer(finished, { type: 'resume' })).toBe(finished);
  });
  it('times out safely and rejects shots after expiry', () => {
    const expired = shooterReducer({ ...initial, phase: 'playing' }, { type: 'tick', milliseconds: 40000 });
    expect(expired).toEqual({ ...initial, phase: 'finished', remaining: 0 });
    expect(shooterReducer(expired, { type: 'fire', shot })).toBe(expired);
  });
  it('ignores invalid elapsed time', () => {
    const playing: ShooterState = { ...initial, phase: 'playing' };
    for (const milliseconds of [NaN, Infinity, -5000]) expect(shooterReducer(playing, { type: 'tick', milliseconds })).toBe(playing);
  });
  it('makes later difficulty faster and lays out every target within the field', () => {
    expect(shooterSeconds.easy).toBeGreaterThan(shooterSeconds.normal);
    expect(shooterSeconds.normal).toBeGreaterThan(shooterSeconds.hard);
    for (const count of [1, 2, 3, 4]) {
      const slots = targetPositions(count);
      expect(slots).toHaveLength(count);
      expect(new Set(slots.map(p => `${p.x}-${p.y}`)).size).toBe(count);
      expect(slots.every(p => p.x >= 25 && p.x <= 75 && p.y >= 20 && p.y < 65)).toBe(true);
    }
  });
  it('scores combos, preserves shooter history after reload, and records mistakes', () => {
    expect([0, 1, 2, 3, 4].reduce((n, streak) => n + scoreAnswer(true, streak, 'shooter'), 0)).toBe(700);
    expect(scoreAnswer(false, 5, 'shooter')).toBe(0);
    const result: Result = { id: 'shooter-1', game: 'shooter', grade: 1, difficulty: 'easy', date: new Date().toISOString(), score: 100, stars: 1, seconds: 30, answers: [{ questionId: 'g1-v01', given: 'cat', correct: false, mode: 'shooter' }] };
    const p = recordResult(freshProgress(), result);
    const restored = validateProgress(JSON.parse(JSON.stringify(p)));
    expect(restored.history[0].game).toBe('shooter');
    expect(restored.best['1-shooter-easy']).toBe(100);
    expect(restored.mistakes).toContain('g1-v01');
    expect(recordResult(restored, result)).toBe(restored);
  });
  it('keeps the existing eight-game achievement attainable after adding game nine', () => {
    expect(badges(freshProgress()).find(b => b.name === '全能探險家')?.detail).toBe('探索 8 款不同遊戲');
  });
});
