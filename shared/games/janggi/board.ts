export const JANGGI_ROWS = 10;
export const JANGGI_COLUMNS = 9;
export const JANGGI_CELL_COUNT = JANGGI_ROWS * JANGGI_COLUMNS;

export function janggiCoordinate(index: number): string {
  return `${'ABCDEFGHI'[index % JANGGI_COLUMNS]}${Math.floor(index / JANGGI_COLUMNS) + 1}`;
}

export function janggiIndex(row: number, column: number): number | null {
  return row >= 0 && row < JANGGI_ROWS && column >= 0 && column < JANGGI_COLUMNS
    ? row * JANGGI_COLUMNS + column : null;
}
