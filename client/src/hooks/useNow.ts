import { useEffect, useState } from 'react';

/** Current time, re-rendered every `intervalMs` (default 30 s) so displayed clocks stay live. */
export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
