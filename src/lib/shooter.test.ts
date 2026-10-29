import { describe, it, expect } from 'vitest';
import { shooterReducer, shooterSeconds, targetPositions } from './shooter';
import type { ShooterState } from './shooter';
import { recordResult, freshProgress, validateProgress, badges, resultBestKey } from './storage';
import { scoreAnswer } from './engine';
import type { Result } from '../types';

const initial: ShooterState = { phase: 'ready', remaining: 30000, shot: null };
const shot = { answer: 'apple', x: 25, y: 35 };
describe('bubble shooter round lifecycle', () => {
  it('lets learners choose an untimed round, but locks pace after starting', () => {
    const relaxed = shooterReducer(initial, { type: 'pace', untimed: true });
    const playing = shooterReducer(relaxed, { type: 'start' });
    expect(shooterReducer(playing, { type: 'tick', milliseconds: 600000 })).toBe(playing);
    expect(shooterReducer(playing, { type: 'pace', untimed: false })).toBe(playing);
    expect(shooterReducer(playing, { type: 'fire', shot }).phase).toBe('firing');
  });
  it('can switch back to a timed challenge before starting', () => {
    const relaxed = shooterReducer(initial, { type: 'pace', untimed: true });
    const challenge = shooterReducer(relaxed, { type: 'pace', untimed: false });
    expect(shooterReducer(shooterReducer(challenge, { type: 'start' }), { type: 'tick', milliseconds: 30000 }).phase).toBe('finished');
  });
  it('repairs a mistake only with the correct word, without replacing the first answer', () => {
    const wrong: ShooterState = { ...initial, phase: 'finished', shot: { ...shot, answer: 'cat' } };
    const action = { type: 'repair', answer: 'apple', correctAnswer: 'apple' } as const;
    expect(shooterReducer(wrong, { ...action, answer: 'dog' })).toBe(wrong);
    const repaired = shooterReducer(wrong, action);
    expect(repaired.repaired).toBe(true);
    expect(repaired.shot?.answer).toBe('cat');
    expect(repaired.phase).toBe('finished');
    expect(shooterReducer(repaired, action)).toBe(repaired);
    expect(shooterReducer(initial, action)).toBe(initial);
    expect(shooterReducer({ ...wrong, shot }, action).repaired).toBeUndefined();
  });
  it('allows repair after timeout and keeps the timeout answer empty', () => {
    const expired: ShooterState = { ...initial, phase: 'finished', remaining: 0 };
    const repaired = shooterReducer(expired, { type: 'repair', answer: 'apple', correctAnswer: 'apple' });
    expect(repaired.repaired).toBe(true);
    expect(repaired.shot).toBeNull();
    expect(repaired.remaining).toBe(0);
  });
  it('separates relaxed best scores and keeps legacy timed scores and history', () => {
    const legacy: Result = { id: 'legacy', grade: 1, game: 'shooter', difficulty: 'easy', score: 500, stars: 3, seconds: 25, date: '2026-10-23', answers: [] };
    const relaxed: Result = { ...legacy, id: 'relaxed', score: 700, shooterPace: 'relaxed' };
    const p = validateProgress(JSON.parse(JSON.stringify(recordResult(recordResult(freshProgress(), legacy), relaxed))));
    expect(p.best[resultBestKey(legacy)]).toBe(500);
    expect(p.best[resultBestKey(relaxed)]).toBe(700);
    expect(p.history.map(r => r.shooterPace)).toEqual([undefined, 'relaxed']);
    expect(resultBestKey({ ...legacy, shooterPace: 'challenge' })).toBe(resultBestKey(legacy));
    expect(resultBestKey({ ...relaxed, game: 'picture' })).toBe('1-picture-easy');
    expect(validateProgress({ ...p, history: [{ ...relaxed, shooterPace: 'invalid' }] }).history).toEqual([]);
  });
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
  it('settles time between display updates before accepting a shot at the deadline', () => {
    const lastDisplay: ShooterState = { ...initial, phase: 'playing', remaining: 180 };
    const expired = shooterReducer(lastDisplay, { type: 'tick', milliseconds: 200 });
    expect(shooterReducer(expired, { type: 'fire', shot }).shot).toBeNull();
    const justInTime = shooterReducer(lastDisplay, { type: 'tick', milliseconds: 179 });
    expect(shooterReducer(justInTime, { type: 'fire', shot }).shot).toEqual(shot);
  });
  it('settles a partial display interval before pause without charging paused time', () => {
    const lastDisplay: ShooterState = { ...initial, phase: 'playing', remaining: 500 };
    const settled = shooterReducer(lastDisplay, { type: 'tick', milliseconds: 190 });
    const paused = shooterReducer(settled, { type: 'pause' });
    expect(shooterReducer(paused, { type: 'tick', milliseconds: 30000 }).remaining).toBe(310);
    const resumed = shooterReducer(paused, { type: 'resume' });
    expect(shooterReducer(resumed, { type: 'tick', milliseconds: 309 }).phase).toBe('playing');
    expect(shooterReducer(resumed, { type: 'tick', milliseconds: 310 }).phase).toBe('finished');
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
