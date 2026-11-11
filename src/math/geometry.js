const EPSILON = 1e-7

export const pointKey = ({ x, y }) => `${x.toFixed(6)},${y.toFixed(6)}`

export function signedArea(points) {
  return points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length]
    return sum + point.x * next.y - next.x * point.y
  }, 0) / 2
}

export function polygonArea(points) {
  return Math.abs(signedArea(points))
}

export function createRectanglePiece(width, height) {
  return [{
    id: 'piece-0',
    vertices: [{ x: 0, y: 0 }, { x: width, y: 0 }, { x: width, y: height }, { x: 0, y: height }],
    area: width * height,
    offset: { x: 0, y: 0 },
  }]
}

export function createGridPieces(width, height) {
  const pieces = []
  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      pieces.push({
        id: `cell-${column}-${row}`,
        vertices: [
          { x: column, y: row },
          { x: column + 1, y: row },
          { x: column + 1, y: row + 1 },
          { x: column, y: row + 1 },
        ],
        area: 1,
        offset: { x: 0, y: 0 },
      })
    }
  }
  return pieces
}

function cross(a, b, c) {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
}

function pointOnSegment(point, start, end) {
  if (Math.abs(cross(start, end, point)) > EPSILON) return false
  return point.x >= Math.min(start.x, end.x) - EPSILON
    && point.x <= Math.max(start.x, end.x) + EPSILON
    && point.y >= Math.min(start.y, end.y) - EPSILON
    && point.y <= Math.max(start.y, end.y) + EPSILON
}

function segmentIntersection(first, second) {
  const r = { x: first.b.x - first.a.x, y: first.b.y - first.a.y }
  const s = { x: second.b.x - second.a.x, y: second.b.y - second.a.y }
  const denominator = r.x * s.y - r.y * s.x
  if (Math.abs(denominator) < EPSILON) return null
  const delta = { x: second.a.x - first.a.x, y: second.a.y - first.a.y }
  const t = (delta.x * s.y - delta.y * s.x) / denominator
  const u = (delta.x * r.y - delta.y * r.x) / denominator
  if (t < -EPSILON || t > 1 + EPSILON || u < -EPSILON || u > 1 + EPSILON) return null
  return { x: first.a.x + t * r.x, y: first.a.y + t * r.y }
}

function uniquePoints(points) {
  return [...new Map(points.map((point) => [pointKey(point), point])).values()]
}

function stripBridgeLoops(points) {
  const result = [...points]
  let changed = true
  while (changed) {
    changed = false
    const seen = new Map()
    for (let index = 0; index < result.length; index += 1) {
      const key = pointKey(result[index])
      if (seen.has(key)) {
        const firstIndex = seen.get(key)
        result.splice(firstIndex + 1, index - firstIndex)
        changed = true
        break
      }
      seen.set(key, index)
    }
  }
  return result.filter((point, index) => pointKey(point) !== pointKey(result[(index + 1) % result.length]))
}

function canonicalPolygon(points) {
  const keys = points.map(pointKey)
  const rotations = keys.map((_, index) => [...keys.slice(index), ...keys.slice(0, index)].join('|'))
  return rotations.sort()[0]
}

export function splitRectangle(width, height, cutLines) {
  const boundary = [
    { a: { x: 0, y: 0 }, b: { x: width, y: 0 } },
    { a: { x: width, y: 0 }, b: { x: width, y: height } },
    { a: { x: width, y: height }, b: { x: 0, y: height } },
    { a: { x: 0, y: height }, b: { x: 0, y: 0 } },
  ]
  const segments = [...boundary, ...cutLines]
  const splitPoints = segments.map((segment) => [segment.a, segment.b])

  segments.forEach((segment, segmentIndex) => {
    segments.forEach((other, otherIndex) => {
      if (segmentIndex >= otherIndex) return
      const intersection = segmentIntersection(segment, other)
      if (intersection) {
        splitPoints[segmentIndex].push(intersection)
        splitPoints[otherIndex].push(intersection)
      }
      ;[segment.a, segment.b].forEach((point) => {
        if (pointOnSegment(point, other.a, other.b)) splitPoints[otherIndex].push(point)
      })
      ;[other.a, other.b].forEach((point) => {
        if (pointOnSegment(point, segment.a, segment.b)) splitPoints[segmentIndex].push(point)
      })
    })
  })

  const vertices = new Map()
  const undirectedEdges = new Map()
  segments.forEach((segment, index) => {
    const points = uniquePoints(splitPoints[index]).sort((first, second) => {
      const dx = Math.abs(segment.b.x - segment.a.x)
      const dy = Math.abs(segment.b.y - segment.a.y)
      if (dx >= dy) return (first.x - segment.a.x) / (segment.b.x - segment.a.x || 1) - (second.x - segment.a.x) / (segment.b.x - segment.a.x || 1)
      return (first.y - segment.a.y) / (segment.b.y - segment.a.y || 1) - (second.y - segment.a.y) / (segment.b.y - segment.a.y || 1)
    })
    points.forEach((point) => vertices.set(pointKey(point), point))
    for (let pointIndex = 0; pointIndex < points.length - 1; pointIndex += 1) {
      const firstKey = pointKey(points[pointIndex])
      const secondKey = pointKey(points[pointIndex + 1])
      if (firstKey === secondKey) continue
      const edgeKey = [firstKey, secondKey].sort().join('~')
      undirectedEdges.set(edgeKey, [firstKey, secondKey])
    }
  })

  const adjacency = new Map([...vertices.keys()].map((key) => [key, []]))
  undirectedEdges.forEach(([first, second]) => {
    adjacency.get(first).push(second)
    adjacency.get(second).push(first)
  })
  adjacency.forEach((neighbors, key) => {
    const origin = vertices.get(key)
    neighbors.sort((first, second) => {
      const firstPoint = vertices.get(first)
      const secondPoint = vertices.get(second)
      return Math.atan2(firstPoint.y - origin.y, firstPoint.x - origin.x)
        - Math.atan2(secondPoint.y - origin.y, secondPoint.x - origin.x)
    })
  })

  const visited = new Set()
  const faces = []
  undirectedEdges.forEach(([first, second]) => {
    ;[[first, second], [second, first]].forEach(([start, next]) => {
      const directedKey = `${start}>${next}`
      if (visited.has(directedKey)) return
      const faceKeys = []
      let from = start
      let to = next
      let guard = 0
      while (guard < undirectedEdges.size * 4 + 8) {
        guard += 1
        const edgeKey = `${from}>${to}`
        if (visited.has(edgeKey)) break
        visited.add(edgeKey)
        faceKeys.push(from)
        const neighbors = adjacency.get(to)
        const reverseIndex = neighbors.indexOf(from)
        const following = neighbors[(reverseIndex - 1 + neighbors.length) % neighbors.length]
        from = to
        to = following
        if (from === start && to === next) break
      }
      const points = stripBridgeLoops(faceKeys.map((key) => vertices.get(key)))
      // Coordinates use the SVG convention (positive y points down), so the
      // clockwise bounded faces have positive signed area; the outer face is negative.
      if (points.length >= 3 && signedArea(points) > EPSILON) faces.push(points)
    })
  })

  const uniqueFaces = [...new Map(faces.map((face) => [canonicalPolygon(face), face])).values()]
  const pieces = uniqueFaces.map((verticesForPiece, index) => ({
    id: `piece-${index}`,
    vertices: verticesForPiece,
    area: polygonArea(verticesForPiece),
    offset: { x: 0, y: 0 },
  }))
  const totalArea = pieces.reduce((sum, piece) => sum + piece.area, 0)
  if (!pieces.length || Math.abs(totalArea - width * height) > EPSILON) return createRectanglePiece(width, height)
  return pieces
}

export function translatedVertices(piece, extraOffset = { x: 0, y: 0 }) {
  return piece.vertices.map((point) => ({
    x: point.x + piece.offset.x + extraOffset.x,
    y: point.y + piece.offset.y + extraOffset.y,
  }))
}

function properSegmentsIntersect(firstA, firstB, secondA, secondB) {
  const firstSideA = cross(firstA, firstB, secondA)
  const firstSideB = cross(firstA, firstB, secondB)
  const secondSideA = cross(secondA, secondB, firstA)
  const secondSideB = cross(secondA, secondB, firstB)
  return firstSideA * firstSideB < -EPSILON && secondSideA * secondSideB < -EPSILON
}

function pointStrictlyInside(point, polygon) {
  if (polygon.some((vertex, index) => pointOnSegment(point, vertex, polygon[(index + 1) % polygon.length]))) return false
  let inside = false
  polygon.forEach((vertex, index) => {
    const next = polygon[(index + 1) % polygon.length]
    if ((vertex.y > point.y) !== (next.y > point.y)
      && point.x < ((next.x - vertex.x) * (point.y - vertex.y)) / (next.y - vertex.y) + vertex.x) inside = !inside
  })
  return inside
}

function interiorEdgeSamples(polygon) {
  const clockwiseInSvg = signedArea(polygon) > 0
  return polygon.map((start, index) => {
    const end = polygon[(index + 1) % polygon.length]
    const dx = end.x - start.x
    const dy = end.y - start.y
    const length = Math.hypot(dx, dy) || 1
    const direction = clockwiseInSvg ? 1 : -1
    return {
      x: (start.x + end.x) / 2 + (-dy / length) * EPSILON * 10 * direction,
      y: (start.y + end.y) / 2 + (dx / length) * EPSILON * 10 * direction,
    }
  })
}

export function polygonsOverlap(first, second) {
  for (let firstIndex = 0; firstIndex < first.length; firstIndex += 1) {
    for (let secondIndex = 0; secondIndex < second.length; secondIndex += 1) {
      if (properSegmentsIntersect(
        first[firstIndex], first[(firstIndex + 1) % first.length],
        second[secondIndex], second[(secondIndex + 1) % second.length],
      )) return true
    }
  }
  return first.some((point) => pointStrictlyInside(point, second))
    || second.some((point) => pointStrictlyInside(point, first))
    || interiorEdgeSamples(first).some((point) => pointStrictlyInside(point, second))
    || interiorEdgeSamples(second).some((point) => pointStrictlyInside(point, first))
}

function sharedEdgeLength(first, second) {
  let shared = 0
  first.forEach((firstStart, firstIndex) => {
    const firstEnd = first[(firstIndex + 1) % first.length]
    second.forEach((secondStart, secondIndex) => {
      const secondEnd = second[(secondIndex + 1) % second.length]
      if (Math.abs(cross(firstStart, firstEnd, secondStart)) > EPSILON
        || Math.abs(cross(firstStart, firstEnd, secondEnd)) > EPSILON) return
      const horizontal = Math.abs(firstEnd.x - firstStart.x) >= Math.abs(firstEnd.y - firstStart.y)
      const firstMin = Math.min(horizontal ? firstStart.x : firstStart.y, horizontal ? firstEnd.x : firstEnd.y)
      const firstMax = Math.max(horizontal ? firstStart.x : firstStart.y, horizontal ? firstEnd.x : firstEnd.y)
      const secondMin = Math.min(horizontal ? secondStart.x : secondStart.y, horizontal ? secondEnd.x : secondEnd.y)
      const secondMax = Math.max(horizontal ? secondStart.x : secondStart.y, horizontal ? secondEnd.x : secondEnd.y)
      shared += Math.max(0, Math.min(firstMax, secondMax) - Math.max(firstMin, secondMin))
    })
  })
  return shared
}

export function findSnap(piece, pieces, threshold = 0.3) {
  const current = translatedVertices(piece)
  const candidates = []
  pieces.filter((other) => other.id !== piece.id).forEach((other) => {
    const target = translatedVertices(other)
    current.forEach((sourcePoint) => target.forEach((targetPoint) => {
      const delta = { x: targetPoint.x - sourcePoint.x, y: targetPoint.y - sourcePoint.y }
      const distance = Math.hypot(delta.x, delta.y)
      if (distance <= threshold) candidates.push({ delta, distance, targetId: other.id })
    }))
  })
  candidates.sort((first, second) => first.distance - second.distance)
  for (const candidate of candidates) {
    const snapped = translatedVertices(piece, candidate.delta)
    const target = pieces.find((other) => other.id === candidate.targetId)
    if (sharedEdgeLength(snapped, translatedVertices(target)) <= EPSILON) continue
    const overlaps = pieces.some((other) => other.id !== piece.id && polygonsOverlap(snapped, translatedVertices(other)))
    if (!overlaps) return candidate.delta
  }
  return null
}

export function piecesAreConnected(pieces) {
  if (pieces.length <= 1) return true
  const connected = new Set([pieces[0].id])
  let changed = true
  while (changed) {
    changed = false
    pieces.forEach((piece) => {
      if (connected.has(piece.id)) return
      const touchesConnected = pieces.some((other) => connected.has(other.id)
        && sharedEdgeLength(translatedVertices(piece), translatedVertices(other)) > EPSILON)
      if (touchesConnected) {
        connected.add(piece.id)
        changed = true
      }
    })
  }
  return connected.size === pieces.length
}

export function piecesAreNonOverlapping(pieces) {
  return pieces.every((piece, index) => pieces.slice(index + 1).every((other) => (
    !polygonsOverlap(translatedVertices(piece), translatedVertices(other))
  )))
}

export function centerComposition(pieces, width, height) {
  const allPoints = pieces.flatMap((piece) => translatedVertices(piece))
  const minX = Math.min(...allPoints.map((point) => point.x))
  const maxX = Math.max(...allPoints.map((point) => point.x))
  const minY = Math.min(...allPoints.map((point) => point.y))
  const maxY = Math.max(...allPoints.map((point) => point.y))
  const shift = { x: width / 2 - (minX + maxX) / 2, y: height / 2 - (minY + maxY) / 2 }
  return pieces.map((piece) => ({
    ...piece,
    offset: { x: piece.offset.x + shift.x, y: piece.offset.y + shift.y },
  }))
}

export function centerCompositionOnGrid(pieces, origin, viewportCenter, worldSize = 100) {
  const allPoints = pieces.flatMap((piece) => translatedVertices(piece))
  const minX = Math.min(...allPoints.map((point) => point.x))
  const maxX = Math.max(...allPoints.map((point) => point.x))
  const minY = Math.min(...allPoints.map((point) => point.y))
  const maxY = Math.max(...allPoints.map((point) => point.y))
  const width = maxX - minX
  const height = maxY - minY
  const targetMinX = Math.max(0, Math.min(Math.floor(worldSize - width), Math.round(viewportCenter.x - width / 2)))
  const targetMinY = Math.max(0, Math.min(Math.floor(worldSize - height), Math.round(viewportCenter.y - height / 2)))
  const shiftX = targetMinX - origin.x - minX
  const shiftY = targetMinY - origin.y - minY
  return pieces.map((piece) => ({
    ...piece,
    offset: { x: piece.offset.x + shiftX, y: piece.offset.y + shiftY },
  }))
}

export function totalPieceArea(pieces) {
  return pieces.reduce((sum, piece) => sum + piece.area, 0)
}
