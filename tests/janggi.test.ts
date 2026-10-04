import { describe, expect, it } from 'vitest';
import { decodePieceMove, encodePieceMove, JANGGI_PASS } from '../shared/game/pieces';
import type { AiDifficulty, Color, GameSettings, GameState, JanggiFormation, Piece, PieceKind } from '../shared/game/types';
import { chooseDifficultyMove } from '../shared/games/janggi/ai';
import { JANGGI_CELL_COUNT, janggiCoordinate } from '../shared/games/janggi/board';
import { applyMove, generalsFace, initialState, isInCheck, legalMoves, positionKey } from '../shared/games/janggi/rules';

const at = (row: number, col: number): number => row * 9 + col;
type Placement = readonly [row: number, col: number, color: Color, kind: PieceKind];
function position(placements: readonly Placement[] = [], turn: Color = 'black'): GameState {
  const state = initialState('fixture');
  const pieces = Array<Piece | null>(90).fill(null);
  pieces[at(8, 3)] = { color: 'black', kind: 'general' };
  pieces[at(1, 5)] = { color: 'white', kind: 'general' };
  for (const [row, col, color, kind] of placements) {
    if (kind === 'general') {
      const previous = pieces.findIndex(piece => piece?.kind === 'general' && piece.color === color);
      if (previous >= 0) pieces[previous] = null;
    }
    pieces[at(row, col)] = { color, kind };
  }
  return { ...state, turn, pieces, board: pieces.map(piece => piece?.color ?? null), check: isInCheck(pieces, turn) ? turn : null,
    janggi: { bikjang: null, consecutivePasses: 0, positionHistory: [positionKey(pieces, turn, null)] } };
}
function targets(state: GameState, row: number, col: number): number[] {
  return legalMoves(state).flatMap(code => {
    const move = decodePieceMove(code);
    return move?.from === at(row, col) ? [move.to] : [];
  });
}
function play(state: GameState, fromRow: number, fromCol: number, toRow: number, toCol: number): GameState {
  const next = applyMove(state, encodePieceMove(at(fromRow, fromCol), at(toRow, toCol)));
  expect(next).not.toBeNull();
  return next!;
}

describe('장기 초기 포진', () => {
  it('9×10 교차점에 초·한 각각 16개를 배치하고 초가 먼저 둔다', () => {
    const state = initialState('start');
    expect(state.board).toHaveLength(JANGGI_CELL_COUNT);
    expect(state.board.filter(side => side === 'black')).toHaveLength(16);
    expect(state.board.filter(side => side === 'white')).toHaveLength(16);
    expect(state.pieces?.[at(8, 4)]).toEqual({ color: 'black', kind: 'general' });
    expect(state.pieces?.[at(1, 4)]).toEqual({ color: 'white', kind: 'general' });
    expect(state.turn).toBe('black');
    expect(state.check).toBeNull();
    expect(legalMoves(state)).toHaveLength(32);
    expect(janggiCoordinate(89)).toBe('I10');
  });
  it.each<[JanggiFormation, PieceKind[]]>([
    ['outer', ['horse', 'elephant', 'elephant', 'horse']],
    ['inner', ['elephant', 'horse', 'horse', 'elephant']],
    ['left', ['horse', 'elephant', 'horse', 'elephant']],
    ['right', ['elephant', 'horse', 'elephant', 'horse']],
  ])('%s 포진은 각 플레이어가 보는 방향을 따른다', (formation, expected) => {
    const settings: GameSettings = { mode: 'local', seconds: 0, undoLimit: 1, blackCharacter: 'jannabi', janggiBlackFormation: formation, janggiWhiteFormation: formation };
    const state = initialState('formation', settings);
    expect([1, 2, 6, 7].map(col => state.pieces?.[at(9, col)]?.kind)).toEqual(expected);
    expect([1, 2, 6, 7].map(col => state.pieces?.[at(0, col)]?.kind)).toEqual([...expected].reverse());
  });
});

describe('장기 기물 행마', () => {
  it.each<PieceKind>(['general', 'guard'])('궁성 중앙의 %s는 표시된 선을 따라 여덟 방향으로 간다', kind => {
    const state = position([[8, 4, 'black', kind]]);
    const moves = targets(state, 8, 4);
    expect(moves).toContain(at(7, 3));
    expect(moves).toContain(at(7, 5));
    expect(moves).toContain(at(9, 3));
    expect(moves).toContain(at(9, 5));
    expect(moves).not.toContain(at(8, 6));
  });
  it('궁성 가장자리의 사는 선이 없는 대각선과 궁성 밖으로 갈 수 없다', () => {
    const moves = targets(position([[7, 4, 'black', 'guard']]), 7, 4);
    expect(moves).toContain(at(8, 4));
    expect(moves).not.toContain(at(8, 3));
    expect(moves).not.toContain(at(8, 5));
    expect(moves).not.toContain(at(6, 4));
  });
  it('차는 첫 상대 기물을 잡고 멈추며 아군과 그 너머로는 갈 수 없다', () => {
    const moves = targets(position([[5, 4, 'black', 'rook'], [3, 4, 'white', 'soldier'], [5, 6, 'black', 'soldier']]), 5, 4);
    expect(moves).toContain(at(3, 4));
    expect(moves).not.toContain(at(2, 4));
    expect(moves).toContain(at(5, 5));
    expect(moves).not.toContain(at(5, 6));
    expect(moves).not.toContain(at(5, 7));
  });
  it('차는 궁성 대각선을 직진하며 중간 기물을 넘지 못한다', () => {
    expect(targets(position([[2, 3, 'black', 'rook']]), 2, 3)).toEqual(expect.arrayContaining([at(1, 4), at(0, 5)]));
    const blocked = targets(position([[2, 3, 'black', 'rook'], [1, 4, 'black', 'guard']]), 2, 3);
    expect(blocked).not.toContain(at(0, 5));
    expect(blocked).not.toContain(at(1, 2));
  });
  it('포는 빈 곳으로 갈 때도 포가 아닌 다리가 정확히 하나 필요하다', () => {
    expect(targets(position([[5, 0, 'black', 'cannon']]), 5, 0)).toEqual([]);
    const moves = targets(position([[5, 0, 'black', 'cannon'], [5, 2, 'black', 'soldier'], [5, 5, 'white', 'rook']]), 5, 0);
    expect(moves).toEqual(expect.arrayContaining([at(5, 3), at(5, 4), at(5, 5)]));
    expect(moves).not.toContain(at(5, 1));
    expect(moves).not.toContain(at(5, 2));
    expect(moves).not.toContain(at(5, 6));
  });
  it('포는 상대 기물을 다리로 삼을 수 있다', () => {
    const moves = targets(position([[5, 0, 'black', 'cannon'], [5, 2, 'white', 'horse']]), 5, 0);
    expect(moves).toContain(at(5, 3));
    expect(moves).not.toContain(at(5, 2));
  });
  it('포는 포를 넘거나 잡지 못하고 두 번째 다리를 넘지 못한다', () => {
    expect(targets(position([[5, 0, 'black', 'cannon'], [5, 2, 'white', 'cannon']]), 5, 0)).not.toContain(at(5, 3));
    const moves = targets(position([[5, 0, 'black', 'cannon'], [5, 2, 'black', 'soldier'], [5, 5, 'white', 'cannon']]), 5, 0);
    expect(moves).toContain(at(5, 4));
    expect(moves).not.toContain(at(5, 5));
    expect(moves).not.toContain(at(5, 6));
  });
  it('포는 궁성 중앙의 다리를 넘어 반대 꼭짓점으로 간다', () => {
    const state = position([[2, 3, 'black', 'cannon'], [1, 4, 'white', 'guard']]);
    expect(targets(state, 2, 3)).toContain(at(0, 5));
    expect(targets(state, 2, 3)).not.toContain(at(1, 4));
    expect(targets(position([[2, 3, 'black', 'cannon'], [1, 4, 'white', 'cannon']]), 2, 3)).not.toContain(at(0, 5));
  });
  it('마는 직선 한 칸의 멱이 막히면 그 방향의 두 목적지가 막힌다', () => {
    const open = targets(position([[5, 4, 'black', 'horse']]), 5, 4);
    expect(open).toHaveLength(8);
    expect(open).toEqual(expect.arrayContaining([at(3, 3), at(3, 5)]));
    const blocked = targets(position([[5, 4, 'black', 'horse'], [4, 4, 'white', 'soldier']]), 5, 4);
    expect(blocked).not.toContain(at(3, 3));
    expect(blocked).not.toContain(at(3, 5));
    expect(blocked).toContain(at(4, 6));
  });
  it('상은 직선 한 칸과 두 번째 경유점 모두 비어 있어야 한다', () => {
    const open = targets(position([[5, 4, 'black', 'elephant']]), 5, 4);
    expect(open).toHaveLength(8);
    expect(open).toContain(at(2, 2));
    expect(open).toContain(at(2, 6));
    const first = targets(position([[5, 4, 'black', 'elephant'], [4, 4, 'black', 'soldier']]), 5, 4);
    expect(first).not.toContain(at(2, 2));
    expect(first).not.toContain(at(2, 6));
    const second = targets(position([[5, 4, 'black', 'elephant'], [3, 3, 'white', 'soldier']]), 5, 4);
    expect(second).not.toContain(at(2, 2));
    expect(second).toContain(at(2, 6));
  });
  it.each<Color>(['black', 'white'])('%s 졸·병은 처음부터 전진·좌우만 이동한다', color => {
    const row = color === 'black' ? 6 : 3;
    const forward = color === 'black' ? -1 : 1;
    expect(targets(position([[row, 4, color, 'soldier']], color), row, 4).sort()).toEqual([at(row + forward, 4), at(row, 3), at(row, 5)].sort());
  });
  it('졸·병은 상대 궁성의 전진 대각선만 이용한다', () => {
    const black = targets(position([[2, 3, 'black', 'soldier']]), 2, 3);
    expect(black).toContain(at(1, 4));
    expect(black).not.toContain(at(3, 4));
    expect(targets(position([[2, 4, 'black', 'soldier']]), 2, 4)).not.toContain(at(1, 3));
    expect(targets(position([[7, 3, 'white', 'soldier']], 'white'), 7, 3)).toContain(at(8, 4));
    expect(targets(position([[7, 3, 'black', 'soldier']]), 7, 3)).not.toContain(at(8, 4));
  });
});

describe('장군·빅장·종료', () => {
  it('자기 궁을 노출시키는 이동과 공격받는 지점으로의 궁 이동을 막는다', () => {
    const pinned = position([[8, 5, 'black', 'rook'], [8, 8, 'white', 'rook']]);
    expect(targets(pinned, 8, 5)).not.toContain(at(7, 5));
    expect(targets(pinned, 8, 5)).toContain(at(8, 6));
    expect(targets(pinned, 8, 5)).toContain(at(8, 8));
    const defended = position([[8, 4, 'black', 'general'], [7, 4, 'white', 'soldier'], [7, 8, 'white', 'rook']]);
    expect(targets(defended, 8, 4)).not.toContain(at(7, 4));
  });
  it('장군일 때 한 수 쉼이나 다른 기물의 무관한 이동은 허용하지 않는다', () => {
    const checked = position([[8, 8, 'white', 'rook'], [6, 0, 'black', 'soldier']]);
    expect(checked.check).toBe('black');
    expect(legalMoves(checked)).not.toContain(JANGGI_PASS);
    expect(targets(checked, 6, 0)).toEqual([]);
    expect(applyMove(checked, JANGGI_PASS)).toBeNull();
  });
  it('궁은 잡는 대신 외통수 시점에 게임을 끝낸다', () => {
    const state = position([[0, 4, 'white', 'general'], [1, 3, 'black', 'rook'], [1, 5, 'black', 'rook'], [2, 0, 'black', 'rook']]);
    const next = play(state, 2, 0, 2, 4);
    expect(next.result).toEqual({ winner: 'black', reason: 'checkmate' });
    expect(next.check).toBe('white');
    expect(next.pieces?.[at(0, 4)]?.kind).toBe('general');
    expect(legalMoves(next)).toEqual([]);
    const attacking = position([[0, 4, 'white', 'general'], [2, 4, 'black', 'rook']]);
    expect(targets(attacking, 2, 4)).not.toContain(at(0, 4));
  });
  it('궁끼리 마주보는 수는 장군이 아닌 빅장을 제안한다', () => {
    const state = position([[8, 4, 'black', 'general'], [1, 4, 'white', 'general'], [5, 4, 'black', 'rook'], [3, 0, 'white', 'rook']]);
    const offered = play(state, 5, 4, 5, 3);
    expect(generalsFace(offered.pieces!)).toBe(true);
    expect(offered.check).toBeNull();
    expect(offered.janggi?.bikjang).toBe('black');
    expect(targets(offered, 3, 0)).not.toContain(at(3, 1));
    expect(targets(offered, 3, 0)).toContain(at(3, 4));
    expect(play(offered, 1, 4, 1, 5).janggi?.bikjang).toBeNull();
    expect(play(offered, 3, 0, 3, 4).janggi?.bikjang).toBeNull();
    expect(applyMove(offered, JANGGI_PASS)?.result).toEqual({ winner: null, reason: 'bikjang' });
  });
  it('빅장 상태여도 장군을 받은 쪽은 쉼으로 무승부를 수락할 수 없다', () => {
    const checked = position([[8, 4, 'black', 'general'], [1, 4, 'white', 'general'], [1, 0, 'black', 'rook']], 'white');
    checked.janggi!.bikjang = 'black';
    expect(checked.check).toBe('white');
    expect(legalMoves(checked)).not.toContain(JANGGI_PASS);
  });
  it('서로 연속 한 수 쉼은 무승부이며 일반 이동은 연속 쉼을 초기화한다', () => {
    const state = initialState('pass');
    const passed = applyMove(state, JANGGI_PASS)!;
    expect(passed.turn).toBe('white');
    expect(passed.passed).toBe('black');
    expect(passed.board).toEqual(state.board);
    expect(passed.revision).toBe(1);
    expect(applyMove(passed, JANGGI_PASS)?.result).toEqual({ winner: null, reason: 'mutualPass' });
    expect(play(passed, 3, 0, 4, 0).janggi?.consecutivePasses).toBe(0);
  });
  it('차례와 기물 배치가 세 번째 반복되면 무승부로 끝난다', () => {
    let state = position([[5, 0, 'black', 'rook'], [4, 8, 'white', 'rook']]);
    for (let cycle = 0; cycle < 2; cycle++) {
      state = play(state, 5, 0, 5, 1);
      state = play(state, 4, 8, 4, 7);
      state = play(state, 5, 1, 5, 0);
      state = play(state, 4, 7, 4, 8);
      expect(state.result).toEqual(cycle === 1 ? { winner: null, reason: 'repetition' } : null);
    }
  });
  it('잘못된 수·프로모션 코드는 거부하고 원본 국면을 변경하지 않는다', () => {
    const state = initialState('immutable');
    const before = JSON.stringify(state);
    expect(applyMove(state, -1)).toBeNull();
    expect(applyMove(state, encodePieceMove(at(6, 0), at(5, 0), 'knight'))).toBeNull();
    const moved = play(state, 6, 0, 5, 0);
    expect(moved.lastFrom).toBe(at(6, 0));
    expect(moved.lastMove).toBe(at(5, 0));
    expect(moved.board[at(5, 0)]).toBe('black');
    expect(JSON.stringify(state)).toBe(before);
  });
  it('궁이 없거나 중복된 잘못된 스냅샷에는 착수와 쉼을 허용하지 않는다', () => {
    const state = position();
    state.pieces![at(1, 5)] = null;
    expect(legalMoves(state)).toEqual([]);
    expect(applyMove(state, JANGGI_PASS)).toBeNull();
    expect(chooseDifficultyMove(state, 3)).toBeNull();
    state.pieces = Array<Piece | null>(90).fill(null);
    expect(legalMoves(state)).toEqual([]);
    const duplicate = position();
    duplicate.pieces![at(9, 4)] = { color: 'black', kind: 'general' };
    expect(legalMoves(duplicate)).toEqual([]);
  });
});

describe('장기 AI', () => {
  it.each<AiDifficulty>([1, 2, 3, 4, 5])('%i단계는 원본을 유지하고 합법적인 수를 반환한다', difficulty => {
    const state = initialState('ai');
    const before = JSON.stringify(state);
    const move = chooseDifficultyMove(state, difficulty);
    expect(legalMoves(state)).toContain(move);
    expect(applyMove(state, move!)).not.toBeNull();
    expect(JSON.stringify(state)).toBe(before);
  });
  it('수색 가능한 단계는 즉시 외통수를 선택한다', () => {
    const state = position([[0, 4, 'white', 'general'], [1, 3, 'black', 'rook'], [1, 5, 'black', 'rook'], [2, 0, 'black', 'rook']]);
    const move = chooseDifficultyMove(state, 3)!;
    expect(applyMove(state, move)?.result).toEqual({ winner: 'black', reason: 'checkmate' });
  });
  it('종료된 대국에는 수를 반환하지 않는다', () => {
    const state = initialState('ended');
    state.result = { winner: null, reason: 'mutualPass' };
    expect(chooseDifficultyMove(state, 5)).toBeNull();
  });
});
