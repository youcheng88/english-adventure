import { useEffect, useState } from 'react';
import { Clock, SlidersHorizontal } from 'lucide-react';

function ElapsedTime({ startedAt }: { startedAt: number }) {
  const [seconds, setSeconds] = useState(() => Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
  useEffect(() => {
    const timer = window.setInterval(() => setSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000))), 1000);
    return () => window.clearInterval(timer);
  }, [startedAt]);
  return <span className="elapsed-time"><Clock size={16} aria-hidden="true"/> 已玩 {seconds} 秒</span>;
}

export function SessionOptions({ startedAt, rate, onRate }: { startedAt: number; rate: number; onRate: (rate: number) => void }) {
  const [open, setOpen] = useState(false);
  return <details className="session-options" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary><SlidersHorizontal size={16} aria-hidden="true"/> 遊戲設定</summary>
    <div className="session-options-content">
      <label>英文語速 <select aria-label="英文語速" value={rate} onChange={event => onRate(Number(event.target.value))}>
        <option value="0.65">慢慢聽 0.65×</option><option value="0.85">稍慢 0.85×</option><option value="1">正常 1×</option><option value="1.15">稍快 1.15×</option>
      </select></label>
      {open && <ElapsedTime startedAt={startedAt}/>}
    </div>
  </details>;
}
