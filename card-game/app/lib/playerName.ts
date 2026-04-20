const MIN_LEN = 2;
const MAX_LEN = 16;

// 初期辞書。運用しながら追加する前提。
const BANNED_WORDS = [
  "ちん",
  "まん",
  "せっくす",
  "sex",
  "fuck",
  "fack",
  "shit",
  "penis",
  "vagina",
  "おっぱい",
  "ちんこ",
  "まんこ",
];

const RESERVED_NAMES = ["admin", "administrator", "official", "運営", "管理者"];

export function normalizePlayerName(name: string): string {
  return name.normalize("NFKC").trim().replace(/\s+/g, " ");
}

export function validatePlayerName(name: string): { ok: boolean; reason?: string } {
  const normalized = normalizePlayerName(name);
  if (normalized.length < MIN_LEN || normalized.length > MAX_LEN) {
    return { ok: false, reason: `名前は${MIN_LEN}〜${MAX_LEN}文字で入力してください。` };
  }

  if (!/^[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}A-Za-z0-9_\-\s]+$/u.test(normalized)) {
    return { ok: false, reason: "使用できない文字が含まれています。" };
  }

  const lower = normalized.toLowerCase();
  if (RESERVED_NAMES.some((word) => lower.includes(word))) {
    return { ok: false, reason: "この名前は利用できません。" };
  }
  if (BANNED_WORDS.some((word) => lower.includes(word))) {
    return { ok: false, reason: "この名前は利用できません。" };
  }

  return { ok: true };
}

export function canChangePlayerName(lastChangedAt: string | null, now = new Date()): { ok: boolean; nextAllowedAt?: Date } {
  if (!lastChangedAt) return { ok: true };
  const changed = new Date(lastChangedAt);
  const nextAllowed = new Date(changed.getTime() + 24 * 60 * 60 * 1000);
  if (now < nextAllowed) return { ok: false, nextAllowedAt: nextAllowed };
  return { ok: true };
}

