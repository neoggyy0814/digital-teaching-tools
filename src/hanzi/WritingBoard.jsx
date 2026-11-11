import { useEffect, useLayoutEffect, useRef } from 'react'
import HanziWriter from 'hanzi-writer'
import { loadCharacterData } from './hanziData.js'
import StudentInk from './StudentInk.jsx'

export default function WritingBoard({ character, attemptKey, onComplete, onMistake }) {
  const boardRef = useRef(null)
  const writerLayerRef = useRef(null)
  const writerRef = useRef(null)
  const callbacksRef = useRef({ onComplete, onMistake })

  useEffect(() => {
    callbacksRef.current = { onComplete, onMistake }
  }, [onComplete, onMistake])

  useLayoutEffect(() => {
    const container = writerLayerRef.current
    if (!container) return undefined
    let active = true

    const writer = HanziWriter.create(container, character, {
      width: container.clientWidth,
      height: container.clientHeight,
      padding: Math.max(18, container.clientWidth * 0.055),
      showCharacter: false,
      showOutline: true,
      outlineColor: '#e1e5ea',
      strokeColor: '#8d98a5',
      drawingColor: 'rgba(15, 43, 82, 0)',
      drawingWidth: 32,
      strokeAnimationSpeed: 8,
      strokeFadeDuration: 120,
      delayBetweenStrokes: 0,
      highlightOnComplete: false,
      showHintAfterMisses: false,
      leniency: 1,
      charDataLoader: (requestedCharacter) => loadCharacterData(requestedCharacter),
    })
    writerRef.current = writer

    writer.quiz({
      onMistake: () => {
        if (!active) return
        callbacksRef.current.onMistake()
      },
      onComplete: () => {
        if (active) callbacksRef.current.onComplete()
      },
    })

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry || !active) return
      const size = Math.round(entry.contentRect.width)
      writer.updateDimensions({ width: size, height: size, padding: Math.max(18, size * 0.055) })
    })
    observer.observe(container)

    return () => {
      active = false
      observer.disconnect()
      writer.cancelQuiz()
      if (writerRef.current === writer) writerRef.current = null
      container.replaceChildren()
    }
  }, [attemptKey, character])

  return (
    <div ref={boardRef} className="writing-board" data-character={character}>
      <span className="grid-line grid-line-horizontal" />
      <span className="grid-line grid-line-vertical" />
      <div ref={writerLayerRef} className="writer-layer" />
      <StudentInk key={attemptKey} interactionRef={boardRef} />
    </div>
  )
}
