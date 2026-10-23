import type { Difficulty } from '../types';

export const shooterSeconds: Record<Difficulty, number> = { easy: 30, normal: 24, hard: 18 };
export type Shot = { answer: string; x: number; y: number };
export interface ShooterState {
  phase: 'ready' | 'playing' | 'paused' | 'firing' | 'finished';
  remaining: number;
  shot: Shot | null;
}
export type ShooterAction =
  | { type: 'start' | 'pause' | 'resume' | 'finish' }
  | { type: 'tick'; milliseconds: number }
  | { type: 'fire'; shot: Shot };

export function shooterReducer(state: ShooterState, action: ShooterAction): ShooterState {
  if (action.type === 'start' && state.phase === 'ready') return { ...state, phase: 'playing' };
  if (action.type === 'pause' && state.phase === 'playing') return { ...state, phase: 'paused' };
  if (action.type === 'resume' && state.phase === 'paused') return { ...state, phase: 'playing' };
  if (action.type === 'fire' && state.phase === 'playing') return { ...state, phase: 'firing', shot: action.shot };
  if (action.type === 'finish' && state.phase === 'firing') return { ...state, phase: 'finished' };
  if (action.type === 'tick' && state.phase === 'playing' && Number.isFinite(action.milliseconds) && action.milliseconds > 0) {
    const remaining = Math.max(0, state.remaining - action.milliseconds);
    return { ...state, remaining, phase: remaining ? 'playing' : 'finished' };
  }
  return state;
}

export function targetPositions(count: number): { x: number; y: number }[] {
  if (count === 1) return [{ x: 50, y: 35 }];
  if (count === 2) return [{ x: 25, y: 35 }, { x: 75, y: 35 }];
  if (count === 3) return [{ x: 25, y: 26 }, { x: 75, y: 26 }, { x: 50, y: 56 }];
  return [{ x: 25, y: 26 }, { x: 75, y: 26 }, { x: 25, y: 56 }, { x: 75, y: 56 }];
}
