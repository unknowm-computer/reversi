import { describe, expect, it } from 'vitest';
import { pieceHintArrowGeometry, type HintArrowGeometry } from '../src/utils/pieceHintArrow';

function geometry(from: number, to: number, columns = 8, rows = 8, reversed = false): HintArrowGeometry {
  const result = pieceHintArrowGeometry(from, to, columns, rows, reversed);
  expect(result).not.toBeNull();
  return result!;
}

describe('piece hint arrow geometry', () => {
  it('points from the chosen piece toward the destination, leaving both piece centers clear', () => {
    const arrow = geometry(52, 36);
    expect(arrow.start.x).toBe(4.5);
    expect(arrow.start.y).toBeCloseTo(6.16);
    expect(arrow.end.x).toBe(4.5);
    expect(arrow.end.y).toBeCloseTo(4.84);
    expect(arrow.points[3]).toEqual(arrow.end);
    expect(arrow.points.every(point => point.y >= arrow.end.y)).toBe(true);
  });

  it.each([[0, 1], [1, 0], [8, 0], [0, 8], [0, 63], [57, 42]])('keeps the arrowhead forward for adjacent, diagonal, and knight moves %i → %i', (from, to) => {
    const arrow = geometry(from, to);
    const dx = arrow.end.x - arrow.start.x, dy = arrow.end.y - arrow.start.y;
    const length = Math.hypot(dx, dy);
    const direction = { x: dx / length, y: dy / length };
    const projection = (index: number): number => (arrow.points[index].x - arrow.start.x) * direction.x + (arrow.points[index].y - arrow.start.y) * direction.y;
    expect(projection(0)).toBeCloseTo(0);
    expect(projection(1)).toBeGreaterThan(0);
    expect(projection(2)).toBeLessThan(length);
    expect(projection(3)).toBeCloseTo(length);
    expect(Math.hypot(arrow.points[0].x - arrow.points[6].x, arrow.points[0].y - arrow.points[6].y)).toBeCloseTo(.08);
  });

  it.each([[8, 8, 52, 36], [9, 10, 76, 67], [9, 10, 0, 89]])('rotates every point by half a turn for a %i × %i board', (columns, rows, from, to) => {
    const normal = geometry(from, to, columns, rows);
    const reversed = geometry(from, to, columns, rows, true);
    [normal.start, normal.end, ...normal.points].forEach((point, index) => {
      const rotated = [reversed.start, reversed.end, ...reversed.points][index];
      expect(rotated.x).toBeCloseTo(columns - point.x);
      expect(rotated.y).toBeCloseTo(rows - point.y);
    });
  });

  it('does not draw for invalid coordinates or zero-length moves', () => {
    expect(pieceHintArrowGeometry(0, 0, 8, 8)).toBeNull();
    expect(pieceHintArrowGeometry(-1, 1, 8, 8)).toBeNull();
    expect(pieceHintArrowGeometry(0, 64, 8, 8)).toBeNull();
    expect(pieceHintArrowGeometry(.5, 1, 8, 8)).toBeNull();
    expect(pieceHintArrowGeometry(0, 1, 0, 8)).toBeNull();
  });
});
