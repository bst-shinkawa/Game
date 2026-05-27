/**
 * Mulberry32 シード付き疑似乱数生成器。
 * ゲームセッション開始時に seedRandom() でシードを設定すると
 * コイントスやマリガンシャッフルの再現性が得られる。
 */
function mulberry32(seed: number): () => number {
  let s = seed;
  return function (): number {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let _rng: () => number = Math.random;

/** ゲームセッション開始時に呼び出してシードを設定する */
export function seedRandom(seed: number): void {
  _rng = mulberry32(seed);
}

/** シード付き乱数を返す（未設定時は Math.random() と同等） */
export function random(): number {
  return _rng();
}

/** ゲームセッション終了後に Math.random() に戻す */
export function resetRandom(): void {
  _rng = Math.random;
}

/** 現在のタイムスタンプをベースにシードを生成する */
export function generateSeed(): number {
  return Math.floor(Date.now() * Math.random());
}
