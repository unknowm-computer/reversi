import type { JanggiFormation, PieceKind } from '../../game/types.js';

/** The four flank pieces, from left to right as seen from the player's own side. */
export const JANGGI_FORMATION_PIECES = {
  outer: ['horse', 'elephant', 'elephant', 'horse'],
  inner: ['elephant', 'horse', 'horse', 'elephant'],
  left: ['horse', 'elephant', 'horse', 'elephant'],
  right: ['elephant', 'horse', 'elephant', 'horse'],
} as const satisfies Readonly<Record<JanggiFormation, readonly PieceKind[]>>;
