import React from 'react';

export default function LevelIndicator({ level = 0, db = -Infinity, peak = 0 }) {
  const clamped = Math.max(0, Math.min(1, level));
  const barCount = 24;
  const activeBars = Math.round(clamped * barCount);

  return (
    <div className="w-full">
      <div className="flex items-end gap-1 h-16 bg-neutral-900/70 p-2 rounded-md border border-white/5">
        {Array.from({ length: barCount }).map((_, i) => {
          const filled = i < activeBars;
          const ratio = (i + 1) / barCount;
          const color = ratio > 0.85 ? 'bg-red-500' : ratio > 0.6 ? 'bg-yellow-400' : 'bg-emerald-400';
          return (
            <div
              key={i}
              className={`flex-1 rounded-sm transition-all duration-75 ${filled ? color : 'bg-neutral-800'}`}
              style={{ height: `${Math.max(8, (i + 1) * (100 / barCount))}%` }}
            />
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-between text-sm text-neutral-300">
        <span>Level</span>
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-lg text-white">{Number.isFinite(db) ? db.toFixed(1) : '-∞'} dB</span>
          <span className="text-xs text-neutral-400">Peak: {Math.round(peak * 100)}%</span>
        </div>
      </div>
    </div>
  );
}
