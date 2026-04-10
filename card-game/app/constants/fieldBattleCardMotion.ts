/**
 * フィールドのカード／スロットの見え方（Game.Master .card_on_field / .field_slot と一致）
 * perspective は .field_player_battle / .field_enemy_battle 側。
 */
export const FIELD_CARD_POSE = {
  rotateX: 30,
  scaleY: 1.1,
  y: 0,
  scale: 1,
  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
} as const;

/** 召喚開始: 卓に寝かす前（より立っている）→ FIELD_CARD_POSE へ */
export const FIELD_SUMMON_FROM = {
  rotateX: 52,
  scaleY: 0.94,
  y: -22,
  scale: 0.88,
  opacity: 0.92,
  boxShadow: "0 6px 18px rgba(0, 0, 0, 0.38)",
} as const;
