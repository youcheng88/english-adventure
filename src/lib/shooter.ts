import type { Answer, Difficulty, Settings, ShooterPace } from '../types';

export function shooterPreferences(settings: Partial<Settings>) {
  return {
    shooterPace: (settings.shooterPace === 'relaxed' ? 'relaxed' : 'challenge') as ShooterPace,
    shooterAutoNext: typeof settings.shooterAutoNext === 'boolean' ? settings.shooterAutoNext : true,
    shooterListening: settings.shooterListening === true,
  };
}

export function longestStreak(answers: Answer[]): number {
  let current = 0, best = 0;
  for (const answer of answers) { current = answer.correct ? current + 1 : 0; best = Math.max(best, current); }
  return best;
}

export const shooterSeconds: Record<Difficulty, number> = { easy: 30, normal: 24, hard: 18 };
export type Shot = { answer: string; x: number; y: number };
export interface ShooterState {
  phase: 'ready' | 'playing' | 'paused' | 'firing' | 'finished';
  remaining: number;
  shot: Shot | null;
  untimed?: boolean;
  repaired?: boolean;
}
export type ShooterAction =
  | { type: 'start' | 'pause' | 'resume' | 'finish' }
  | { type: 'tick'; milliseconds: number }
  | { type: 'pace'; untimed: boolean }
  | { type: 'repair'; answer: string; correctAnswer: string }
  | { type: 'fire'; shot: Shot };

export function shooterReducer(state: ShooterState, action: ShooterAction): ShooterState {
  if (action.type === 'pace' && state.phase === 'ready') return { ...state, untimed: action.untimed };
  if (action.type === 'repair' && state.phase === 'finished' && !state.repaired && state.shot?.answer !== action.correctAnswer && action.answer === action.correctAnswer) return { ...state, repaired: true };
  if (action.type === 'start' && state.phase === 'ready') return { ...state, phase: 'playing' };
  if (action.type === 'pause' && state.phase === 'playing') return { ...state, phase: 'paused' };
  if (action.type === 'resume' && state.phase === 'paused') return { ...state, phase: 'playing' };
  if (action.type === 'fire' && state.phase === 'playing') return { ...state, phase: 'firing', shot: action.shot };
  if (action.type === 'finish' && state.phase === 'firing') return { ...state, phase: 'finished' };
  if (action.type === 'tick' && state.phase === 'playing' && !state.untimed && Number.isFinite(action.milliseconds) && action.milliseconds > 0) {
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
