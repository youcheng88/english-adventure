import { useEffect, useReducer, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { Crosshair, Pause, Play, Volume2 } from 'lucide-react';
import type { Question, Settings } from '../types';
import { choiceOptions } from '../lib/engine';
import { useSpeech } from '../lib/audio';
import { shooterReducer, shooterSeconds, targetPositions } from '../lib/shooter';
import './shooter.css';

export function ShooterGame({ question, settings, autoStart, listenOnly, onListenChange, onAnswer }: {
  question: Question; settings: Settings; autoStart: boolean;
  listenOnly: boolean; onListenChange: (value: boolean) => void;
  onAnswer: (given: string, correct: boolean) => void;
}) {
  const [options] = useState(() => choiceOptions(question, 'shooter', settings.difficulty));
  const [state, dispatch] = useReducer(shooterReducer, {
    phase: autoStart ? (document.hidden ? 'paused' : 'playing') : 'ready',
    remaining: shooterSeconds[settings.difficulty] * 1000, shot: null,
  });
  const [selected, setSelected] = useState(0);
  const [aim, setAim] = useState({ x: 50, y: 35 });
  const [missed, setMissed] = useState(false);
  const { speak, available } = useSpeech(settings.rate);
  const board = useRef<HTMLDivElement>(null);
  const targets = useRef<(HTMLButtonElement | null)[]>([]);
  const delivered = useRef(false);
  const answerCallback = useRef(onAnswer);
  answerCallback.current = onAnswer;
  const positions = targetPositions(options.length);
  const active = state.phase === 'playing';
  const finished = state.phase === 'finished';
  const angle = Math.atan2(aim.x - 50, (90 - aim.y) * .8) * 180 / Math.PI;

  useEffect(() => { if (autoStart) board.current?.focus(); }, [autoStart]);

  useEffect(() => {
    if (!active) return;
    let previous = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      dispatch({ type: 'tick', milliseconds: now - previous });
      previous = now;
    }, 100);
    return () => clearInterval(id);
  }, [active]);

  useEffect(() => {
    if (state.phase !== 'firing') return;
    const id = setTimeout(() => dispatch({ type: 'finish' }), 330);
    return () => clearTimeout(id);
  }, [state.phase]);

  useEffect(() => {
    if (!finished || delivered.current) return;
    delivered.current = true;
    const given = state.shot?.answer ?? '（泡泡飛走了：時間到了）';
    answerCallback.current(given, given === question.correctAnswer);
  }, [finished, state.shot, question.correctAnswer]);

  useEffect(() => {
    const pause = () => dispatch({ type: 'pause' });
    const visibility = () => { if (document.hidden) pause(); };
    window.addEventListener('blur', pause);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('blur', pause);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);

  function fire(index: number) {
    if (!active || !options[index]) return;
    const bounds = board.current!.getBoundingClientRect();
    const bubble = targets.current[index]!.getBoundingClientRect();
    const x = (bubble.left + bubble.width / 2 - bounds.left) / bounds.width * 100;
    const y = (bubble.top + bubble.height / 2 - bounds.top) / bounds.height * 100;
    setSelected(index);
    setAim({ x, y });
    dispatch({ type: 'fire', shot: { answer: options[index], x, y } });
  }

  function keyboard(event: KeyboardEvent<HTMLDivElement>) {
    if (!active || event.altKey || event.ctrlKey || event.metaKey) return;
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
    board.current?.focus();
    if (listenOnly && available) speak(question.audioText);
  }

  return <div className="shooter" data-question-id={question.id} data-phase={state.phase}>
    <div className="shooter-brief">
      <div><span className="eyebrow">WORD POP · 小芽的泡泡任務</span><h2>{listenOnly && available ? '聽一聽，射中對的英文泡泡！' : <>射中「<strong>{question.translation}</strong>」的英文泡泡</>}</h2></div>
      <button className="secondary" disabled={!available} onClick={() => speak(question.audioText)}><Volume2 size={18}/> 聽英文</button>
    </div>
    <div className="shooter-controls">
      <label><input type="checkbox" checked={listenOnly} disabled={!available || state.phase === 'firing' || finished} onChange={e => { onListenChange(e.target.checked); if (e.target.checked) speak(question.audioText); }}/> 隱藏中文，挑戰聽力</label>
      {!available && <span>此裝置無英文語音，使用中文提示練習。</span>}
      <button className="text-button" disabled={!active} onClick={() => dispatch({ type: 'pause' })}><Pause size={16}/> 暫停</button>
    </div>
    <div className="shooting-field" ref={board} role="group" tabIndex={0} aria-label="泡泡射擊場：方向鍵選擇、空白鍵發射，也可按數字鍵或直接點選泡泡" onKeyDown={keyboard}
      onPointerMove={e => { if (!active || e.pointerType === 'touch') return; const r = e.currentTarget.getBoundingClientRect(); setAim({ x: Math.max(0, Math.min(100, (e.clientX - r.left) / r.width * 100)), y: Math.max(0, Math.min(80, (e.clientY - r.top) / r.height * 100)) }); }}
      onClick={() => { if (active) setMissed(true); }}>
      <div className="shooting-stars" aria-hidden="true">✧ <span>✦</span> ✧ <span>✦</span> ✧</div>
      <div className="shooting-hud"><span><Crosshair size={16}/> 找到英文，點擊發射</span><span role="timer" aria-label={`剩餘 ${Math.ceil(state.remaining / 1000)} 秒`}>{Math.ceil(state.remaining / 1000)} 秒</span></div>
      <div className="shooting-time" aria-hidden="true"><span style={{ width: `${state.remaining / (shooterSeconds[settings.difficulty] * 10)}%` }}/></div>
      {options.map((word, i) => <button key={word} ref={node => { targets.current[i] = node; }} lang="en" aria-label={`射擊 ${word}，快捷鍵 ${i + 1}`}
        className={`word-bubble bubble-${i} ${selected === i ? 'targeted' : ''} ${finished && word === question.correctAnswer ? 'bubble-correct' : ''} ${finished && state.shot?.answer === word && word !== question.correctAnswer ? 'bubble-wrong' : ''}`}
        style={{ left: `${positions[i].x}%`, top: `${positions[i].y}%`, animationDelay: `${-i * .9}s`, animationPlayState: active ? 'running' : 'paused' }} disabled={!active}
        onFocus={() => { setSelected(i); setAim(positions[i]); }} onClick={e => { e.stopPropagation(); fire(i); }}>
        <span className="bubble-key">{i + 1}</span><span>{word}</span>{finished && word === question.correctAnswer && <span className="bubble-check">✓</span>}
      </button>)}
      <svg className="aim-guide" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d={`M50 90 L${aim.x} ${aim.y}`} stroke="currentColor" strokeWidth=".4" strokeDasharray="1 2"/></svg>
      {state.shot && <div className="bubble-projectile" aria-hidden="true" style={{ '--shot-x': `${state.shot.x}%`, '--shot-y': `${state.shot.y}%` } as CSSProperties}/>}
      {finished && <div className={`shot-outcome ${state.shot?.answer === question.correctAnswer ? 'hit' : ''}`} aria-hidden="true">{state.shot?.answer === question.correctAnswer ? '✦ 命中！ ✦' : state.shot ? '記住正確的泡泡，下次再試！' : '泡泡飛走了，再接再厲！'}</div>}
      <div className="bubble-cannon" aria-hidden="true"><div className="cannon-barrel" style={{ transform: `rotate(${angle}deg)` }}/><div className="cannon-body"><span>●</span><span>●</span><i>⌣</i></div><div className="cannon-base"/></div>
      <div className="shooting-ground" aria-hidden="true"/>
      {(state.phase === 'ready' || state.phase === 'paused') && <div className="shooting-overlay" onClick={e => e.stopPropagation()}><div><span className="shooting-emblem">✦</span><h3>{state.phase === 'ready' ? '泡泡射手，準備出發！' : '任務已暫停'}</h3><p>{state.phase === 'ready' ? `看中文或聽發音，射中正確英文。每題 ${shooterSeconds[settings.difficulty]} 秒，一發決定答案。` : '休息一下，倒數已停止。回來後繼續這一題。'}</p><p>點泡泡發射 · 或按 1–{options.length}<br/>方向鍵瞄準，空白鍵發射</p><button className="primary" onClick={() => begin(state.phase === 'paused')}><Play size={18}/>{state.phase === 'ready' ? '開始射擊任務' : '繼續射擊'}</button></div></div>}
    </div>
    <p className="shooting-help" role="status">{state.phase === 'firing' ? '星光彈發射中！' : missed && active ? '點擊有英文的泡泡才會命中，不扣分，再瞄準一次！' : '連續命中有額外加分！答錯會顯示正解；暫停或切換視窗會停止倒數。'}</p>
  </div>;
}
