import { useEffect, useReducer, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { ArrowRight, CheckCircle2, Crosshair, Pause, Play, Volume2, Zap } from 'lucide-react';
import type { Question, Settings, ShooterPace } from '../types';
import { choiceOptions, scoreAnswer } from '../lib/engine';
import { chime, launchSound, useSpeech } from '../lib/audio';
import { shooterReducer, shooterSeconds, targetPositions } from '../lib/shooter';
import './shooter.css';

interface ShooterProps {
  question: Question; settings: Settings; autoStart: boolean;
  listenOnly: boolean; onListenChange: (value: boolean) => void;
  pace: ShooterPace; onPaceChange: (value: ShooterPace) => void;
  autoNext: boolean; onAutoNextChange: (value: boolean) => void;
  streak: number; last: boolean;
  onAnswer: (given: string, correct: boolean) => void; onNext: () => void;
}

export function ShooterGame({ question, settings, autoStart, listenOnly, onListenChange, pace, onPaceChange, autoNext, onAutoNextChange, streak, last, onAnswer, onNext }: ShooterProps) {
  const [options] = useState(() => choiceOptions(question, 'shooter', settings.difficulty));
  const [state, dispatch] = useReducer(shooterReducer, {
    phase: autoStart ? (document.hidden ? 'paused' : 'playing') : 'ready',
    remaining: shooterSeconds[settings.difficulty] * 1000, shot: null,
    untimed: pace === 'relaxed',
  });
  const [selected, setSelected] = useState(0);
  const [aim, setAim] = useState({ x: 50, y: 35 });
  const [missed, setMissed] = useState(false);
  const [holdNext, setHoldNext] = useState(false);
  const { speak, available } = useSpeech(settings.rate);
  const board = useRef<HTMLDivElement>(null);
  const targets = useRef<(HTMLButtonElement | null)[]>([]);
  const delivered = useRef(false);
  const spoken = useRef(false);
  const feedback = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onAnswer, onNext });
  callbacks.current = { onAnswer, onNext };
  const positions = targetPositions(options.length);
  const active = state.phase === 'playing';
  const finished = state.phase === 'finished';
  const correct = finished && state.shot?.answer === question.correctAnswer;
  const recovering = finished && !correct && !state.repaired;
  const urgent = active && !state.untimed && state.remaining <= 5000;
  const advance = finished && correct && autoNext && !holdNext && !last;
  const angle = Math.atan2(aim.x - 50, (90 - aim.y) * .8) * 180 / Math.PI;

  useEffect(() => {
    if (!autoStart) return;
    board.current?.focus({ preventScroll: true });
    const mission = board.current?.closest('.shooter');
    if (mission && mission.getBoundingClientRect().top < 0) mission.scrollIntoView({ block: 'start', behavior: 'instant' });
  }, [autoStart]);
  useEffect(() => {
    if (autoStart && active && listenOnly && available && !spoken.current) {
      spoken.current = true; speak(question.audioText);
    }
  }, [autoStart, active, listenOnly, available, question.audioText, speak]);

  useEffect(() => {
    if (!active || state.untimed) return;
    let previous = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      dispatch({ type: 'tick', milliseconds: now - previous });
      previous = now;
    }, 100);
    return () => clearInterval(id);
  }, [active, state.untimed]);

  useEffect(() => {
    if (state.phase !== 'firing') return;
    const id = setTimeout(() => dispatch({ type: 'finish' }), 330);
    return () => clearTimeout(id);
  }, [state.phase]);

  useEffect(() => {
    if (!finished || delivered.current) return;
    delivered.current = true;
    const given = state.shot?.answer ?? '（泡泡飛走了：時間到了）';
    callbacks.current.onAnswer(given, given === question.correctAnswer);
    feedback.current?.focus({ preventScroll: true });
  }, [finished, state.shot, question.correctAnswer]);

  useEffect(() => {
    if (!advance) return;
    const id = setTimeout(() => callbacks.current.onNext(), 2400);
    return () => clearTimeout(id);
  }, [advance]);

  useEffect(() => {
    const pause = () => { dispatch({ type: 'pause' }); setHoldNext(true); };
    const visibility = () => { if (document.hidden) pause(); };
    window.addEventListener('blur', pause);
    document.addEventListener('visibilitychange', visibility);
    return () => { window.removeEventListener('blur', pause); document.removeEventListener('visibilitychange', visibility); };
  }, []);

  function fire(index: number) {
    const word = options[index];
    if (!word) return;
    if (recovering) {
      if (word === question.correctAnswer) {
        dispatch({ type: 'repair', answer: word, correctAnswer: question.correctAnswer });
        chime(true, settings.sound);
        if (available) speak(question.audioText);
      }
      return;
    }
    if (!active) return;
    const bounds = board.current!.getBoundingClientRect();
    const bubble = targets.current[index]!.getBoundingClientRect();
    const x = (bubble.left + bubble.width / 2 - bounds.left) / bounds.width * 100;
    const y = (bubble.top + bubble.height / 2 - bounds.top) / bounds.height * 100;
    setSelected(index); setAim({ x, y });
    launchSound(settings.sound);
    dispatch({ type: 'fire', shot: { answer: word, x, y } });
  }

  function keyboard(event: KeyboardEvent<HTMLDivElement>) {
    if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'Escape' && active) { event.preventDefault(); dispatch({ type: 'pause' }); return; }
    if (!active && !recovering) return;
    if (/^[1-4]$/.test(event.key)) { event.preventDefault(); fire(Number(event.key) - 1); }
    if (event.target !== board.current) return;
    if (['ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();
      const index = (selected + (event.key === 'ArrowRight' ? 1 : options.length - 1)) % options.length;
      setSelected(index); setAim(positions[index]);
    }
    if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); fire(selected); }
  }

  function begin(resume = false) {
    dispatch({ type: resume ? 'resume' : 'start' });
    board.current?.focus({ preventScroll: true });
    if (listenOnly && available) { spoken.current = true; speak(question.audioText); }
  }

  return <div className="shooter" data-question-id={question.id} data-phase={state.phase} data-pace={pace}>
    <div className="shooter-brief">
      <div><span className="eyebrow">WORD POP GALAXY · {pace === 'relaxed' ? '輕鬆練習' : '限時挑戰'}</span><h2>{listenOnly && available && !finished ? '聽一聽，哪個泡泡才是答案？' : <>射中「<strong>{question.translation}</strong>」的英文</>}</h2></div>
      <button className="secondary" disabled={!available} onClick={() => { if (finished) setHoldNext(true); speak(question.audioText); }}><Volume2 size={18}/> {finished ? '再聽一次' : '聽英文'}</button>
    </div>
    <div className="shooter-controls">
      <label><input type="checkbox" checked={listenOnly} disabled={!available || state.phase === 'firing' || finished} onChange={e => { onListenChange(e.target.checked); if (e.target.checked) { spoken.current = true; speak(question.audioText); } }}/> 聽力模式</label>
      <label><input type="checkbox" checked={autoNext} onChange={e => { onAutoNextChange(e.target.checked); setHoldNext(false); }}/> 答對自動下一題</label>
      <button className="text-button" disabled={!active} onClick={() => dispatch({ type: 'pause' })}><Pause size={16}/> 暫停</button>
    </div>
    {!available && <p className="shooter-fallback">此裝置沒有英文語音，已使用中文提示。</p>}
    <div className={`shooting-field ${urgent ? 'time-urgent' : ''} ${state.phase === 'firing' ? 'is-firing' : ''}`} ref={board} role="group" tabIndex={0} aria-label="泡泡射擊場：方向鍵選擇、空白鍵發射，也可按數字鍵或直接點選泡泡" onKeyDown={keyboard}
      onPointerMove={e => { if (!active || e.pointerType === 'touch') return; const r = e.currentTarget.getBoundingClientRect(); setAim({ x: Math.max(0, Math.min(100, (e.clientX - r.left) / r.width * 100)), y: Math.max(0, Math.min(80, (e.clientY - r.top) / r.height * 100)) }); }}
      onClick={() => { if (active) setMissed(true); }}>
      <div className="shooting-stars" aria-hidden="true">✧ <span>✦</span> ✧ <span>✦</span> ✧</div>
      <div className="shooting-hud"><span><Crosshair size={16}/> {streak > 1 ? `連擊 ×${streak} · 太棒了！` : '瞄準泡泡，點一下發射'}</span>{state.untimed ? <span>∞ 不限時</span> : <span role="timer" aria-label={`剩餘 ${Math.ceil(state.remaining / 1000)} 秒`}>{Math.ceil(state.remaining / 1000)} 秒</span>}</div>
      {!state.untimed && <div className="shooting-time" aria-hidden="true"><span style={{ width: `${state.remaining / (shooterSeconds[settings.difficulty] * 10)}%` }}/></div>}
      {options.map((word, i) => <button key={word} ref={node => { targets.current[i] = node; }} lang="en" aria-label={`${recovering && word === question.correctAnswer ? '補練' : '射擊'} ${word}，快捷鍵 ${i + 1}`}
        className={`word-bubble bubble-${i} ${selected === i ? 'targeted' : ''} ${finished && word === question.correctAnswer ? 'bubble-correct' : ''} ${finished && state.shot?.answer === word && word !== question.correctAnswer ? 'bubble-wrong' : ''} ${recovering && word === question.correctAnswer ? 'repair-target' : ''}`}
        style={{ left: `${positions[i].x}%`, top: `${positions[i].y}%`, animationDelay: `${-i * .9}s`, animationPlayState: active ? 'running' : 'paused' }}
        disabled={!active && !(recovering && word === question.correctAnswer)}
        onFocus={() => { setSelected(i); setAim(positions[i]); }} onClick={e => { e.stopPropagation(); fire(i); }}>
        <span className="bubble-key">{i + 1}</span><span>{word}</span>{finished && word === question.correctAnswer && <span className="bubble-check">✓</span>}
      </button>)}
      <svg className="aim-guide" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d={`M50 90 L${aim.x} ${aim.y}`} stroke="currentColor" strokeWidth=".4" strokeDasharray="1 2"/></svg>
      {state.shot && <div className="bubble-projectile" aria-hidden="true" style={{ '--shot-x': `${state.shot.x}%`, '--shot-y': `${state.shot.y}%` } as CSSProperties}/>}
      {(correct || state.repaired) && <div className="pop-burst" aria-hidden="true" style={{ left: `${positions[options.indexOf(question.correctAnswer)].x}%`, top: `${positions[options.indexOf(question.correctAnswer)].y}%` }}>{Array.from({ length: 10 }, (_, i) => <i key={i} style={{ '--dx': `${Math.cos(i * Math.PI / 5) * 100}px`, '--dy': `${Math.sin(i * Math.PI / 5) * 75}px`, '--spin': `${i * 60}deg` } as CSSProperties}>✦</i>)}</div>}
      {finished && <div className={`shot-outcome ${correct || state.repaired ? 'hit' : ''}`} aria-hidden="true">{correct ? `+${scoreAnswer(true, Math.max(0, streak - 1), 'shooter')} 分` : state.repaired ? '學會了！' : ''}</div>}
      <div className="bubble-cannon" aria-hidden="true"><div className="cannon-barrel" style={{ transform: `rotate(${angle}deg)` }}/><div className="cannon-body"><span>●</span><span>●</span><i>⌣</i></div><div className="cannon-base"/></div>
      <div className="shooting-ground" aria-hidden="true"/>
      {(state.phase === 'ready' || state.phase === 'paused') && <div className="shooting-overlay" onClick={e => e.stopPropagation()}><div>
        <span className="shooting-emblem">✦</span><h3>{state.phase === 'ready' ? '準備好，讓單字發光！' : '休息一下，再出發'}</h3>
        {state.phase === 'ready' && <div className="pace-picker" role="group" aria-label="射擊節奏">
          <button aria-pressed={pace === 'relaxed'} onClick={() => { onPaceChange('relaxed'); dispatch({ type: 'pace', untimed: true }); }}><span>🌱 輕鬆練習</span><small>不限時間，慢慢想</small></button>
          <button aria-pressed={pace === 'challenge'} onClick={() => { onPaceChange('challenge'); dispatch({ type: 'pace', untimed: false }); }}><span>⚡ 限時挑戰</span><small>每題 {shooterSeconds[settings.difficulty]} 秒</small></button>
        </div>}
        <p>{state.phase === 'ready' ? '看中文或聽英文，點中正確泡泡。答錯也可以原地補練！' : '題目倒數已停止，不用著急。'}</p>
        <button className="primary" onClick={() => begin(state.phase === 'paused')}><Play size={18}/>{state.phase === 'ready' ? '開始射擊任務' : '繼續射擊'}</button>
        <small className="shooting-key-hint">已記住你的節奏與接題設定<br/>點一下發射 · 數字鍵 1–{options.length} · Esc 暫停</small>
      </div></div>}
    </div>
    <div className={`shooter-dock ${finished ? correct ? 'dock-success' : 'dock-review' : ''}`} ref={feedback} tabIndex={-1}>
      {finished ? <>
        <div className="shot-feedback" role="status"><strong>{correct ? <><CheckCircle2 size={18}/> {streak >= 3 ? `連擊 ${streak}！節奏抓得真好！` : '命中了，做得好！'}</> : state.repaired ? '記住了！下一次你也會認得它' : state.shot ? '差一點！一起記住這個字' : '時間到了，一起記住這個字'}</strong><p><b lang="en">{question.correctAnswer}</b> · {question.translation}</p><small>{question.explanation}{!correct && '（成績保留第一次作答，補練不加分）'}</small></div>
        <div className="shot-next"><button className="primary" onClick={() => callbacks.current.onNext()}>{last ? '看看學習成果' : '下一題'}<ArrowRight size={17}/></button>{advance ? <button className="auto-advance" onClick={() => setHoldNext(true)}><span/>稍後自動前進 · 點此停留</button> : correct && !last && <small>準備好了再繼續</small>}</div>
      </> : <p role="status">{state.phase === 'firing' ? '✦ 星光彈發射中！' : missed && active ? '點有英文的泡泡就能發射，沒有扣分！' : urgent ? '還有 5 秒以內，看清楚再發射！' : <><Zap size={16}/> 答對 +100 分，連擊再加分。答錯可以補練！</>}</p>}
    </div>
  </div>;
}
