export type Difficulty = 'easy' | 'normal' | 'hard';
export type GameId = 'picture' | 'memory' | 'listening' | 'spelling' | 'speed' | 'sentence' | 'reading' | 'adventure';
export interface Question { id: string; grade: number; difficulty: Difficulty; topic: string; questionType: 'vocabulary' | 'sentence' | 'reading' | 'alphabet'; question: string; choices: string[]; correctAnswer: string; explanation: string; image: string; audioText: string; translation: string; passageId?: string; passage?: string; glossary?: { word: string; meaning: string }[] }
export interface Settings { grade: number; difficulty: Difficulty; topic: string; sound: boolean; motion: boolean; rate: number }
export interface Round { question: Question; mode: GameId }
export interface Answer { questionId: string; given: string; correct: boolean; mode: GameId }
export interface Result { id: string; grade: number; game: GameId; difficulty: Difficulty; answers: Answer[]; score: number; seconds: number; stars: number; date: string; level?: number; daily?: boolean }
export interface Progress { version: 1; settings: Settings; history: Result[]; mistakes: string[]; levels: Record<string, number[]>; coins: number; daily: string[]; totalPlayed: number; totalStars: number; best: Record<string, number> }
