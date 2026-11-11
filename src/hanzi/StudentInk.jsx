import { useCallback, useEffect, useRef, useState } from 'react'

function getPoint(event, element) {
  const bounds = element.getBoundingClientRect()
  return {
    x: ((event.clientX - bounds.left) / bounds.width) * 1000,
    y: ((event.clientY - bounds.top) / bounds.height) * 1000,
  }
}

function pathFromPoints(points) {
  if (!points.length) return ''
  return points.reduce((path, point, index) => `${path}${index ? ' L' : 'M'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`, '')
}

export default function StudentInk({ interactionRef, disabled = false }) {
  const layerRef = useRef(null)
  const activePointer = useRef(null)
  const currentPoints = useRef([])
  const [paths, setPaths] = useState([])
  const [activePath, setActivePath] = useState('')

  const finishStroke = useCallback((event) => {
    if (activePointer.current !== event.pointerId) return
    const path = pathFromPoints(currentPoints.current)
    if (path) setPaths((current) => [...current, path])
    setActivePath('')
    currentPoints.current = []
    activePointer.current = null
  }, [])

  useEffect(() => {
    const interactionLayer = interactionRef.current
    if (!interactionLayer) return undefined

    const pointerDown = (event) => {
      if (disabled || activePointer.current !== null) return
      activePointer.current = event.pointerId
      currentPoints.current = [getPoint(event, layerRef.current)]
      setActivePath(pathFromPoints(currentPoints.current))
    }
    const pointerMove = (event) => {
      if (disabled || activePointer.current !== event.pointerId) return
      const lastPoint = currentPoints.current.at(-1)
      const nextPoint = getPoint(event, layerRef.current)
      if (Math.hypot(nextPoint.x - lastPoint.x, nextPoint.y - lastPoint.y) < 3) return
      currentPoints.current.push(nextPoint)
      setActivePath(pathFromPoints(currentPoints.current))
    }
    interactionLayer.addEventListener('pointerdown', pointerDown, true)
    interactionLayer.addEventListener('pointermove', pointerMove, true)
    interactionLayer.addEventListener('pointerup', finishStroke, true)
    interactionLayer.addEventListener('pointercancel', finishStroke, true)
    return () => {
      interactionLayer.removeEventListener('pointerdown', pointerDown, true)
      interactionLayer.removeEventListener('pointermove', pointerMove, true)
      interactionLayer.removeEventListener('pointerup', finishStroke, true)
      interactionLayer.removeEventListener('pointercancel', finishStroke, true)
    }
  }, [disabled, finishStroke, interactionRef])

  return (
    <svg
      ref={layerRef}
      className="student-ink"
      viewBox="0 0 1000 1000"
      aria-hidden="true"
    >
      {paths.map((path, index) => <path d={path} key={index} />)}
      {activePath && <path d={activePath} />}
    </svg>
  )
}
