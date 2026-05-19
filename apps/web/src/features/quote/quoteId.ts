/**
 * Generates a quote id of the form DEV-YYYY-NNNN.
 * NNNN is zero-padded to 4 digits, using a local counter persisted in localStorage.
 * Sequencing per year — wraps yearly.
 */
const KEY = 'df:quote-seq';

interface SeqState {
  year: number;
  next: number;
}

function readSeq(): SeqState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SeqState>;
    if (typeof parsed.year !== 'number' || typeof parsed.next !== 'number') return null;
    return { year: parsed.year, next: parsed.next };
  } catch {
    return null;
  }
}

function writeSeq(seq: SeqState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(seq));
  } catch {
    // localStorage unavailable — best-effort only
  }
}

export function nextQuoteId(now: Date = new Date()): string {
  const year = now.getFullYear();
  const current = readSeq();
  const next = current?.year === year ? current.next : 1;
  writeSeq({ year, next: next + 1 });
  return `DEV-${String(year)}-${String(next).padStart(4, '0')}`;
}

export function newLineId(): string {
  // Sufficiently unique within a session.
  return `line-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
