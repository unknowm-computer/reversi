import { opposite } from '../../game/state.js';
import type { AiDifficulty, BattleshipPosition, Color, GameState, Shot } from '../../game/types.js';

export const SIZE = 10;
export const SUBMARINE_SLOT = 3;
export const lengths = [5, 4, 3, 3, 2];
const cells = Array.from({ length: SIZE * SIZE }, (_, index) => index);

export function shipCells(start: number, length: number, vertical: boolean): number[] {
  if (!Number.isInteger(start) || start < 0 || start >= SIZE * SIZE) return [];
  const available = SIZE - (vertical ? Math.floor(start / SIZE) : start % SIZE);
  if (length > available) return [];
  return Array.from({ length }, (_, i) => start + i * (vertical ? SIZE : 1));
}

export function validFleet(fleet: number[][]): boolean {
  if (fleet.length !== lengths.length || new Set(fleet.flat()).size !== fleet.flat().length) return false;
  return fleet.every((ship, i) => {
    if (ship.length !== lengths[i]) return false;
    const expected = shipCells(ship[0], ship.length, ship[1] - ship[0] === SIZE);
    return ship.every((cell, j) => cell === expected[j]);
  });
}

export function createFleet(): number[][] {
  const occupied = new Set<number>();
  return lengths.map(length => {
    const options: number[][] = [];
    for (const start of cells) {
      for (const step of [1, SIZE]) {
        const ship = shipCells(start, length, step === SIZE);
        if (ship.length && ship.every(index => !occupied.has(index))) options.push(ship);
      }
    }
    const ship = options[Math.floor(Math.random() * options.length)];
    ship.forEach(index => occupied.add(index));
    return ship;
  });
}

export function initialState(gameId: string): GameState {
  const sea = () => Array<Shot>(cells.length).fill(null);
  return { gameType: 'battleship', gameId, revision: 0, turn: 'black', board: Array(cells.length).fill(null),
    lastMove: null, flipped: [], passed: null, winningLine: [], result: null,
    battleship: { fleets: { black: createFleet(), white: createFleet() }, shots: { black: sea(), white: sea() } } };
}

export function legalMoves(state: GameState): number[] {
  return cells.filter(i => state.battleship?.shots[state.turn][i] === null);
}

export function applyMove(state: GameState, index: number): GameState | null {
  const sea = state.battleship;
  const actor = state.turn;
  const defender = opposite(actor);
  if (!sea || state.result || sea.shots[actor][index] !== null || sea.fleets[defender].length !== lengths.length) return null;
  const shots = [...sea.shots[actor]];
  const ship = sea.fleets[defender].find(ship => ship.includes(index));
  shots[index] = ship ? 'hit' : 'miss';
  const sunk = ship !== undefined && ship.every(i => shots[i] === 'hit');
  if (sunk) ship.forEach(i => { shots[i] = 'sunk'; });
  const won = ship && sea.fleets[defender].every(parts => parts.every(i => shots[i] === 'sunk'));
  return { ...state, revision: state.revision + 1, turn: defender, lastMove: index,
    battleship: { ...sea,
      ...(sunk && ship === sea.fleets[defender][SUBMARINE_SLOT]
        ? { sunkSubmarines: { ...sea.sunkSubmarines, [defender]: ship[0] } } : {}),
      shots: { ...sea.shots, [actor]: shots } },
    result: won ? { reason: 'fleetSunk', winner: actor } : null };
}

export function sunkShips(sea: BattleshipPosition, attacker: Color): number[][] {
  return sea.fleets[opposite(attacker)].filter(ship => ship.every(i => sea.shots[attacker][i] === 'sunk'));
}

export function playerView(state: GameState, viewer: Color): GameState {
  const sea = state.battleship;
  if (!sea || state.result) return state;
  return { ...state, battleship: { ...sea, fleets: { ...sea.fleets, [opposite(viewer)]: sunkShips(sea, viewer) } } };
}

export function chooseMove(state: GameState, difficulty: AiDifficulty): number | null {
  if (state.result || !state.battleship) return null;
  const shots = state.battleship.shots[state.turn];
  let best = -1;
  let target: number | null = null;
  for (const index of legalMoves(state)) {
    let weight = Math.random();
    const row = Math.floor(index / SIZE);
    const col = index % SIZE;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = col + dx, y = row + dy;
      if (difficulty < 2 || x < 0 || x >= SIZE || y < 0 || y >= SIZE || shots[y * SIZE + x] !== 'hit') continue;
      weight += difficulty === 2 ? .6 : 2;
      const xx = x + dx, yy = y + dy;
      if (difficulty >= 4 && xx >= 0 && xx < SIZE && yy >= 0 && yy < SIZE && shots[yy * SIZE + xx] === 'hit') weight += 3;
    }
    if (difficulty === 5 && (row + col) % 2 === 0) weight += 1;
    if (weight > best) { best = weight; target = index; }
  }
  return target;
}
