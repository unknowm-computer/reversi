/** Board geometry shared by Reversi rules, rendering, AI and online validation. */
export const REVERSI_SIZE = 8;
export const REVERSI_CELL_COUNT = REVERSI_SIZE * REVERSI_SIZE;
export const REVERSI_COLUMNS = 'ABCDEFGH';
export const REVERSI_CORNERS: readonly number[] = [
  0,
  REVERSI_SIZE - 1,
  REVERSI_CELL_COUNT - REVERSI_SIZE,
  REVERSI_CELL_COUNT - 1,
];

export function reversiCoordinate(index: number): string {
  return `${REVERSI_COLUMNS[index % REVERSI_SIZE]}${Math.floor(index / REVERSI_SIZE) + 1}`;
}
