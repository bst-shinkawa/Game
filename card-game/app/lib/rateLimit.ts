/**
 * シンプルなインメモリ レート制限
 * Vercel はサーバーレスのためリクエスト間でメモリが共有されない場合があります。
 * より堅牢な制限が必要な場合は Upstash Redis + @upstash/ratelimit 等を検討してください。
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitRecord>();

// 古いエントリを定期的に削除（メモリリーク防止）
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of store) {
    if (record.resetAt < now) store.delete(key);
  }
}, 60_000);

export interface RateLimitOptions {
  /** ウィンドウ幅（ミリ秒）。デフォルト 60,000ms (1 分) */
  windowMs?: number;
  /** ウィンドウ内の最大リクエスト数。デフォルト 20 */
  max?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function rateLimit(
  identifier: string,
  { windowMs = 60_000, max = 20 }: RateLimitOptions = {}
): RateLimitResult {
  const now = Date.now();
  const existing = store.get(identifier);

  if (!existing || existing.resetAt < now) {
    const record: RateLimitRecord = { count: 1, resetAt: now + windowMs };
    store.set(identifier, record);
    return { allowed: true, remaining: max - 1, resetAt: record.resetAt };
  }

  existing.count += 1;
  const remaining = Math.max(0, max - existing.count);
  return {
    allowed: existing.count <= max,
    remaining,
    resetAt: existing.resetAt,
  };
}
