import assert from 'node:assert/strict'
import test from 'node:test'
import {
  centerComposition,
  centerCompositionOnGrid,
  createGridPieces,
  findSnap,
  polygonsOverlap,
  piecesAreConnected,
  piecesAreNonOverlapping,
  splitRectangle,
  totalPieceArea,
} from './geometry.js'

test('grid split creates width × height unit pieces', () => {
  ;[[2, 2], [3, 4], [5, 3]].forEach(([width, height]) => {
    const pieces = createGridPieces(width, height)
    assert.equal(pieces.length, width * height)
    assert.ok(pieces.every((piece) => piece.area === 1))
    assert.equal(totalPieceArea(pieces), width * height)
  })
})

test('diagonal grid-point cut creates real polygons and preserves area', () => {
  const pieces = splitRectangle(5, 3, [{ a: { x: 0, y: 0 }, b: { x: 5, y: 3 } }])
  assert.equal(pieces.length, 2)
  assert.equal(totalPieceArea(pieces), 15)
  assert.ok(pieces.every((piece) => piece.vertices.length >= 3 && piece.area > 0))
})

test('invalid dangling cut does not create an empty or fake piece', () => {
  const pieces = splitRectangle(5, 3, [{ a: { x: 2, y: 1 }, b: { x: 5, y: 1 } }])
  assert.equal(pieces.length, 1)
  assert.equal(totalPieceArea(pieces), 15)
})

test('two connected cuts can subdivide existing polygons', () => {
  const pieces = splitRectangle(4, 4, [
    { a: { x: 0, y: 2 }, b: { x: 4, y: 2 } },
    { a: { x: 2, y: 0 }, b: { x: 2, y: 4 } },
  ])
  assert.equal(pieces.length, 4)
  assert.equal(totalPieceArea(pieces), 16)
})

test('snap requires a shared edge and composition can be centered', () => {
  const pieces = createGridPieces(2, 1)
  const moved = pieces.map((piece, index) => index === 1
    ? { ...piece, offset: { x: 0.2, y: 0.08 } }
    : piece)
  const snap = findSnap(moved[1], moved)
  assert.ok(snap)
  const snapped = moved.map((piece) => piece.id === moved[1].id
    ? { ...piece, offset: { x: piece.offset.x + snap.x, y: piece.offset.y + snap.y } }
    : piece)
  assert.equal(piecesAreConnected(snapped), true)
  const centered = centerComposition(snapped, 2, 1)
  assert.equal(totalPieceArea(centered), 2)
})

test('coincident polygons count as overlap and cannot become a legal snap', () => {
  const [first, second] = createGridPieces(2, 1)
  const coincident = { ...second, offset: { x: -1.08, y: 0 } }
  assert.equal(polygonsOverlap(first.vertices, coincident.vertices.map((point) => ({ x: point.x + coincident.offset.x, y: point.y }))), true)
  assert.equal(findSnap(coincident, [first, coincident]), null)
  assert.equal(piecesAreNonOverlapping([first, coincident]), false)
})

test('completed composition centers with a grid-aligned mathematical translation', () => {
  const pieces = createGridPieces(2, 1).map((piece) => ({ ...piece, offset: { x: 3.2, y: -1.4 } }))
  const centered = centerCompositionOnGrid(pieces, { x: 48, y: 49 }, { x: 50, y: 50 })
  centered.forEach((piece) => {
    assert.equal(Number.isInteger(piece.offset.x), true)
    assert.equal(Number.isInteger(piece.offset.y), true)
  })
  assert.equal(totalPieceArea(centered), 2)
  assert.equal(piecesAreConnected(centered), true)
  assert.equal(piecesAreNonOverlapping(centered), true)
})
