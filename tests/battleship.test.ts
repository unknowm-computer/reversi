import { expect, it } from 'vitest';
import { applyMove, initialState, legalMoves } from '../shared/game/engine';
import { chooseMove, playerView, validFleet } from '../shared/games/battleship/rules';

it('creates straight fleets, resolves hits and sinks, and ends on the last ship', () => {
  let state = initialState('fleet', 'battleship');
  const fleet = state.battleship!.fleets.white;
  expect(fleet.map(ship => ship.length)).toEqual([5, 4, 3, 3, 2]);
  expect(new Set(fleet.flat()).size).toBe(17);
  for (const ship of fleet) {
    const step = ship[1] - ship[0];
    expect([1, 10]).toContain(step);
    if (step === 1) expect(Math.floor(ship[0] / 10)).toBe(Math.floor(ship.at(-1)! / 10));
    ship.forEach((cell, i) => expect(cell).toBe(ship[0] + i * step));
    for (const cell of ship) {
      state = applyMove(state, cell)!;
      expect(state.battleship!.shots.black[cell]).toBe(cell === ship.at(-1) ? 'sunk' : 'hit');
      if (cell !== fleet.at(-1)!.at(-1)) {
        expect(state.result).toBeNull();
        const ai = chooseMove(playerView(state, 'white'), 5)!;
        expect(legalMoves(state)).toContain(ai);
        state = applyMove(state, ai)!;
        expect(applyMove(state, cell)).toBeNull();
      }
    }
  }
  expect(state.result).toEqual({ winner: 'black', reason: 'fleetSunk' });
  expect(legalMoves(state)).toEqual([]);
  for (const viewer of ['black', 'white'] as const) {
    expect(playerView(state, viewer).battleship!.fleets).toEqual(state.battleship!.fleets);
  }
});


it('requires five straight, contiguous ships inside the sea without overlaps', () => {
  const ships = [[0, 1, 2, 3, 4], [15, 25, 35, 45], [70, 71, 72], [80, 81, 82], [98, 99]];
  expect(validFleet(ships)).toBe(true);
  for (const tail of [[9, 10], [99, 109], [0, 10], [36, 47], [50, 52], [], [50, 51, 52]]) {
    expect(validFleet([...ships.slice(0, 4), tail])).toBe(false);
  }
});

it('reveals a sunk ship without disclosing a touching ship that is only hit', () => {
  const state = initialState('adjacent', 'battleship');
  const sea = state.battleship!;
  sea.fleets.white = [[0, 1, 2, 3, 4], [10, 11, 12, 13], [20, 21, 22], [30, 31, 32], [40, 41]];
  sea.shots.black[0] = 'hit';
  for (const index of [10, 11, 12]) sea.shots.black[index] = 'hit';
  expect(playerView(state, 'black').battleship!.fleets.white).toEqual([]);
  const next = applyMove(state, 13)!;
  expect(playerView(next, 'black').battleship!.fleets.white).toEqual([[10, 11, 12, 13]]);
  expect(playerView(next, 'white').battleship!.fleets.white).toEqual(sea.fleets.white);
});

it('reveals the submarine identity only when that particular three-cell ship sinks', () => {
  const state = initialState('submarine', 'battleship');
  const sea = state.battleship!;
  const [surface, submarine] = sea.fleets.white.slice(2, 4);
  for (const ship of [surface, submarine]) {
    for (const cell of ship.slice(0, 2)) sea.shots.black[cell] = 'hit';
  }
  const surfaceSunk = applyMove(state, surface[2])!;
  expect(playerView(surfaceSunk, 'black').battleship!.sunkSubmarines).toBeUndefined();
  const submarineSunk = applyMove({ ...surfaceSunk, turn: 'black' }, submarine[2])!;
  expect(playerView(submarineSunk, 'black').battleship!.sunkSubmarines).toEqual({ white: submarine[0] });
});
