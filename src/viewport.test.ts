import { describe, expect, it } from "vitest";

import { edgeNudge, keptView, TSUNAGI_EDGE_STEP, TSUNAGI_FITTED, TSUNAGI_MOST_ZOOM, zoomedAbout } from "./viewport.ts";

describe("the view of a big board", () => {
  it("never leaves a gap between the board's edge and the box's, or zooms past three times", () => {
    expect(keptView({ zoom: 5, x: 40, y: 40 }, 300)).toEqual({ zoom: TSUNAGI_MOST_ZOOM, x: 0, y: 0 });
    expect(keptView({ zoom: 2, x: -900, y: -900 }, 300)).toEqual({ zoom: 2, x: -300, y: -300 });
    expect(keptView({ zoom: 0.4, x: -5, y: -5 }, 300)).toEqual(TSUNAGI_FITTED);
  });

  it("zooms about a point, which stays over the same spot of the board", () => {
    const view = zoomedAbout(TSUNAGI_FITTED, 2, 150, 150, 300);
    expect(view.zoom).toBe(2);
    // The board's middle is still under the box's middle.
    expect(150 * view.zoom + view.x).toBeCloseTo(150, 5);
    expect(zoomedAbout(view, 0.5, 150, 150, 300)).toEqual(TSUNAGI_FITTED);
  });

  it("moves toward the edge a finger is near, and not at all in the middle", () => {
    const box = { left: 0, top: 0, right: 300, bottom: 300 };
    expect(edgeNudge(10, 150, box)).toEqual({ dx: TSUNAGI_EDGE_STEP, dy: 0 });
    expect(edgeNudge(290, 295, box)).toEqual({ dx: -TSUNAGI_EDGE_STEP, dy: -TSUNAGI_EDGE_STEP });
    expect(edgeNudge(150, 150, box)).toEqual({ dx: 0, dy: 0 });
  });
});
