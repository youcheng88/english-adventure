import { useEffect, useState } from 'react';
import { ArrowRight, ChevronDown, Sparkles, Trophy } from 'lucide-react';
import type { GameId, Progress, Settings } from '../types';
import { games, difficultyNames, localDay } from '../lib/catalog';
import { badges } from '../lib/storage';
import { Mascot } from './Artwork';
import { GameIcon } from './GameIcon';
import './home.css';

export function GradePicker({ settings, onChange }: { settings: Settings; onChange: (s: Partial<Settings>) => void }) {
  return <div className="grade-picker" role="group" aria-label="選擇教材年級">{['一', '二', '三', '四', '五', '六'].map((g, i) => <button key={g} className={settings.grade === i + 1 ? 'grade selected' : 'grade'} aria-pressed={settings.grade === i + 1} onClick={() => onChange({ grade: i + 1, topic: 'all' })}><span>{i + 1}</span>{g}年級{settings.grade === i + 1 && <i>✓</i>}</button>)}</div>;
}
function TopicPicker({ settings, onChange }: { settings: Settings; onChange: (s: Partial<Settings>) => void }) {
  const [topics, setTopics] = useState<string[]>([]);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    import('../lib/engine').then(({ bank }) => {
      if (active) { setTopics([...new Set(bank.filter(q => q.grade === settings.grade).map(q => q.topic))]); setFailed(false); }
    }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [settings.grade, attempt]);
  return <div className="topic-control"><label className="topic-label">主題 <select aria-label="學習主題" value={settings.topic} onChange={e => onChange({ topic: e.target.value })}><option value="all">全部主題</option>{!topics.includes(settings.topic) && settings.topic !== 'all' && <option>{settings.topic}</option>}{topics.map(t => <option key={t}>{t}</option>)}</select></label>{failed && <p role="status">主題暫時載入失敗。<button className="text-button" onClick={() => setAttempt(n => n + 1)}>重新載入主題</button></p>}</div>;
}
const shortDescriptions: Record<GameId, string> = {
  shooter: '瞄準泡泡，射中英文！', picture: '看圖片，選單字', memory: '翻卡片，找朋友',
  listening: '聽英文，選答案', spelling: '排字母，拼單字', speed: '動動腦，快快答',
  sentence: '排單字，組句子', reading: '讀故事，找線索', adventure: '過關卡，收星星',
};
export function Home({ progress, onChange, onStart, onNavigate, onPrepare }: {
  progress: Progress; onChange: (s: Partial<Settings>) => void; onStart: (id: GameId, daily?: boolean) => void;
  onNavigate: (page: string) => void; onPrepare: (game: GameId) => void;
}) {
  const s = progress.settings;
  const [filtersOpen, setFiltersOpen] = useState(false);
  const earned = badges(progress).filter(b => b.earned).length;
  const completed = progress.daily.includes(localDay());
  return <div className="simple-home">
    <section className="home-welcome"><div><h1>今天，玩什麼？</h1><p>選好年級，點一個遊戲就出發！</p></div><Mascot className="welcome-mascot"/></section>
    <section className="home-setup panel" aria-labelledby="choose-grade">
      <h2 id="choose-grade"><span className="step-number">1</span> 選年級 <small>可以自由換年級練習</small></h2>
      <GradePicker settings={s} onChange={onChange}/>
      <details className="learning-options" onToggle={e => setFiltersOpen(e.currentTarget.open)}>
        <summary><span>難度與主題</span><span className="current-options">{difficultyNames[s.difficulty]} · {s.topic === 'all' ? '全部主題' : s.topic}</span><ChevronDown size={17}/></summary>
        <div className="filter-row"><div className="difficulty" role="group" aria-label="選擇難度">{(['easy', 'normal', 'hard'] as const).map(d => <button key={d} aria-pressed={s.difficulty === d} className={s.difficulty === d ? 'active' : ''} onClick={() => onChange({ difficulty: d })}>{d === 'easy' ? '🌱' : d === 'normal' ? '🌿' : '🌳'} {difficultyNames[d]}</button>)}</div>{filtersOpen && <TopicPicker key={s.grade} settings={s} onChange={onChange}/>}</div>
      </details>
    </section>
    <section id="games" className="simple-games" aria-labelledby="choose-game"><div className="simple-section-title"><h2 id="choose-game"><span className="step-number">2</span> 選遊戲</h2><span>{s.grade} 年級 · {difficultyNames[s.difficulty]}</span></div>
      <div className="simple-game-grid">{games.map(g => <button key={g.id} className={'simple-game '+g.color} onPointerEnter={() => onPrepare(g.id)} onFocus={() => onPrepare(g.id)} onPointerDown={() => onPrepare(g.id)} onClick={() => onStart(g.id)} aria-label={'開始'+g.name}><span className="simple-game-icon"><GameIcon game={g.id} size={28}/></span><span className="simple-game-copy"><strong>{g.name}</strong><span>{shortDescriptions[g.id]}</span></span><ArrowRight className="simple-game-arrow" size={18}/></button>)}</div>
    </section>
    <section className="home-extras" aria-label="今日挑戰與學習進度">
      <div className="daily-simple"><Sparkles size={21}/><div><h2>今日挑戰</h2><p>{completed ? '獎勵已領取，還想再練習嗎？' : '答對 80%，多拿 20 金幣'}</p></div><button className="secondary" onPointerEnter={() => onPrepare('shooter')} onClick={() => onStart('adventure', true)}>{completed ? '再練習' : '挑戰'} <ArrowRight size={16}/></button></div>
      <button className="progress-simple" onClick={() => onNavigate('progress')}><Trophy size={21}/><span><strong>我的學習記錄</strong><span>{progress.totalPlayed} 場完成 · {earned} 枚徽章</span></span><ArrowRight size={18}/></button>
    </section>
  </div>;
}

