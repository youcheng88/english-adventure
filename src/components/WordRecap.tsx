import { BookOpen, Flame, Volume2 } from 'lucide-react';
import type { Result } from '../types';
import { bank } from '../lib/engine';
import { longestStreak } from '../lib/shooter';
import { useSpeech } from '../lib/audio';
import './word-recap.css';

export function WordRecap({ result, rate, onReview }: { result: Result; rate: number; onReview: (ids: string[]) => void }) {
  const { speak, available } = useSpeech(rate);
  const words = [...new Set(result.answers.map(a => a.questionId))].flatMap(id => {
    const question = bank.find(q => q.id === id && q.questionType === 'vocabulary');
    return question ? [{ question, correct: result.answers.filter(a => a.questionId === id).every(a => a.correct) }] : [];
  });
  if (!words.length) return null;
  return <section className="panel word-recap" aria-label="本場單字收藏">
    <div className="recap-heading"><div><span className="eyebrow">WORDS IN YOUR BACKPACK</span><h2><BookOpen size={21}/> 本場單字收藏</h2></div><span className="recap-combo"><Flame size={17}/> 最長連擊 <b>{longestStreak(result.answers)}</b></span></div>
    <p>收好這 {words.length} 個單字，下一次再遇見它們！{available ? '點喇叭再聽一次。' : '此裝置沒有英文語音，可以看單字與中文複習。'}</p>
    <div className="recap-grid">{words.map(({ question: q, correct }) => <article key={q.id} className={`recap-card ${correct ? 'remembered' : 'revisit'}`}>
      <span className="recap-status">{correct ? '✓ 第一次答對' : '↻ 再練習一下'}</span>
      <strong lang="en">{q.correctAnswer}</strong><span>{q.translation}</span>
      <button className="recap-audio" disabled={!available} aria-label={`朗讀 ${q.correctAnswer}`} onClick={() => speak(q.audioText)}><Volume2 size={19}/></button>
    </article>)}</div>
    <button className="secondary" onClick={() => onReview(words.map(w => w.question.id))}>再練本場單字</button>
    <small>再練習會開啟新的射擊場次，這次的成果已保存。</small>
  </section>;
}
