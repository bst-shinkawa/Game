import { cards } from "./cards";
import { DeckRole, getDefaultDeckIds } from "./deck";

const DECK_LIMIT = 20;
const SAME_CARD_LIMIT = 2;
const HIGH_COST_SAME_CARD_LIMIT = 1;
const HIGH_COST_THRESHOLD = 6;

const STORAGE_KEYS: Record<DeckRole, string> = {
  king: "deckbuilder.king",
  usurper: "deckbuilder.usurper",
};

export function getDeckBuilderRules() {
  return {
    deckLimit: DECK_LIMIT,
    sameCardLimit: SAME_CARD_LIMIT,
    highCostLimit: HIGH_COST_SAME_CARD_LIMIT,
    highCostThreshold: HIGH_COST_THRESHOLD,
  };
}

export function validateDeckIds(ids: number[], role: DeckRole): string[] {
  const errors: string[] = [];

  if (ids.length < DECK_LIMIT) {
    errors.push(`デッキは${DECK_LIMIT}枚で保存してください。`);
  }

  if (ids.length > DECK_LIMIT) {
    errors.push(`デッキ枚数は最大${DECK_LIMIT}枚です。`);
  }

  const allowedIds = new Set(getDefaultDeckIds(role));
  const roleCards = cards.filter((c) => c.owner === role && allowedIds.has(c.id));
  const roleCardMap = new Map(roleCards.map((c) => [c.id, c]));
  const countById = new Map<number, number>();

  for (const id of ids) {
    const target = roleCardMap.get(id);
    if (!target) {
      errors.push("選択できないカードが含まれています。");
      continue;
    }
    countById.set(id, (countById.get(id) ?? 0) + 1);
  }

  for (const [id, count] of countById) {
    const target = roleCardMap.get(id);
    if (!target) continue;
    const maxByCard = target.cost >= HIGH_COST_THRESHOLD ? HIGH_COST_SAME_CARD_LIMIT : SAME_CARD_LIMIT;
    if (count > maxByCard) {
      if (target.cost >= HIGH_COST_THRESHOLD) {
        errors.push(`コスト${HIGH_COST_THRESHOLD}以上の同名カードは最大${HIGH_COST_SAME_CARD_LIMIT}枚までです。`);
      } else {
        errors.push(`同名カードは最大${SAME_CARD_LIMIT}枚までです。`);
      }
      break;
    }
  }

  return [...new Set(errors)];
}

export function getDeckIdsFromStorage(role: DeckRole): number[] | null {
  if (typeof window === "undefined") return null;
  const key = STORAGE_KEYS[role];
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const ids = parsed.filter((v: unknown) => Number.isInteger(v)) as number[];
    const errors = validateDeckIds(ids, role);
    return errors.length === 0 ? ids : null;
  } catch {
    return null;
  }
}

export function saveDeckIdsToStorage(role: DeckRole, ids: number[]): { ok: boolean; errors: string[] } {
  const errors = validateDeckIds(ids, role);
  if (errors.length > 0) return { ok: false, errors };
  if (typeof window === "undefined") return { ok: false, errors: ["ブラウザでのみ保存できます。"] };
  window.localStorage.setItem(STORAGE_KEYS[role], JSON.stringify(ids));
  return { ok: true, errors: [] };
}

export function getDeckIdsForBattle(role: DeckRole): number[] {
  return getDeckIdsFromStorage(role) ?? getDefaultDeckIds(role);
}

export async function fetchDeckIdsFromServer(role: DeckRole): Promise<number[] | null> {
  try {
    const res = await fetch("/api/decks", { method: "GET", credentials: "include" });
    if (!res.ok) return null;
    const data = (await res.json()) as { decks?: { king?: number[] | null; usurper?: number[] | null } };
    const ids = role === "king" ? data.decks?.king : data.decks?.usurper;
    if (!ids) return null;
    const errors = validateDeckIds(ids, role);
    return errors.length === 0 ? ids : null;
  } catch {
    return null;
  }
}

export async function saveDeckIdsToServer(role: DeckRole, ids: number[]): Promise<{ ok: boolean; error?: string }> {
  const errors = validateDeckIds(ids, role);
  if (errors.length > 0) return { ok: false, error: errors[0] };

  try {
    const res = await fetch("/api/decks", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [role]: ids }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: false, error: body.error ?? "サーバー保存に失敗しました。" };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "通信エラーのためサーバー保存に失敗しました。" };
  }
}

