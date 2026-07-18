'use client';

import React, { useEffect, useState } from 'react';

export interface LiveTimerProps {
  startedAt: number | null;
}

/** Đồng hồ đếm chạy — cập nhật mỗi 100ms trong lúc submission đang chạy. */
export default function LiveTimer({ startedAt }: LiveTimerProps): React.ReactElement {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!startedAt) return;
    const id = setInterval(() => setElapsed(Date.now() - startedAt), 100);
    return () => clearInterval(id);
  }, [startedAt]);
  const secs = (elapsed / 1000).toFixed(1);
  return (
    <span className="font-mono text-xs text-slate-500 tabular-nums">
      {startedAt ? `${secs}s` : '—'}
    </span>
  );
}
