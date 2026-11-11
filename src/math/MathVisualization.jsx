import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  centerCompositionOnGrid,
  createGridPieces,
  createRectanglePiece,
  findSnap,
  piecesAreConnected,
  piecesAreNonOverlapping,
  splitRectangle,
  totalPieceArea,
} from './geometry.js'
import {
  clampPieceOffset,
  clampViewport,
  COMPACT_PIXELS_PER_UNIT,
  DEFAULT_PIXELS_PER_UNIT,
  fitViewportToBounds,
  gridIntervals,
  nearestLegalGridOffset,
  projectWorldPointToViewportPercent,
  resizeRectangleFromGesture,
  viewportViewBox,
  WORLD_SIZE,
  worldBoundsForPieces,
  zoomViewportAt,
} from './workspace.js'
import './mathVisualization.css'

const DEFAULT_RECTANGLE = { width: 5, height: 3 }
const DEFAULT_ORIGIN = { x: 48, y: 49 }
const DEFAULT_VIEWPORT = { center: { x: 50.5, y: 50.5 }, zoom: 1 }
const PIECE_COLORS = ['#dce9f5', '#e8f0f7', '#d8ece8', '#e9eef6', '#dfe8f2', '#e5efed']

const concepts = [
  { id: 'shape', name: '圖形', description: '觀察平面圖形的構成、組合與變化。', visual: 'shape' },
  { id: 'angle', name: '角度', description: '看見角的開合、旋轉與大小關係。', visual: 'angle' },
  { id: 'area', name: '面積', description: '透過鋪排、切割與重組理解等積關係。', visual: 'area', available: true },
  { id: 'fraction', name: '分數', description: '用等分、對齊與拆合理解量與關係。', visual: 'fraction' },
  { id: 'perimeter', name: '周長', description: '沿著邊界比較長度，區分周長與面積。', visual: 'perimeter' },
  { id: 'solid', name: '立體圖形', description: '用單位立方體堆疊、拆解與旋轉建立空間概念。', visual: 'solid' },
]

function BackIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7" /></svg>
}

function UndoIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7 4 12l5 5M5 12h8a6 6 0 0 1 6 6" /></svg>
}

function ResetIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6" /></svg>
}

export function ConceptVisual({ type }) {
  if (type === 'shape') return (
    <svg viewBox="0 0 220 118" aria-hidden="true">
      <path className="concept-coral" d="M18 92 54 26l38 66Z" /><rect className="concept-blue" x="102" y="30" width="52" height="62" /><circle className="concept-teal" cx="188" cy="61" r="29" />
    </svg>
  )
  if (type === 'angle') return (
    <svg viewBox="0 0 220 118" aria-hidden="true"><path className="concept-blue" d="M28 92h170M28 92 145 20" /><path className="concept-coral" d="M79 92a51 51 0 0 0-8-27" /><circle className="concept-ink-fill" cx="28" cy="92" r="5" /></svg>
  )
  if (type === 'area') return (
    <svg viewBox="0 0 220 118" aria-hidden="true">
      <g className="concept-teal">{[0, 1, 2].map((row) => [0, 1, 2, 3].map((column) => <rect key={`${row}-${column}`} x={10 + column * 27} y={18 + row * 27} width="27" height="27" />))}</g>
      <path className="concept-arrow" d="M126 58h22m-7-7 7 7-7 7" />
      <g className="concept-gold">{[0, 1, 2, 3, 4, 5].map((column) => <rect key={column} x={153 + (column % 3) * 20} y={32 + Math.floor(column / 3) * 27} width="20" height="27" />)}</g>
    </svg>
  )
  if (type === 'fraction') return (
    <svg viewBox="0 0 220 118" aria-hidden="true"><g>{[0, 1, 2, 3, 4, 5].map((column) => <rect className={column < 3 ? 'concept-coral-fill' : 'concept-paper-fill'} key={column} x={18 + column * 28} y="40" width="28" height="36" />)}</g><text x="110" y="106">3 / 6</text></svg>
  )
  if (type === 'perimeter') return (
    <svg viewBox="0 0 220 118" aria-hidden="true"><path className="concept-blue-fill" d="M30 26h54v32h54v35H30Z" /><path className="concept-coral-dash" d="M24 20h66v32h54v47H24Z" /><path className="concept-arrow" d="M153 61h44m-7-7 7 7-7 7" /></svg>
  )
  return (
    <svg viewBox="0 0 220 118" aria-hidden="true"><g className="concept-cubes"><path d="m32 58 20-12 20 12-20 12Z M32 58v24l20 12 20-12V58M52 70v24" /><path d="m72 35 20-12 20 12-20 12Z M72 35v24l20 12 20-12V35M92 47v24" /><path d="m112 58 20-12 20 12-20 12Z M112 58v24l20 12 20-12V58M132 70v24" /></g></svg>
  )
}

function PageHeader({ title, description, onBack, backLabel }) {
  return (
    <header className="math-page-header">
      <button type="button" className="math-back" onClick={onBack}><BackIcon />{backLabel}</button>
      <div><h1>{title}</h1><p>{description}</p></div>
    </header>
  )
}

function ConceptsPage({ onBack, onOpenArea }) {
  return (
    <main className="math-visualization math-concepts-page">
      <PageHeader
        title="數學視覺化"
        description="透過可操作的圖形、動畫、拆解、重組、比較與變換，協助學生看見抽象數學概念之間的關係。"
        onBack={onBack}
        backLabel="返回工具入口"
      />
      <div className="math-architecture" aria-label="數學視覺化資訊架構"><strong>選擇數學概念</strong><span /><strong>進入教學模板</strong></div>
      <section className="concept-grid" aria-label="數學概念">
        {concepts.map((concept, index) => (
          <button
            type="button"
            key={concept.id}
            className={`concept-entry ${concept.available ? 'is-available' : ''}`}
            disabled={!concept.available}
            onClick={concept.available ? onOpenArea : undefined}
            aria-describedby={`${concept.id}-description`}
          >
            <span className="concept-number">{index + 1}</span>
            <span className="concept-copy"><strong>{concept.name}</strong><small id={`${concept.id}-description`}>{concept.description}</small></span>
            <span className="concept-visual"><ConceptVisual type={concept.visual} /></span>
          </button>
        ))}
      </section>
    </main>
  )
}

const areaTemplates = [
  { id: 'circle', name: '圓', visual: 'circle' },
  { id: 'rectangle', name: '長方形', visual: 'rectangle', available: true },
  { id: 'triangle', name: '三角形', visual: 'triangle' },
  { id: 'parallelogram', name: '平行四邊形', visual: 'parallelogram' },
  { id: 'trapezoid', name: '梯形', visual: 'trapezoid' },
  { id: 'free', name: '自由拼接', visual: 'free' },
]

function TemplateSketch({ type }) {
  if (type === 'circle') return <svg viewBox="0 0 120 90"><circle cx="60" cy="47" r="29" /></svg>
  if (type === 'rectangle') return <svg viewBox="0 0 120 90"><rect x="23" y="25" width="74" height="48" /></svg>
  if (type === 'triangle') return <svg viewBox="0 0 120 90"><path d="M18 72 60 18l42 54Z" /></svg>
  if (type === 'parallelogram') return <svg viewBox="0 0 120 90"><path d="M18 70 42 24h64L82 70Z" /></svg>
  if (type === 'trapezoid') return <svg viewBox="0 0 120 90"><path d="M18 70 38 28h46l20 42Z" /></svg>
  return <svg viewBox="0 0 120 90"><path d="M22 72 58 16l40 56Z M38 48h44M47 72l17-24" /></svg>
}

function AreaTemplates({ onBack, onOpenRectangle }) {
  return (
    <main className="math-visualization area-templates-page">
      <PageHeader title="面積" description="選擇要用切割與重組觀察的圖形。" onBack={onBack} backLabel="返回數學概念" />
      <section className="area-template-grid" aria-label="面積教學模板">
        {areaTemplates.map((template) => (
          <button type="button" key={template.id} disabled={!template.available} onClick={template.available ? onOpenRectangle : undefined} className={template.available ? 'is-available' : ''}>
            <strong>{template.name}</strong>
            <TemplateSketch type={template.visual} />
          </button>
        ))}
      </section>
    </main>
  )
}

function snapshotState(state) {
  return {
    width: state.width,
    height: state.height,
    cutLines: state.cutLines.map((line) => ({ a: { ...line.a }, b: { ...line.b } })),
    pieces: state.pieces.map((piece) => ({ ...piece, vertices: piece.vertices.map((point) => ({ ...point })), offset: { ...piece.offset } })),
    hasMoved: state.hasMoved,
    origin: { ...state.origin },
  }
}

function gridCutLines(width, height) {
  return [
    ...Array.from({ length: width - 1 }, (_, index) => ({ a: { x: index + 1, y: 0 }, b: { x: index + 1, y: height } })),
    ...Array.from({ length: height - 1 }, (_, index) => ({ a: { x: 0, y: index + 1 }, b: { x: width, y: index + 1 } })),
  ]
}

function pathFor(vertices) {
  return vertices.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ') + ' Z'
}

function RectangleAreaTool({ onBack }) {
  const [geometry, setGeometry] = useState(() => ({
    ...DEFAULT_RECTANGLE,
    origin: { ...DEFAULT_ORIGIN },
    cutLines: [],
    pieces: createRectanglePiece(DEFAULT_RECTANGLE.width, DEFAULT_RECTANGLE.height),
    hasMoved: false,
  }))
  const [operationMode, setOperationMode] = useState('move')
  const [selectedId, setSelectedId] = useState(null)
  const [history, setHistory] = useState([])
  const [message, setMessage] = useState('拖曳右上角控制點調整長方形，或選擇一種分割方式。')
  const [drawPreview, setDrawPreview] = useState(null)
  const [snapHint, setSnapHint] = useState(null)
  const [boardSize, setBoardSize] = useState({ width: 1000, height: 620 })
  const [viewport, setViewport] = useState(DEFAULT_VIEWPORT)
  const [centering, setCentering] = useState(false)
  const boardFrameRef = useRef(null)
  const svgRef = useRef(null)
  const interactionRef = useRef(null)
  const resizeInteractionRef = useRef(null)
  const geometryRef = useRef(geometry)
  const viewportRef = useRef(viewport)
  const viewportAnimationRef = useRef(null)

  useEffect(() => {
    const frame = boardFrameRef.current
    if (!frame) return undefined
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      if (width > 0 && height > 0) setBoardSize({ width, height })
    })
    observer.observe(frame)
    return () => observer.disconnect()
  }, [])

  const compact = boardSize.width < 620
  const pixelsPerUnit = compact ? COMPACT_PIXELS_PER_UNIT : DEFAULT_PIXELS_PER_UNIT
  const viewBox = useMemo(() => viewportViewBox(viewport, boardSize, pixelsPerUnit), [boardSize, pixelsPerUnit, viewport])
  const pixelsPerWorldUnit = pixelsPerUnit * viewport.zoom
  const intervals = gridIntervals(pixelsPerWorldUnit)
  const isSingle = geometry.pieces.length === 1 && geometry.cutLines.length === 0
  const isModified = geometry.width !== DEFAULT_RECTANGLE.width || geometry.height !== DEFAULT_RECTANGLE.height
    || geometry.cutLines.length > 0 || geometry.hasMoved || geometry.pieces.some((piece) => piece.offset.x || piece.offset.y)
  const areaIsCorrect = Math.abs(totalPieceArea(geometry.pieces) - geometry.width * geometry.height) < 1e-7
  const rectangleOffset = isSingle ? geometry.pieces[0].offset : { x: 0, y: 0 }
  const resizeHandlePosition = projectWorldPointToViewportPercent({
    x: geometry.origin.x + rectangleOffset.x + geometry.width,
    y: geometry.origin.y + rectangleOffset.y,
  }, viewBox)

  useEffect(() => { geometryRef.current = geometry }, [geometry])
  useEffect(() => { viewportRef.current = viewport }, [viewport])
  useEffect(() => {
    const clamped = clampViewport(viewportRef.current, boardSize, pixelsPerUnit)
    const currentGeometry = geometryRef.current
    const next = fitViewportToBounds(
      clamped,
      worldBoundsForPieces(currentGeometry.pieces, currentGeometry.origin),
      boardSize,
      pixelsPerUnit,
      compact ? 28 : 52,
    )
    viewportRef.current = next
    setViewport(next)
  }, [boardSize, compact, pixelsPerUnit])
  useEffect(() => () => cancelAnimationFrame(viewportAnimationRef.current), [])

  const updateGeometry = useCallback((next) => {
    geometryRef.current = next
    setGeometry(next)
  }, [])

  const updateViewport = useCallback((next) => {
    viewportRef.current = next
    setViewport(next)
  }, [])

  const cancelViewportAnimation = useCallback(() => {
    if (viewportAnimationRef.current !== null) cancelAnimationFrame(viewportAnimationRef.current)
    viewportAnimationRef.current = null
  }, [])

  const animateViewport = useCallback((target) => {
    cancelViewportAnimation()
    const start = viewportRef.current
    const startTime = performance.now()
    const tick = (now) => {
      const progress = Math.min(1, (now - startTime) / 220)
      const eased = 1 - (1 - progress) ** 3
      updateViewport({
        zoom: start.zoom + (target.zoom - start.zoom) * eased,
        center: {
          x: start.center.x + (target.center.x - start.center.x) * eased,
          y: start.center.y + (target.center.y - start.center.y) * eased,
        },
      })
      if (progress < 1) viewportAnimationRef.current = requestAnimationFrame(tick)
      else viewportAnimationRef.current = null
    }
    viewportAnimationRef.current = requestAnimationFrame(tick)
  }, [cancelViewportAnimation, updateViewport])

  const pointerToWorld = useCallback((event, inverseCTM) => {
    const svg = svgRef.current
    const point = svg.createSVGPoint()
    point.x = event.clientX
    point.y = event.clientY
    return point.matrixTransform(inverseCTM ?? svg.getScreenCTM().inverse())
  }, [])

  const nearestGridPoint = useCallback((point) => {
    const x = Math.round(point.x - geometry.origin.x)
    const y = Math.round(point.y - geometry.origin.y)
    if (x < 0 || x > geometry.width || y < 0 || y > geometry.height) return null
    const worldPoint = { x: geometry.origin.x + x, y: geometry.origin.y + y }
    if (Math.hypot(point.x - worldPoint.x, point.y - worldPoint.y) > 18 / pixelsPerWorldUnit) return null
    return { x, y, worldPoint }
  }, [geometry.height, geometry.origin.x, geometry.origin.y, geometry.width, pixelsPerWorldUnit])

  const applyHistorySnapshot = (snapshot) => {
    updateGeometry(snapshot)
    setOperationMode('move')
    setSelectedId(null)
    setDrawPreview(null)
    setSnapHint(null)
    setCentering(false)
  }

  const activateGridSplit = () => {
    setOperationMode('grid')
    setDrawPreview(null)
    interactionRef.current = null
    if (!isSingle || geometry.hasMoved) {
      setMessage('目前圖形已分割；可直接拖曳圖塊，或按「還原」重新選擇。')
      setOperationMode('move')
      return
    }
    const lines = gridCutLines(geometry.width, geometry.height)
    setHistory((items) => [...items, snapshotState(geometry)])
    updateGeometry({ ...geometry, cutLines: lines, pieces: createGridPieces(geometry.width, geometry.height) })
    setOperationMode('move')
    setMessage(`已切成 ${geometry.width * geometry.height} 個單位方格；每格面積為 1。`)
  }

  const activateLineSplit = () => {
    setDrawPreview(null)
    interactionRef.current = null
    if (geometry.hasMoved) {
      setOperationMode('move')
      setMessage('圖塊移動後無法再畫切線；請先還原。')
      return
    }
    setOperationMode('line')
    setMessage('畫線分割已啟用：從一個格點拖曳到另一個格點來切割。')
  }

  const beginResize = (event) => {
    if (!isSingle || centering) return
    event.preventDefault()
    event.stopPropagation()
    cancelViewportAnimation()
    event.currentTarget.setPointerCapture(event.pointerId)
    resizeInteractionRef.current = {
      pointerId: event.pointerId,
      before: snapshotState(geometry),
      initial: { width: geometry.width, height: geometry.height, origin: { ...geometry.origin } },
      startClient: { x: event.clientX, y: event.clientY },
      changed: false,
    }
  }

  const handleResizePointerMove = (event) => {
    const interaction = resizeInteractionRef.current
    if (!interaction || interaction.pointerId !== event.pointerId) return
    event.preventDefault()
    event.stopPropagation()
    const current = geometryRef.current
    const nextRectangle = resizeRectangleFromGesture(
      interaction.initial,
      interaction.startClient,
      { x: event.clientX, y: event.clientY },
    )
    if (nextRectangle.width === current.width && nextRectangle.height === current.height) return
    interaction.changed = true
    updateGeometry({
      ...current,
      ...nextRectangle,
      pieces: createRectanglePiece(nextRectangle.width, nextRectangle.height),
    })
    setMessage(`長 ${nextRectangle.width}，寬 ${nextRectangle.height}`)
  }

  const finishResize = (event) => {
    const interaction = resizeInteractionRef.current
    if (!interaction || interaction.pointerId !== event.pointerId) return
    event.preventDefault()
    event.stopPropagation()
    resizeInteractionRef.current = null
    if (interaction.changed) setHistory((items) => [...items, interaction.before])
    const current = geometryRef.current
    const fitted = fitViewportToBounds(
      viewportRef.current,
      worldBoundsForPieces(current.pieces, current.origin),
      boardSize,
      pixelsPerUnit,
      52,
      { recenter: true },
    )
    const viewportChanged = Math.abs(fitted.zoom - viewportRef.current.zoom) > 0.002
      || Math.hypot(fitted.center.x - viewportRef.current.center.x, fitted.center.y - viewportRef.current.center.y) > 0.002
    if (viewportChanged) animateViewport(fitted)
  }

  const beginPieceDrag = (event, piece) => {
    if (operationMode !== 'move' || centering) return
    event.stopPropagation()
    cancelViewportAnimation()
    event.currentTarget.setPointerCapture(event.pointerId)
    const inverseCTM = svgRef.current.getScreenCTM().inverse()
    interactionRef.current = {
      type: 'drag', pointerId: event.pointerId, pieceId: piece.id,
      lastPointerWorld: pointerToWorld(event, inverseCTM), inverseCTM,
      before: snapshotState(geometry), changed: false,
    }
    setSelectedId(piece.id)
    setSnapHint(null)
  }

  const beginDraw = (event) => {
    if (operationMode !== 'line' || geometry.hasMoved || centering) return
    const start = nearestGridPoint(pointerToWorld(event))
    if (!start) return
    event.currentTarget.setPointerCapture(event.pointerId)
    interactionRef.current = { type: 'draw', pointerId: event.pointerId, start }
    setDrawPreview({ start, end: start, valid: false })
  }

  const handlePointerMove = (event) => {
    const interaction = interactionRef.current
    if (!interaction || interaction.pointerId !== event.pointerId) return
    const point = pointerToWorld(event, interaction.inverseCTM)
    if (interaction.type === 'drag') {
      const scale = pixelsPerUnit * viewportRef.current.zoom
      const delta = { x: point.x - interaction.lastPointerWorld.x, y: point.y - interaction.lastPointerWorld.y }
      interaction.lastPointerWorld = point
      interaction.changed ||= Math.hypot(delta.x, delta.y) > 0.01
      const current = geometryRef.current
      const pieces = current.pieces.map((piece) => piece.id === interaction.pieceId
        ? { ...piece, offset: clampPieceOffset(piece, { x: piece.offset.x + delta.x, y: piece.offset.y + delta.y }, current.origin) }
        : piece)
      const movedPiece = pieces.find((piece) => piece.id === interaction.pieceId)
      const snap = findSnap(movedPiece, pieces, Math.min(0.35, 16 / scale))
      setSnapHint(snap ? { pieceId: interaction.pieceId, delta: snap } : null)
      const next = { ...current, pieces }
      updateGeometry(next)
      const fitted = fitViewportToBounds(viewportRef.current, worldBoundsForPieces(pieces, current.origin), boardSize, pixelsPerUnit)
      if (fitted.zoom < viewportRef.current.zoom - 0.002 && !viewportAnimationRef.current) animateViewport(fitted)
      return
    }
    if (interaction.type === 'draw') {
      const end = nearestGridPoint(point)
      setDrawPreview({ start: interaction.start, end: end ?? { worldPoint: point }, valid: Boolean(end && (end.x !== interaction.start.x || end.y !== interaction.start.y)) })
    }
  }

  const finishPointer = (event) => {
    const interaction = interactionRef.current
    if (!interaction || interaction.pointerId !== event.pointerId) return
    interactionRef.current = null
    if (interaction.type === 'draw') {
      const end = nearestGridPoint(pointerToWorld(event))
      setDrawPreview(null)
      if (!end || (end.x === interaction.start.x && end.y === interaction.start.y)) {
        setMessage('終點不是合法格點，未建立切割。')
        return
      }
      const nextLine = { a: { x: interaction.start.x, y: interaction.start.y }, b: { x: end.x, y: end.y } }
      const nextLines = [...geometry.cutLines, nextLine]
      const nextPieces = splitRectangle(geometry.width, geometry.height, nextLines)
      if (nextPieces.length <= geometry.pieces.length) {
        setMessage('這條線尚未形成有效切割，未留下殘線。')
        return
      }
      setHistory((items) => [...items, snapshotState(geometry)])
      updateGeometry({ ...geometry, cutLines: nextLines, pieces: nextPieces })
      setOperationMode('move')
      setMessage(`切割完成：${nextPieces.length} 個圖塊，總面積仍為 ${geometry.width * geometry.height}。`)
      return
    }
    if (interaction.type === 'drag' && interaction.changed) {
      setHistory((items) => [...items, interaction.before])
      const current = geometryRef.current
      let pieces = current.pieces
      const piece = pieces.find((item) => item.id === interaction.pieceId)
      const sharedEdgeSnap = findSnap(piece, pieces, Math.min(0.35, 16 / (pixelsPerUnit * viewportRef.current.zoom)))
      let snapType = null
      let nextOrigin = current.origin
      if (sharedEdgeSnap) {
        pieces = pieces.map((item) => item.id === piece.id
          ? { ...item, offset: { x: item.offset.x + sharedEdgeSnap.x, y: item.offset.y + sharedEdgeSnap.y } }
          : item)
        snapType = 'shared-edge'
      } else {
        const gridOffset = nearestLegalGridOffset(piece, pieces, current.origin, WORLD_SIZE)
        if (gridOffset) {
          pieces = pieces.map((item) => item.id === piece.id ? { ...item, offset: gridOffset } : item)
          snapType = 'grid'
        } else {
          const previousPiece = interaction.before.pieces.find((item) => item.id === piece.id)
          pieces = pieces.map((item) => item.id === piece.id ? { ...item, offset: { ...previousPiece.offset } } : item)
        }
      }
      if (pieces.length === 1 && snapType === 'grid') {
        const [rectangle] = pieces
        nextOrigin = {
          x: current.origin.x + rectangle.offset.x,
          y: current.origin.y + rectangle.offset.y,
        }
        pieces = [{ ...rectangle, offset: { x: 0, y: 0 } }]
      }
      const completed = pieces.length > 1 && piecesAreConnected(pieces) && piecesAreNonOverlapping(pieces)
      if (completed) {
        setCentering(true)
        pieces = centerCompositionOnGrid(pieces, current.origin, viewportRef.current.center, WORLD_SIZE)
        setMessage('圖塊已完成有效拼接，總面積不變並已對齊格線置中。')
      } else if (snapType === 'shared-edge') {
        setMessage('已優先吸附到合法共享邊。')
      } else if (snapType === 'grid') {
        setMessage('已吸附到最近的合法工作區格線。')
      } else {
        setMessage('附近沒有合法放置位置，已回到拖曳前的位置。')
      }
      updateGeometry({ ...current, origin: nextOrigin, pieces, hasMoved: true })
      setSnapHint(null)
    }
  }

  const handleWheel = (event) => {
    event.preventDefault()
    if (interactionRef.current || resizeInteractionRef.current) return
    cancelViewportAnimation()
    const rect = svgRef.current.getBoundingClientRect()
    const focusRatio = { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height }
    const focus = pointerToWorld(event)
    const factor = Math.exp(-event.deltaY * 0.0015)
    updateViewport(zoomViewportAt(viewportRef.current, viewportRef.current.zoom * factor, focus, focusRatio, boardSize, pixelsPerUnit))
  }

  const reset = () => {
    cancelViewportAnimation()
    updateGeometry({ ...DEFAULT_RECTANGLE, origin: { ...DEFAULT_ORIGIN }, cutLines: [], pieces: createRectanglePiece(5, 3), hasMoved: false })
    updateViewport({ center: { ...DEFAULT_VIEWPORT.center }, zoom: DEFAULT_VIEWPORT.zoom })
    setOperationMode('move')
    setSelectedId(null)
    setHistory([])
    setDrawPreview(null)
    setSnapHint(null)
    setCentering(false)
    setMessage('已還原預設長方形。')
  }

  const undo = () => {
    if (!history.length) return
    cancelViewportAnimation()
    const previous = history[history.length - 1]
    setHistory((items) => items.slice(0, -1))
    applyHistorySnapshot(previous)
    setMessage('已回到上一步。')
  }

  return (
    <main className="rectangle-tool">
      <header className="rectangle-toolbar">
        <button type="button" className="math-back" onClick={onBack}><BackIcon />返回面積</button>
        <div><h1>面積：長方形切割與重組</h1><p>直接調整、切割、拖曳與拼接，觀察面積與等積關係。</p></div>
        <div className="history-actions">
          <button type="button" onClick={undo} disabled={!history.length}><UndoIcon />上一步</button>
          <button type="button" onClick={reset} disabled={!isModified}><ResetIcon />還原</button>
        </div>
      </header>

      <aside className="rectangle-tools" aria-label="分割方式">
        <h2>分割方式</h2>
        <button type="button" aria-pressed={operationMode === 'grid'} className={operationMode === 'grid' ? 'is-active' : ''} onClick={activateGridSplit}>
          <span className="grid-tool-icon" aria-hidden="true" />
          <span><strong>格線分割</strong><small>切成單位方格</small></span>
        </button>
        <button type="button" aria-pressed={operationMode === 'line'} className={operationMode === 'line' ? 'is-active' : ''} onClick={activateLineSplit}>
          <span className="line-tool-icon" aria-hidden="true" />
          <span><strong>畫線分割</strong><small>格點連到格點</small></span>
        </button>
      </aside>

      <section className="rectangle-workspace" aria-label="長方形操作工作區">
        <div className="workspace-status"><p aria-live="polite">{message}</p><span className={areaIsCorrect ? 'is-correct' : 'is-error'}>總面積 {geometry.width * geometry.height}</span></div>
        <div ref={boardFrameRef} className="math-board-frame">
          <svg
            ref={svgRef}
            className={`math-board ${centering ? 'is-centering' : ''} ${operationMode === 'line' ? 'is-line-mode' : ''}`}
            viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
            role="img"
            aria-label={`長 ${geometry.width}、寬 ${geometry.height}，共 ${geometry.pieces.length} 個圖塊`}
            onPointerDown={beginDraw}
            onPointerMove={handlePointerMove}
            onPointerUp={finishPointer}
            onPointerCancel={finishPointer}
            onWheel={handleWheel}
          >
            <defs>
              <pattern id="minor-grid" width={intervals.minor} height={intervals.minor} patternUnits="userSpaceOnUse"><path className="minor-grid-line" d={`M ${intervals.minor} 0 H 0 V ${intervals.minor}`} /></pattern>
              <pattern id="major-grid" width={intervals.major} height={intervals.major} patternUnits="userSpaceOnUse"><path className="major-grid-line" d={`M ${intervals.major} 0 H 0 V ${intervals.major}`} /></pattern>
            </defs>
            <rect className="board-surface" x="0" y="0" width={WORLD_SIZE} height={WORLD_SIZE} />
            <rect className="workspace-grid minor" x="0" y="0" width={WORLD_SIZE} height={WORLD_SIZE} fill="url(#minor-grid)" />
            <rect className="workspace-grid major" x="0" y="0" width={WORLD_SIZE} height={WORLD_SIZE} fill="url(#major-grid)" />
            <text className="dimension-label length-label" style={{ fontSize: 24 / pixelsPerWorldUnit }} x={geometry.origin.x + geometry.width / 2} y={geometry.origin.y - 0.48}>{geometry.width}</text>
            <text className="dimension-label width-label" style={{ fontSize: 24 / pixelsPerWorldUnit }} x={geometry.origin.x - 0.48} y={geometry.origin.y + geometry.height / 2}>{geometry.height}</text>
            <g className="piece-layer">
              {geometry.pieces.map((piece, index) => (
                <g
                  key={piece.id}
                  className={`geometry-piece ${selectedId === piece.id ? 'is-selected' : ''} ${snapHint?.pieceId === piece.id ? 'has-snap' : ''}`}
                  transform={`translate(${geometry.origin.x + piece.offset.x} ${geometry.origin.y + piece.offset.y})`}
                  onPointerDown={(event) => beginPieceDrag(event, piece)}
                  onTransitionEnd={() => { if (centering) setCentering(false) }}
                >
                  <path d={pathFor(piece.vertices)} fill={geometry.pieces.length === 1 ? '#dce9f58a' : PIECE_COLORS[index % PIECE_COLORS.length]} />
                </g>
              ))}
            </g>
            {operationMode === 'line' && !geometry.hasMoved && (
              <g className="grid-points" aria-hidden="true">
                {Array.from({ length: geometry.height + 1 }, (_, row) => Array.from({ length: geometry.width + 1 }, (_, column) => (
                  <circle key={`${column}-${row}`} cx={geometry.origin.x + column} cy={geometry.origin.y + row} r={4 / pixelsPerWorldUnit} />
                )))}
              </g>
            )}
            {drawPreview && <line className={`draw-preview ${drawPreview.valid ? 'is-valid' : ''}`} x1={drawPreview.start.worldPoint.x} y1={drawPreview.start.worldPoint.y} x2={drawPreview.end.worldPoint.x} y2={drawPreview.end.worldPoint.y} />}
          </svg>
          <div className="math-interaction-overlay">
            {isSingle && (
              <button
                type="button"
                className="resize-handle-overlay"
                aria-label="拖曳調整長方形尺寸"
                style={{ left: `${resizeHandlePosition.left}%`, top: `${resizeHandlePosition.top}%` }}
                onPointerDown={beginResize}
                onPointerMove={handleResizePointerMove}
                onPointerUp={finishResize}
                onPointerCancel={finishResize}
                onWheel={handleWheel}
              >
                <span className="resize-handle-visual" aria-hidden="true">
                  <svg viewBox="0 0 20 20"><path d="M5 15 15 5M11 5h4v4" /></svg>
                </span>
              </button>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}

export default function MathVisualization({ onBack }) {
  const [page, setPage] = useState('concepts')
  if (page === 'rectangle') return <RectangleAreaTool onBack={() => setPage('area')} />
  if (page === 'area') return <AreaTemplates onBack={() => setPage('concepts')} onOpenRectangle={() => setPage('rectangle')} />
  return <ConceptsPage onBack={onBack} onOpenArea={() => setPage('area')} />
}
