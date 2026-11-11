export const WORLD_SIZE = 100
export const DEFAULT_PIXELS_PER_UNIT = 72
export const COMPACT_PIXELS_PER_UNIT = 50
export const MIN_ZOOM = 0.12
export const MAX_ZOOM = 3
export const RESIZE_PIXELS_PER_STEP = 42

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value))

export function viewportViewBox(viewport, boardSize, pixelsPerUnit) {
  const width = boardSize.width / (pixelsPerUnit * viewport.zoom)
  const height = boardSize.height / (pixelsPerUnit * viewport.zoom)
  return {
    x: viewport.center.x - width / 2,
    y: viewport.center.y - height / 2,
    width,
    height,
  }
}

export function clampViewport(viewport, boardSize, pixelsPerUnit, worldSize = WORLD_SIZE) {
  const viewBox = viewportViewBox(viewport, boardSize, pixelsPerUnit)
  const centerX = viewBox.width >= worldSize ? worldSize / 2 : clamp(viewport.center.x, viewBox.width / 2, worldSize - viewBox.width / 2)
  const centerY = viewBox.height >= worldSize ? worldSize / 2 : clamp(viewport.center.y, viewBox.height / 2, worldSize - viewBox.height / 2)
  return { ...viewport, center: { x: centerX, y: centerY } }
}

export function zoomViewportAt(viewport, nextZoom, focus, focusRatio, boardSize, pixelsPerUnit) {
  const zoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM)
  const nextWidth = boardSize.width / (pixelsPerUnit * zoom)
  const nextHeight = boardSize.height / (pixelsPerUnit * zoom)
  return clampViewport({
    zoom,
    center: {
      x: focus.x - (focusRatio.x - 0.5) * nextWidth,
      y: focus.y - (focusRatio.y - 0.5) * nextHeight,
    },
  }, boardSize, pixelsPerUnit)
}

export function worldBoundsForPieces(pieces, origin) {
  const points = pieces.flatMap((piece) => piece.vertices.map((point) => ({
    x: origin.x + point.x + piece.offset.x,
    y: origin.y + point.y + piece.offset.y,
  })))
  return {
    minX: Math.min(...points.map((point) => point.x)),
    maxX: Math.max(...points.map((point) => point.x)),
    minY: Math.min(...points.map((point) => point.y)),
    maxY: Math.max(...points.map((point) => point.y)),
  }
}

export function clampPieceOffset(piece, offset, origin, worldSize = WORLD_SIZE) {
  const minX = Math.min(...piece.vertices.map((point) => point.x))
  const maxX = Math.max(...piece.vertices.map((point) => point.x))
  const minY = Math.min(...piece.vertices.map((point) => point.y))
  const maxY = Math.max(...piece.vertices.map((point) => point.y))
  return {
    x: clamp(offset.x, -origin.x - minX, worldSize - origin.x - maxX),
    y: clamp(offset.y, -origin.y - minY, worldSize - origin.y - maxY),
  }
}

export function nearestLegalGridOffset(piece, pieces, origin, worldSize = WORLD_SIZE) {
  const minVertexX = Math.min(...piece.vertices.map((point) => point.x))
  const maxVertexX = Math.max(...piece.vertices.map((point) => point.x))
  const minVertexY = Math.min(...piece.vertices.map((point) => point.y))
  const maxVertexY = Math.max(...piece.vertices.map((point) => point.y))
  const minOffsetX = Math.ceil(-origin.x - minVertexX)
  const maxOffsetX = Math.floor(worldSize - origin.x - maxVertexX)
  const minOffsetY = Math.ceil(-origin.y - minVertexY)
  const maxOffsetY = Math.floor(worldSize - origin.y - maxVertexY)
  let best = null

  for (let x = minOffsetX; x <= maxOffsetX; x += 1) {
    for (let y = minOffsetY; y <= maxOffsetY; y += 1) {
      const distance = (x - piece.offset.x) ** 2 + (y - piece.offset.y) ** 2
      if (best && distance >= best.distance) continue
      const candidate = { ...piece, offset: { x, y } }
      const vertices = translatedVertices(candidate)
      const overlaps = pieces.some((other) => other.id !== piece.id
        && polygonsOverlap(vertices, translatedVertices(other)))
      if (!overlaps) best = { offset: candidate.offset, distance }
    }
  }

  return best?.offset ?? null
}

export function resizeRectangleFromGesture(initial, startClient, currentClient) {
  const widthDelta = Math.round((currentClient.x - startClient.x) / RESIZE_PIXELS_PER_STEP)
  const heightDelta = Math.round((startClient.y - currentClient.y) / RESIZE_PIXELS_PER_STEP)
  const width = clamp(initial.width + widthDelta, 1, 20)
  const height = clamp(initial.height + heightDelta, 1, 20)
  const bottom = initial.origin.y + initial.height
  return { width, height, origin: { x: initial.origin.x, y: bottom - height } }
}

export function projectWorldPointToViewportPercent(point, viewBox) {
  return {
    left: ((point.x - viewBox.x) / viewBox.width) * 100,
    top: ((point.y - viewBox.y) / viewBox.height) * 100,
  }
}

export function fitViewportToBounds(viewport, bounds, boardSize, pixelsPerUnit, marginPixels = 52, { recenter = false } = {}) {
  const current = viewportViewBox(viewport, boardSize, pixelsPerUnit)
  const marginX = marginPixels / (pixelsPerUnit * viewport.zoom)
  const marginY = marginPixels / (pixelsPerUnit * viewport.zoom)
  const isVisible = bounds.minX >= current.x + marginX
    && bounds.maxX <= current.x + current.width - marginX
    && bounds.minY >= current.y + marginY
    && bounds.maxY <= current.y + current.height - marginY
  if (isVisible && !recenter) return viewport

  const boundsWidth = Math.max(1, bounds.maxX - bounds.minX)
  const boundsHeight = Math.max(1, bounds.maxY - bounds.minY)
  const availableWidth = Math.max(1, boardSize.width - marginPixels * 2)
  const availableHeight = Math.max(1, boardSize.height - marginPixels * 2)
  const requiredZoom = Math.min(
    availableWidth / (pixelsPerUnit * boundsWidth),
    availableHeight / (pixelsPerUnit * boundsHeight),
  )
  const zoom = Math.min(viewport.zoom, requiredZoom)
  return clampViewport({
    zoom: Math.max(MIN_ZOOM, zoom),
    center: { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 },
  }, boardSize, pixelsPerUnit)
}

export function gridIntervals(pixelsPerUnit) {
  if (pixelsPerUnit >= 24) return { minor: 1, major: 5 }
  if (pixelsPerUnit >= 10) return { minor: 5, major: 10 }
  return { minor: 10, major: 20 }
}
import { polygonsOverlap, translatedVertices } from './geometry.js'
