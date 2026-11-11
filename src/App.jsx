import { useCallback, useEffect, useRef, useState } from 'react'
import HanziPractice from './hanzi/HanziPractice.jsx'
import Workshop from './workshop/Workshop.jsx'
import HanziGlyph from './hanzi/HanziGlyph.jsx'
import HanziDataAttribution from './hanzi/HanziDataAttribution.jsx'
import MathVisualization, { ConceptVisual } from './math/MathVisualization.jsx'
import AiStories from './ai-stories/AiStories.jsx'
import { storyBatches } from './ai-stories/batches.js'

const workshopHashes = new Set(['#workshop-20261202', '#workshop-top', '#workshop-examples'])

function requestStoryLandscape() {
  if (!matchMedia('(orientation: portrait) and (any-pointer: coarse)').matches) return
  const orientation = screen.orientation
  if (typeof orientation?.lock !== 'function' || typeof orientation.unlock !== 'function') return

  let requested = true
  try {
    orientation.lock('landscape').catch(() => { requested = false })
  } catch {
    return
  }

  return () => {
    if (!requested) return
    try {
      orientation.unlock()
    } catch {
      // The browser may have already reset the lock as the document lost access.
    }
  }
}

const tools = [
  { id: 'math', title: '數學：視覺化', short: '數學', tone: 'coral', icon: 'math-visualization' },
  { id: 'hanzi', title: '國語：筆順練習', short: '國語', tone: 'blue', icon: 'pencil' },
  { id: 'ai-stories', title: 'AI 二三事', short: 'AI', tone: 'teal', icon: 'comic' },
  { id: 'workshop', title: '研習資訊', short: '研習', tone: 'gold', icon: 'presentation' },
]

function ArrowIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M14 6l6 6-6 6" /></svg>
}

function ToolIcon({ type }) {
  if (type === 'math-visualization') return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M7 36h10V26H7v10Zm12 0h10V19H19v17Zm12 0h10V10H31v26Z" /><path d="m9 18 8-8 8 8M17 10v11" />
    </svg>
  )
  if (type === 'pencil') return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="m11 36 3-10L33 7l8 8-19 19-11 2Z" /><path d="m29 11 8 8M14 26l8 8" />
    </svg>
  )
  if (type === 'comic') return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M28 13H12a5 5 0 0 0-5 5v13a5 5 0 0 0 5 5h3v6l8-6h12a5 5 0 0 0 5-5v-7" />
      <path d="M15 23h12m-12 6h17M37 6c0 5-3 8-8 8 5 0 8 3 8 8 0-5 3-8 8-8-5 0-8-3-8-8Z" />
    </svg>
  )
  if (type === 'presentation') return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <rect x="8" y="10" width="32" height="22" rx="2" />
      <path d="M5 10h38M24 6v4m0 22v8m0-5-8 7m8-7 8 7M15 18h18m-18 6h12" />
    </svg>
  )
  return null
}

function MathOverviewCanvas() {
  return (
    <div className="math-overview-canvas" aria-label="分數、角度、面積、周長與立體圖形的數學視覺化示意">
      <div className="overview-visual overview-fraction"><ConceptVisual type="fraction" /></div>
      <div className="overview-visual overview-angle"><ConceptVisual type="angle" /></div>
      <div className="overview-visual overview-area"><ConceptVisual type="area" /></div>
      <div className="overview-visual overview-perimeter"><ConceptVisual type="perimeter" /></div>
      <div className="overview-visual overview-solid"><ConceptVisual type="solid" /></div>
      <span className="overview-label label-break">拆解</span>
      <span className="overview-label label-compare">比較</span>
      <span className="overview-label label-transform">變換</span>
    </div>
  )
}

function MathPreview({ onOpen }) {
  return (
    <div className="preview-content math-preview">
      <div className="preview-heading">
        <h2>數學視覺化</h2>
        <span className="heading-rule" />
        <p>透過圖形、動畫與互動操作，看見數學概念與關係。</p>
      </div>
      <MathOverviewCanvas />
      <button className="open-button" onClick={onOpen}>進入工具 <ArrowIcon /></button>
    </div>
  )
}

function HanziPreview({ onOpen }) {
  return (
    <div className="preview-content hanzi-preview">
      <div className="preview-heading">
        <h2>國語：筆順練習</h2>
        <span className="heading-rule" />
        <p>輸入文字，查看筆畫順序，再跟著格線逐步練習。</p>
        <HanziDataAttribution />
      </div>
      <div className="hanzi-preview-stage">
        <div className="hanzi-preview-board">
          <span className="hanzi-preview-guide is-horizontal" />
          <span className="hanzi-preview-guide is-vertical" />
          <HanziGlyph character="永" />
          <svg className="hanzi-preview-student-ink" viewBox="0 0 1024 1024" aria-hidden="true">
            <g transform="translate(0 900) scale(1 -1)">
              <path d="M 428 824 L 503 781 L 533 756 L 539 741" />
            </g>
          </svg>
        </div>
      </div>
      <button className="open-button blue-button" onClick={onOpen}>進入工具 <ArrowIcon /></button>
    </div>
  )
}

function StoriesMenu({ onOpen }) {
  return (
    <div className="preview-content workshop-menu stories-menu">
      <div className="preview-heading">
        <h2>AI 二三事</h2>
        <span className="heading-rule" />
        <p>閱讀科普漫畫，認識 AI 的基本觀念。</p>
      </div>
      {storyBatches.map((batch) => (
        <button key={batch.id} className="workshop-menu-item" onClick={() => onOpen(batch)}>
          AI二三事：{batch.label}{batch.episodes.length}篇 <ArrowIcon />
        </button>
      ))}
    </div>
  )
}

function Preview({ tool, onOpen }) {
  if (tool.id === 'ai-stories') return <StoriesMenu onOpen={onOpen} />
  if (tool.id === 'workshop') return <div className="preview-content workshop-menu"><div className="preview-heading"><h2>研習資訊</h2><span className="heading-rule" /><p>選擇研習，查看互動式授課大綱。</p></div><button className="workshop-menu-item" onClick={onOpen}>20261202資訊研習：CODEX實作 <ArrowIcon /></button></div>
  if (tool.id === 'math') return <MathPreview onOpen={onOpen} />
  return <HanziPreview onOpen={onOpen} />
}

function ToolDestination({ tool, storyBatch, onBack }) {
  if (tool.id === 'ai-stories') return <AiStories batch={storyBatch} onBack={onBack} backIcon={<ArrowIcon />} />
  if (tool.id === 'workshop') return <Workshop onBack={onBack} />
  if (tool.id === 'hanzi') return <HanziPractice onBack={onBack} />
  return <MathVisualization onBack={onBack} />
}

export default function App() {
  const [uiState, setUiState] = useState('collapsed')
  const [selectedId, setSelectedId] = useState(null)
  const [openId, setOpenId] = useState(() => workshopHashes.has(location.hash) ? 'workshop' : null)
  const [storyBatch, setStoryBatch] = useState(null)
  const returnToStories = useRef(false)
  const releaseStoryLandscape = useRef(null)
  const lastPointerType = useRef('mouse')
  const uiStateRef = useRef('collapsed')
  const interactionActive = useRef(false)
  const inactivityTimer = useRef(null)
  const previewExitTimer = useRef(null)

  const isPrecise = useCallback(() => window.matchMedia('(hover: hover) and (pointer: fine)').matches, [])

  const transitionTo = useCallback((nextState) => {
    uiStateRef.current = nextState
    setUiState(nextState)
  }, [])

  useEffect(() => {
    const syncWorkshop = () => {
      if (workshopHashes.has(location.hash)) {
        setOpenId('workshop')
        transitionTo('open')
      } else if (openId === 'workshop') {
        setOpenId(null)
        setSelectedId(null)
        transitionTo('collapsed')
      }
    }
    window.addEventListener('hashchange', syncWorkshop)
    return () => window.removeEventListener('hashchange', syncWorkshop)
  }, [openId, transitionTo])

  const clearInactivityTimer = useCallback(() => {
    clearTimeout(inactivityTimer.current)
    inactivityTimer.current = null
  }, [])

  const scheduleCollapse = useCallback(() => {
    clearInactivityTimer()
    if (!isPrecise() || interactionActive.current || uiStateRef.current !== 'peek') return

    inactivityTimer.current = setTimeout(() => {
      if (!interactionActive.current && uiStateRef.current === 'peek') {
        setSelectedId(null)
        transitionTo('collapsed')
      }
    }, 1000)
  }, [clearInactivityTimer, isPrecise, transitionTo])

  useEffect(() => {
    const handlePointerMove = (event) => {
      if (event.pointerType === 'touch' || !isPrecise()) return
      lastPointerType.current = event.pointerType
      clearInactivityTimer()

      if (uiStateRef.current === 'collapsed') transitionTo('peek')
      if (!interactionActive.current && uiStateRef.current !== 'preview') scheduleCollapse()
    }
    const markKeyboard = () => { lastPointerType.current = 'keyboard' }
    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    window.addEventListener('keydown', markKeyboard)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('keydown', markKeyboard)
    }
  }, [clearInactivityTimer, isPrecise, scheduleCollapse, transitionTo])

  useEffect(() => () => {
    clearTimeout(inactivityTimer.current)
    clearTimeout(previewExitTimer.current)
  }, [])

  useEffect(() => {
    if (openId !== 'ai-stories') return
    const release = releaseStoryLandscape.current
    return () => release?.()
  }, [openId])

  const previewTool = (tool) => {
    clearInactivityTimer()
    setSelectedId(tool.id)
    transitionTo('preview')
  }

  const openTool = (id, batch) => {
    clearInactivityTimer()
    clearTimeout(previewExitTimer.current)
    setOpenId(id)
    if (id === 'ai-stories') {
      releaseStoryLandscape.current = requestStoryLandscape()
      setStoryBatch(batch)
    }
    if (id === 'workshop') history.replaceState(null, '', '#workshop-20261202')
    transitionTo('open')
  }

  const handleClick = (event, tool) => {
    if (tool.id === 'workshop' || tool.id === 'ai-stories') { previewTool(tool); return }
    if (event.detail === 0 || lastPointerType.current === 'mouse') {
      openTool(tool.id)
      return
    }
    if (selectedId === tool.id && uiState === 'preview') openTool(tool.id)
    else previewTool(tool)
  }

  const selectedTool = tools.find((tool) => tool.id === selectedId)
  const openToolData = tools.find((tool) => tool.id === openId)

  if (openToolData) return (
    <ToolDestination tool={openToolData} storyBatch={storyBatch} onBack={() => {
      if (openToolData.id === 'workshop') history.replaceState(null, '', location.pathname + location.search)
      returnToStories.current = openToolData.id === 'ai-stories'
      setOpenId(null)
      setSelectedId(openToolData.id)
      transitionTo('preview')
    }} />
  )

  return (
    <main className={`app-shell state-${uiState}`}>
      <header className="site-header">
        <h1 aria-label="內惟國小數位教學工具網站">
          {[...'內惟國小數位教學工具網站'].map((char, index) => (
            <span key={`${char}-${index}`} style={{ '--char-delay': `${45 + index * 82}ms` }}>{char}</span>
          ))}
        </h1>
        <p className="site-purpose">本網站供非商業教學使用。</p>
      </header>

      <section
        className="folder-stage"
        aria-label="數位教學工具"
        onPointerEnter={(event) => {
          if (event.pointerType !== 'mouse' || !isPrecise()) return
          interactionActive.current = true
          clearInactivityTimer()
          clearTimeout(previewExitTimer.current)
          if (uiStateRef.current === 'collapsed') transitionTo('peek')
        }}
        onPointerLeave={(event) => {
          if (event.pointerType !== 'mouse' || !isPrecise()) return
          interactionActive.current = false
          clearTimeout(previewExitTimer.current)
          previewExitTimer.current = setTimeout(() => {
            setSelectedId(null)
            if (uiStateRef.current === 'preview') transitionTo('peek')
            scheduleCollapse()
          }, 140)
        }}
        onFocusCapture={() => {
          interactionActive.current = true
          clearInactivityTimer()
          clearTimeout(previewExitTimer.current)
        }}
        onBlurCapture={(event) => {
          if (event.currentTarget.contains(event.relatedTarget)) return
          interactionActive.current = false
          setSelectedId(null)
          if (uiStateRef.current === 'preview') transitionTo('peek')
          scheduleCollapse()
        }}
      >
        {!selectedTool && (
          <div className="homepage-classroom">
            <iframe
              src={`${import.meta.env.BASE_URL}classroom-animation/index.html`}
              title="像素風教室：教師授課與四位學生聽課的八秒循環動畫"
              tabIndex={-1}
            />
          </div>
        )}
        <nav className="tool-rail" aria-label="工具選單">
          {tools.map((tool) => (
            <button
              key={tool.id}
              ref={(button) => {
                if (button && tool.id === 'ai-stories' && returnToStories.current) {
                  returnToStories.current = false
                  button.focus()
                }
              }}
              className={`tool-tab tone-${tool.tone} ${selectedId === tool.id ? 'is-selected' : ''}`}
              aria-label={tool.title}
              aria-expanded={selectedId === tool.id}
              onPointerDown={(event) => { lastPointerType.current = event.pointerType }}
              onPointerEnter={(event) => { if (event.pointerType === 'mouse' && isPrecise()) previewTool(tool) }}
              onFocus={() => { if (lastPointerType.current !== 'touch') previewTool(tool) }}
              onClick={(event) => handleClick(event, tool)}
            >
              <span className="tab-icon"><ToolIcon type={tool.icon} /></span>
              <span className="tab-copy"><strong>{tool.title}</strong><small>{tool.short}</small></span>
            </button>
          ))}
        </nav>

        <div className={`workspace-sheet tone-${selectedTool?.tone ?? 'coral'}`} aria-live="polite">
          {selectedTool && <Preview tool={selectedTool} onOpen={(batch) => openTool(selectedTool.id, batch)} />}
        </div>
      </section>
    </main>
  )
}
