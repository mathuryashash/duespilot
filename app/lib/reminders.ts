// Pure reminder ladder: tone by reliability score, at most one send per UTC day.
export type Tone = 'friendly' | 'firm' | 'final';
export function ladder(daysOverdue: number, score: number, lastSentAt: string | null, now: string): { tone: Tone } | null {
  if (daysOverdue <= 0) return null;
  if (lastSentAt && lastSentAt.slice(0, 10) === now.slice(0, 10)) return null;
  return { tone: score >= 80 ? 'friendly' : score >= 50 ? 'firm' : 'final' };
}
