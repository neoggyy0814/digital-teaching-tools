import assert from 'node:assert/strict'
import test from 'node:test'
import {
  clampPieceOffset,
  fitViewportToBounds,
  gridIntervals,
  nearestLegalGridOffset,
  projectWorldPointToViewportPercent,
  resizeRectangleFromGesture,
  viewportViewBox,
  worldBoundsForPieces,
  zoomViewportAt,
} from './workspace.js'

const board = { width: 1000, height: 600 }
const viewport = { center: { x: 50, y: 50 }, zoom: 1 }

test('zoom changes only the world-to-screen viewport and preserves its pointer focus', () => {
  const before = viewportViewBox(viewport, board, 50)
  const focusRatio = { x: 0.25, y: 0.75 }
  const focus = { x: before.x + before.width * focusRatio.x, y: before.y + before.height * focusRatio.y }
  const zoomed = zoomViewportAt(viewport, 2, focus, focusRatio, board, 50)
  const after = viewportViewBox(zoomed, board, 50)
  assert.ok(Math.abs(focus.x - (after.x + after.width * focusRatio.x)) < 1e-7)
  assert.ok(Math.abs(focus.y - (after.y + after.height * focusRatio.y)) < 1e-7)
})

test('piece bounds and world clamping use mathematical coordinates', () => {
  const piece = { vertices: [{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 5, y: 3 }, { x: 0, y: 3 }], offset: { x: 0, y: 0 } }
  assert.deepEqual(worldBoundsForPieces([piece], { x: 48, y: 49 }), { minX: 48, maxX: 53, minY: 49, maxY: 52 })
  assert.deepEqual(clampPieceOffset(piece, { x: -80, y: 80 }, { x: 48, y: 49 }), { x: -48, y: 48 })
})

test('auto-fit zooms out only when bounds leave the safe viewport', () => {
  const unchanged = fitViewportToBounds(viewport, { minX: 46, maxX: 54, minY: 47, maxY: 53 }, board, 50)
  assert.equal(unchanged, viewport)
  const fitted = fitViewportToBounds(viewport, { minX: 30, maxX: 70, minY: 35, maxY: 65 }, board, 50)
  assert.ok(fitted.zoom < viewport.zoom)
  assert.deepEqual(fitted.center, { x: 50, y: 50 })
})

test('resize completion recenters visible bounds and zooms out only when required', () => {
  const offsetViewport = { center: { x: 48, y: 50 }, zoom: 1 }
  const centered = fitViewportToBounds(
    offsetViewport,
    { minX: 46, maxX: 54, minY: 47, maxY: 53 },
    board,
    50,
    52,
    { recenter: true },
  )
  assert.equal(centered.zoom, 1)
  assert.deepEqual(centered.center, { x: 50, y: 50 })

  const fitted = fitViewportToBounds(
    viewport,
    { minX: 48, maxX: 68, minY: 32, maxY: 52 },
    board,
    50,
    52,
    { recenter: true },
  )
  assert.ok(fitted.zoom < viewport.zoom)
  assert.deepEqual(fitted.center, { x: 58, y: 42 })
})

test('grid density becomes coarser as screen pixels per unit decrease', () => {
  assert.deepEqual(gridIntervals(40), { minor: 1, major: 5 })
  assert.deepEqual(gridIntervals(15), { minor: 5, major: 10 })
  assert.deepEqual(gridIntervals(6), { minor: 10, major: 20 })
})

test('grid snap returns the nearest legal integer translation', () => {
  const [first, second] = [
    { id: 'first', vertices: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }], offset: { x: 0, y: 0 } },
    { id: 'second', vertices: [{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 1 }, { x: 1, y: 1 }], offset: { x: 0.4, y: 1.4 } },
  ]
  assert.deepEqual(nearestLegalGridOffset(first, [first], { x: 48, y: 49 }), { x: 0, y: 0 })
  assert.deepEqual(nearestLegalGridOffset(second, [first, second], { x: 48, y: 49 }), { x: 0, y: 1 })
})

test('resize maps a fixed CSS-pixel delta to discrete integer dimensions', () => {
  const initial = { width: 5, height: 3, origin: { x: 48, y: 49 } }
  assert.deepEqual(
    resizeRectangleFromGesture(initial, { x: 100, y: 100 }, { x: 142, y: 100 }),
    { width: 6, height: 3, origin: { x: 48, y: 49 } },
  )
  assert.deepEqual(
    resizeRectangleFromGesture(initial, { x: 100, y: 100 }, { x: 100, y: 58 }),
    { width: 5, height: 4, origin: { x: 48, y: 48 } },
  )
  assert.deepEqual(
    resizeRectangleFromGesture(initial, { x: 100, y: 100 }, { x: 120, y: 80 }),
    { width: 5, height: 3, origin: { x: 48, y: 49 } },
  )
  assert.deepEqual(
    resizeRectangleFromGesture(initial, { x: 100, y: 100 }, { x: 1100, y: -900 }),
    { width: 20, height: 20, origin: { x: 48, y: 32 } },
  )
  assert.deepEqual(
    resizeRectangleFromGesture(
      { width: 20, height: 20, origin: { x: 48, y: 32 } },
      { x: 100, y: 100 },
      { x: -1000, y: 1100 },
    ),
    { width: 1, height: 1, origin: { x: 48, y: 51 } },
  )
})

test('rectangle teaching sizes stay integral and produce centered visible viewport targets', () => {
  for (const [width, height] of [[5, 3], [8, 6], [10, 10], [15, 10], [20, 20]]) {
    const bottom = 52
    const bounds = { minX: 48, maxX: 48 + width, minY: bottom - height, maxY: bottom }
    const target = fitViewportToBounds(viewport, bounds, board, 50, 52, { recenter: true })
    const visible = viewportViewBox(target, board, 50)
    assert.equal(Number.isInteger(width) && Number.isInteger(height), true)
    assert.equal(width * height, (bounds.maxX - bounds.minX) * (bounds.maxY - bounds.minY))
    assert.deepEqual(target.center, {
      x: (bounds.minX + bounds.maxX) / 2,
      y: (bounds.minY + bounds.maxY) / 2,
    })
    assert.ok(bounds.minX >= visible.x && bounds.maxX <= visible.x + visible.width)
    assert.ok(bounds.minY >= visible.y && bounds.maxY <= visible.y + visible.height)
    assert.ok(target.zoom <= viewport.zoom)
  }
})

test('screen-space controls project a world point into viewport percentages', () => {
  const viewBox = { x: 40, y: 45, width: 20, height: 10 }
  assert.deepEqual(projectWorldPointToViewportPercent({ x: 50, y: 50 }, viewBox), { left: 50, top: 50 })
  assert.deepEqual(projectWorldPointToViewportPercent({ x: 60, y: 45 }, viewBox), { left: 100, top: 0 })
})
