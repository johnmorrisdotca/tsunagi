import { CELL_BLOCKED, CELL_BRIDGE, CELL_EMPTY, decodeLayout, LINK_BLOCKED, LINK_BRIDGE, PAIR_LETTERS } from "./code.ts";
import { bridgesOf, stepTable, type Step } from "./steps.ts";

/**
 * Whether an answer joins a Tsunagi layout: the check a page makes to say
 * "solved" and a server makes before it trusts a solve. O(cells), no search.
 * It does not ask whether the layout is one of the levels: a site that pays
 * or ranks for a solve asks that first (`tsunagiLevelOf`).
 *
 * The answer must carry every stone's letter on its stone, `#` on every
 * blocked cell, `+` on every bridge, a letter on every other cell, and each
 * letter's cells must be one line from one of its stones to the other, stepping
 * as a line may (`steps.ts`: never through a wall, straight over a bridge): the
 * two stones with one step to a cell of their letter each, every cell between
 * with two, all of them joined. A line that ran beside itself would show a cell
 * with three, and is refused; no level's one answer does that, which the level
 * test proves. Each bridge must be crossed straight across by one line and
 * straight down by a different one, and each waypoint passed by its own line.
 * Each portal's two cells belong to one line, which goes in at one and out of
 * the other exactly once (a step `steps.ts` gives with the portal in `through`).
 */
/** What a check says: joined, or the first reason it is not. */
export type TsunagiCheck = { ok: true } | { ok: false; reason: string };

export function checkTsunagiAnswer(size: number, givens: string, answer: string): TsunagiCheck {
  const layout = decodeLayout(givens, size);
  if (layout === null) return { ok: false, reason: "the givens are not a Tsunagi layout" };
  if (typeof answer !== "string" || answer.length !== size * size) return { ok: false, reason: "not a grid of that size" };
  const steps = stepTable(layout);
  const pairs = layout.ends.length;
  const owners: number[] = [];
  for (let at = 0; at < answer.length; at += 1) {
    const char = answer[at]!;
    const cell = layout.cells[at]!;
    if (cell === CELL_BLOCKED || cell === CELL_BRIDGE) {
      if (char !== (cell === CELL_BLOCKED ? LINK_BLOCKED : LINK_BRIDGE)) return { ok: false, reason: cell === CELL_BLOCKED ? "a blocked cell is used" : "a bridge is not a bridge" };
      owners.push(cell);
      continue;
    }
    const pair = PAIR_LETTERS.indexOf(char);
    if (pair === -1 || pair >= pairs) return { ok: false, reason: "a cell has no line through it" };
    if (cell !== CELL_EMPTY && cell !== pair) return { ok: false, reason: "a stone is moved" };
    const waypoint = layout.waypoints.get(at);
    if (waypoint !== undefined && waypoint !== pair) return { ok: false, reason: "a waypoint is passed by another line" };
    owners.push(pair);
  }
  // Each bridge: one line straight across it, a different one straight down.
  for (const bridge of bridgesOf(layout)) {
    const acrossPair = owners[bridge - 1];
    const downPair = owners[bridge - size];
    if (acrossPair !== owners[bridge + 1] || downPair !== owners[bridge + size] || acrossPair === downPair) return { ok: false, reason: "a bridge is not crossed both ways by two lines" };
  }
  // How many steps, either way, went through each portal (by the cell it is stepped into): a portal is gone through once, which is two steps counted from either end.
  const wentThrough = new Map<number, number>();
  // A portal's two cells are one line's.
  for (const [a, b] of layout.portalPairs) if (owners[a] !== owners[b]) return { ok: false, reason: "a portal's two cells are on different lines" };
  for (let pair = 0; pair < pairs; pair += 1) {
    const from: number = layout.ends[pair]![0];
    const to: number = layout.ends[pair]![1];
    const mine = owners.flatMap((owner, at) => (owner === pair ? [at] : []));
    /** Whether a step joins the line: its far end is the line's, and so are the portal cells it goes through. */
    const joins = (step: Step) => owners[step.to] === pair && step.through.every((cell) => owners[cell] === pair);
    for (const at of mine) {
      // A portal cell is gone through, never stood on: it has no steps, and its line is checked by the steps that go through it.
      if (layout.portals.has(at)) continue;
      const same = steps[at]!.filter(joins).length;
      for (const step of steps[at]!) if (step.through.length > 0 && joins(step)) wentThrough.set(step.through[0]!, (wentThrough.get(step.through[0]!) ?? 0) + 1);
      const want = at === from || at === to ? 1 : 2;
      if (same !== want) return { ok: false, reason: `line ${PAIR_LETTERS[pair]} is not one line` };
    }
    // Joined: walk from one stone and reach every cell of the line, ending on the other.
    const seen = new Set<number>([from]);
    const queue: number[] = [from];
    while (queue.length > 0) {
      const cell: number = queue.pop()!;
      for (const step of steps[cell]!) {
        if (joins(step) && !seen.has(step.to)) {
          seen.add(step.to);
          for (const through of step.through) seen.add(through);
          queue.push(step.to);
        }
      }
    }
    if (!seen.has(to) || seen.size !== mine.length) return { ok: false, reason: `line ${PAIR_LETTERS[pair]} does not join its stones` };
  }
  // A portal is gone through by exactly one step of its line, and so is not a way round for a second one.
  for (const [a, b] of layout.portalPairs) if ((wentThrough.get(a) ?? 0) + (wentThrough.get(b) ?? 0) !== 2) return { ok: false, reason: "a portal is not gone through exactly once" };
  return { ok: true };
}
