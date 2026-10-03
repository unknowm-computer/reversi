export const GOMOKU_SIZE = 15;
export const GOMOKU_CELL_COUNT = GOMOKU_SIZE * GOMOKU_SIZE;
export const GOMOKU_COLUMNS = 'ABCDEFGHIJKLMNO';
export const GOMOKU_DIRECTIONS: ReadonlyArray<readonly [number, number]> = [[0, 1], [1, 0], [1, 1], [1, -1]];

export function gomokuCoordinate(index: number): string {
  return `${GOMOKU_COLUMNS[index % GOMOKU_SIZE]}${Math.floor(index / GOMOKU_SIZE) + 1}`;
}
