import { useCallback, useEffect, useRef, useState } from 'react'
import HanziGlyph from './HanziGlyph.jsx'
import HanziDataAttribution from './HanziDataAttribution.jsx'
import WritingBoard from './WritingBoard.jsx'
import { normalizeHanziInput, validateCharacters } from './hanziData.js'
import './hanziPractice.css'

const COMPLETION_GUARD_MS = 300

function ExitIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10 4H5v16h5M14 8l4 4-4 4M8 12h10" />
    </svg>
  )
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m15 5-7 7 7 7" />
    </svg>
  )
}

function InputScreen({ onStart, onBack }) {
  const [value, setValue] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const start = async () => {
    const characters = normalizeHanziInput(value)
    if (!characters.length) {
      setMessage('請先輸入至少一個中文字。')
      return
    }

    setLoading(true)
    setMessage('正在確認筆畫資料…')
    const unsupported = await validateCharacters(characters)
    setLoading(false)
    if (unsupported.length) {
      setMessage(`「${unsupported.join('、')}」目前不在台灣教育部標準字體筆順資料中。請移除後再開始。`)
      return
    }
    onStart(characters)
  }

  return (
    <main className="hanzi-tool hanzi-input-screen">
      <button type="button" className="hanzi-exit" onClick={onBack}><ExitIcon />返回工具入口</button>
      <section className="input-intro">
        <div className="input-heading">
          <h1>國語：筆順練習</h1>
          <p>輸入一個或多個中文字，按下開始後再進行書寫。</p>
          <HanziDataAttribution />
        </div>
        <div className="input-panel">
          <label htmlFor="hanzi-input">要練習的中文字</label>
          <textarea
            id="hanzi-input"
            value={value}
            onChange={(event) => { setValue(event.target.value); setMessage('') }}
            placeholder="例如：春風又綠江南岸"
            rows="4"
            autoFocus
          />
          <div className="input-actions">
            <p className={message.startsWith('「') || message.startsWith('請先') ? 'input-message is-error' : 'input-message'} aria-live="polite">{message}</p>
            <button type="button" className="primary-action" onClick={start} disabled={loading}>
              {loading ? '載入中…' : '開始練習'}
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}

function Sequence({ characters, currentIndex }) {
  return (
    <div className="character-sequence" aria-label="此次練習字序">
      {characters.map((character, index) => (
        <span
          className={`${index === currentIndex ? 'is-current' : ''} ${index < currentIndex ? 'is-visited' : ''}`}
          key={`${character}-${index}`}
          aria-current={index === currentIndex ? 'step' : undefined}
        >
          {character}
        </span>
      ))}
    </div>
  )
}

function NextCharacterPreview({ character, previewRef }) {
  if (!character) return null
  return (
    <aside ref={previewRef} className="next-character-preview" aria-label={`下一字：${character}`}>
      <div className="next-character-grid">
        <span className="preview-guide preview-guide-horizontal" />
        <span className="preview-guide preview-guide-vertical" />
        <HanziGlyph character={character} />
      </div>
    </aside>
  )
}

function FinishedScreen({ characters, onRestart, onExit }) {
  return (
    <main className="hanzi-tool hanzi-finished-screen">
      <button type="button" className="hanzi-exit" onClick={onExit}><ExitIcon />退出</button>
      <section className="finished-content">
        <p>{characters.join('')}</p>
        <h1>練習完成</h1>
        <div className="finished-actions control-row">
          <button type="button" className="secondary-action" onClick={onRestart}>再練習一次</button>
          <button type="button" className="primary-action" onClick={onExit}>返回輸入</button>
        </div>
      </section>
    </main>
  )
}

function PracticeScreen({ characters, onExit }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [attemptKey, setAttemptKey] = useState(0)
  const [result, setResult] = useState(null)
  const [hasMistake, setHasMistake] = useState(false)
  const [finished, setFinished] = useState(false)
  const [transitioning, setTransitioning] = useState(false)
  const [transitionDirection, setTransitionDirection] = useState(null)
  const [transitionTarget, setTransitionTarget] = useState(null)
  const stageRef = useRef(null)
  const mainColumnRef = useRef(null)
  const nextPreviewRef = useRef(null)
  const transitionLock = useRef(false)
  const mistakeRef = useRef(false)
  const completionAtRef = useRef(0)
  const lastPointerDownAtRef = useRef(0)

  const resetAttempt = useCallback(() => {
    mistakeRef.current = false
    completionAtRef.current = 0
    lastPointerDownAtRef.current = 0
    setHasMistake(false)
    setResult(null)
    setAttemptKey((key) => key + 1)
  }, [])

  const goTo = useCallback((nextIndex) => {
    if (transitionLock.current || nextIndex < 0 || nextIndex >= characters.length) return
    transitionLock.current = true
    setTransitionDirection(nextIndex > currentIndex ? 'next' : 'previous')
    setTransitionTarget(nextIndex)
    setTransitioning(true)
  }, [characters.length, currentIndex])

  useEffect(() => {
    if (!transitioning || transitionTarget === null) return undefined

    const stage = stageRef.current
    const mainColumn = mainColumnRef.current
    const currentBoard = mainColumn?.querySelector('.writing-board')
    const nextPreview = nextPreviewRef.current
    if (!stage || !mainColumn || !currentBoard) {
      setCurrentIndex(transitionTarget)
      mistakeRef.current = false
      completionAtRef.current = 0
      lastPointerDownAtRef.current = 0
      setHasMistake(false)
      setResult(null)
      setAttemptKey((key) => key + 1)
      setTransitioning(false)
      setTransitionDirection(null)
      setTransitionTarget(null)
      transitionLock.current = false
      return undefined
    }

    const duration = 320
    const easing = 'cubic-bezier(.22, .8, .24, 1)'
    const stageRect = stage.getBoundingClientRect()
    const mainRect = mainColumn.getBoundingClientRect()
    const boardRect = currentBoard.getBoundingClientRect()
    const animations = []

    if (transitionDirection === 'next' && nextPreview) {
      const previewRect = nextPreview.getBoundingClientRect()
      const currentTravel = stageRect.left - mainRect.right - 24
      const nextTravel = boardRect.left - previewRect.left
      animations.push(
        mainColumn.animate(
          [
            { transform: 'translateX(0)', opacity: 1 },
            { transform: `translateX(${currentTravel}px)`, opacity: 0 },
          ],
          { duration, easing, fill: 'forwards' },
        ),
        nextPreview.animate(
          [
            { transform: 'translateY(-50%)', opacity: 0.24 },
            { transform: `translate(${nextTravel}px, -50%)`, opacity: 1 },
          ],
          { duration, easing, fill: 'forwards' },
        ),
      )
    } else {
      animations.push(mainColumn.animate(
        [
          { transform: 'translateX(0)', opacity: 1 },
          { transform: 'translateX(18%)', opacity: 0 },
        ],
        { duration, easing, fill: 'forwards' },
      ))
    }

    let active = true
    Promise.allSettled(animations.map((animation) => animation.finished)).then(() => {
      if (!active) return
      setCurrentIndex(transitionTarget)
      mistakeRef.current = false
      completionAtRef.current = 0
      lastPointerDownAtRef.current = 0
      setHasMistake(false)
      setResult(null)
      setAttemptKey((key) => key + 1)
      setTransitioning(false)
      setTransitionDirection(null)
      setTransitionTarget(null)
      transitionLock.current = false
    })

    return () => {
      active = false
      animations.forEach((animation) => animation.cancel())
    }
  }, [transitionDirection, transitioning, transitionTarget])

  const goNext = useCallback(() => {
    if (transitionLock.current) return
    if (currentIndex === characters.length - 1) {
      setFinished(true)
      return
    }
    goTo(currentIndex + 1)
  }, [characters.length, currentIndex, goTo])

  if (finished) {
    return <FinishedScreen characters={characters} onRestart={() => {
      transitionLock.current = false
      setFinished(false)
      setCurrentIndex(0)
      resetAttempt()
      setTransitioning(false)
      setTransitionDirection(null)
      setTransitionTarget(null)
    }} onExit={onExit} />
  }

  const currentCharacter = characters[currentIndex]
  const nextCharacter = characters[currentIndex + 1]

  return (
    <main className="hanzi-tool hanzi-practice-screen">
      <header className="practice-toolbar">
        <button type="button" className="toolbar-exit" onClick={onExit}><BackIcon />退出</button>
        <h1>國語：筆順練習</h1>
      </header>
      <aside className="practice-sidebar">
        <Sequence characters={characters} currentIndex={currentIndex} />
        <p className="practice-progress"><strong>{currentIndex + 1}</strong><span>/</span>{characters.length}</p>
      </aside>

      <section
        className={`practice-workspace ${transitioning ? 'is-transitioning' : ''} ${transitionDirection ? `is-${transitionDirection}` : ''}`}
        onPointerDownCapture={() => {
          lastPointerDownAtRef.current = Date.now()
        }}
        onClick={(event) => {
          const guardHasElapsed = Date.now() - completionAtRef.current >= COMPLETION_GUARD_MS
          const beganAfterCompletion = lastPointerDownAtRef.current > completionAtRef.current
          if (result === 'correct' && guardHasElapsed && beganAfterCompletion && !event.target.closest('button')) goNext()
        }}
      >
        <div className="mobile-sequence-row">
          <p className="practice-progress"><strong>{currentIndex + 1}</strong><span>/</span>{characters.length}</p>
          <Sequence characters={characters} currentIndex={currentIndex} />
        </div>

        <div ref={stageRef} className="practice-stage">
          <div ref={mainColumnRef} className="main-practice-column">
            <p className={`result-status ${result ? `is-${result}` : ''}`} aria-live="polite">
              {result === 'correct' ? '正確' : result === 'mistake' ? '錯誤' : '\u00a0'}
            </p>
            <WritingBoard
              character={currentCharacter}
              attemptKey={attemptKey}
              onMistake={() => {
                mistakeRef.current = true
                setHasMistake(true)
                setResult('mistake')
              }}
              onComplete={() => {
                if (mistakeRef.current) {
                  setResult('mistake')
                  return
                }
                completionAtRef.current = Date.now()
                setResult('correct')
              }}
            />
          </div>
          <NextCharacterPreview character={nextCharacter} previewRef={nextPreviewRef} />
        </div>

        <div className="practice-controls" onClick={(event) => event.stopPropagation()}>
          <button type="button" disabled={currentIndex === 0 || transitioning} onClick={() => goTo(currentIndex - 1)}>上一字</button>
          <button type="button" disabled={transitioning} onClick={resetAttempt}>更正</button>
          <button type="button" className="next-control" disabled={transitioning} onClick={goNext}>下一字</button>
        </div>
        <span className="mistake-state" data-has-mistake={hasMistake} hidden />
      </section>
    </main>
  )
}

export default function HanziPractice({ onBack }) {
  const [characters, setCharacters] = useState(null)

  if (!characters) return <InputScreen onStart={setCharacters} onBack={onBack} />
  return <PracticeScreen characters={characters} onExit={() => setCharacters(null)} />
}
