export interface HintArrowPoint { x: number; y: number }
export interface HintArrowGeometry {
  start: HintArrowPoint;
  end: HintArrowPoint;
  points: HintArrowPoint[];
}

/** Board-space coordinates keep arrow placement aligned with both board sizes. */
export function pieceHintArrowGeometry(from: number, to: number, columns: number, rows: number, reversed = false): HintArrowGeometry | null {
  const total = columns * rows;
  if (!Number.isInteger(columns) || !Number.isInteger(rows) || columns <= 0 || rows <= 0
    || !Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0 || from >= total || to >= total || from === to) return null;

  function center(index: number): HintArrowPoint {
    const displayed = reversed ? total - 1 - index : index;
    return { x: displayed % columns + .5, y: Math.floor(displayed / columns) + .5 };
  }
  const source = center(from), target = center(to);
  const dx = target.x - source.x, dy = target.y - source.y;
  const distance = Math.hypot(dx, dy);
  const unit = { x: dx / distance, y: dy / distance };
  const normal = { x: -unit.y, y: unit.x };
  const start = { x: source.x + unit.x * .34, y: source.y + unit.y * .34 };
  const end = { x: target.x - unit.x * .34, y: target.y - unit.y * .34 };
  // Even adjacent squares need room for a visible shaft behind the arrowhead.
  const headLength = Math.min(.28, (distance - .68) * .7);
  const neck = { x: end.x - unit.x * headLength, y: end.y - unit.y * headLength };
  function offset(point: HintArrowPoint, width: number): HintArrowPoint {
    return { x: point.x + normal.x * width, y: point.y + normal.y * width };
  }
  return {
    start,
    end,
    points: [offset(start, .04), offset(neck, .04), offset(neck, .15), end, offset(neck, -.15), offset(neck, -.04), offset(start, -.04)],
  };
}
