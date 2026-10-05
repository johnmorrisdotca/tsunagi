import { CELL_BRIDGE, type LinkLayout, layoutNeighbours, portalExit } from "./code.ts";

/**
 * WHERE A LINE MAY GO NEXT, on one board: the rules of a single step, which
 * the solver, the check, the drawing and the answer's lines all read, so a
 * bridge or a wall means the same thing everywhere.
 *
 *  - Across an open edge (no wall) to the next cell.
 *  - Onto a BRIDGE only to go straight over it: into the cell beyond, the same
 *    way on, never turning. Going across uses the bridge's across slot, going
 *    down its down slot; the two are crossed by two different lines.
 *  - Into a PORTAL cell, and so out of the other one the same way on: the step
 *    is to the cell beyond the far portal, and the line takes both portal
 *    cells on the way (`through`, in the order it passes them). A portal cell
 *    itself has no steps and is never where a step ends; where the cell beyond
 *    the far portal is blocked, off the board or across a wall, that way into
 *    the portal is no step at all.
 *
 * Imports carry their `.ts` so the level script can run this under plain node.
 */
export type Step = {
  /** The cell the line reaches. */
  to: number;
  /** The bridge gone over on the way, or -1 for a plain step. */
  over: number;
  /** Over a bridge: whether across (left or right) rather than down (up or down). */
  across: boolean;
  /** The portal cells gone through on the way, in order: the one stepped into, then its other. Empty for a step that goes through none. */
  through: readonly number[];
};

const NO_CELLS: readonly number[] = [];

/** Every cell's steps on a board, worked out once. */
export function stepTable(layout: LinkLayout): Step[][] {
  const { size, cells } = layout;
  const around = layoutNeighbours(layout);
  return around.map((next, at) => {
    // A portal cell is never stood on: lines go in at one and come out of the other.
    if (layout.portals.has(at)) return [];
    return next.flatMap((cell): Step[] => {
      const partner = layout.portals.get(cell);
      if (partner !== undefined) {
        const out = portalExit(layout, at, cell);
        if (out === -1 || out === at) return [];
        return [{ to: out, over: -1, across: false, through: [cell, partner] }];
      }
      if (cells[cell] !== CELL_BRIDGE) return [{ to: cell, over: -1, across: false, through: NO_CELLS }];
      if (cells[at] === CELL_BRIDGE) return [];
      const by = cell - at;
      const beyond = cell + by;
      const across = Math.abs(by) === 1;
      // Straight on, in the same row or column: a bridge is never at an edge, so the cell beyond is on the board.
      if (beyond < 0 || beyond >= size * size || (across && Math.floor(beyond / size) !== Math.floor(cell / size))) return [];
      if (!around[cell]!.includes(beyond)) return [];
      return [{ to: beyond, over: cell, across, through: NO_CELLS }];
    });
  });
}

/** The bridges of a board. */
export function bridgesOf(layout: LinkLayout): number[] {
  return layout.cells.flatMap((cell, at) => (cell === CELL_BRIDGE ? [at] : []));
}
