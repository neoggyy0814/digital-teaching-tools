import { useEffect, useRef, useState } from 'react'
import './aiStories.css'

const TYPE_INTERVAL_MS = 28
const SWIPE_THRESHOLD = 48
const DOT_TARGET_WIDTH = 24

function StoryText({ paragraphs }) {
  const [visible, setVisible] = useState(0)
  const characters = paragraphs.map((paragraph) => Array.from(paragraph))
  const total = characters.reduce((count, paragraph) => count + paragraph.length, 0)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const start = performance.now()
    let frame
    const reveal = (now) => {
      const count = Math.min(total, 1 + Math.floor((now - start) / TYPE_INTERVAL_MS))
      setVisible(count)
      if (count < total) frame = requestAnimationFrame(reveal)
    }
    frame = requestAnimationFrame(reveal)
    return () => cancelAnimationFrame(frame)
  }, [total])

  return (
    <>
      <div className="stories-text-full">{paragraphs.map((paragraph, i) => <p key={i}>{paragraph}</p>)}</div>
      <div className="stories-text-animated" aria-hidden="true">
        {characters.map((paragraph, i) => {
          const preceding = characters.slice(0, i).reduce((count, line) => count + line.length, 0)
          const count = Math.max(0, visible - preceding)
          return <p key={i}>{paragraph.slice(0, count).join('')}<span>{paragraph.slice(count).join('')}</span></p>
        })}
      </div>
    </>
  )
}

function StoryNotes({ paragraphs, open, setOpen }) {
  const heldPointer = useRef(null)
  const hovered = useRef(false)
  const keyboard = useRef(false)
  const closeTimer = useRef(null)
  const panel = useRef(null)

  useEffect(() => () => clearTimeout(closeTimer.current), [])

  function release(event) {
    if (heldPointer.current?.id !== event.pointerId) return
    heldPointer.current = null
    setOpen(false)
  }

  function scrollWhileHeld(event) {
    const held = heldPointer.current
    if (held?.id !== event.pointerId) return
    panel.current.scrollTop += held.y - event.clientY
    held.y = event.clientY
  }

  function enter(event) {
    if (event.pointerType !== 'mouse') return
    clearTimeout(closeTimer.current)
    hovered.current = true
    setOpen(true)
  }

  function leave(event) {
    if (event.pointerType !== 'mouse') return
    hovered.current = false
    clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => {
      if (!keyboard.current && heldPointer.current === null) setOpen(false)
    }, 350)
  }

  return (
    <aside className="stories-notes"
      onBlur={(event) => {
        if (event.currentTarget.contains(event.relatedTarget)) return
        keyboard.current = false
        if (!hovered.current && heldPointer.current === null) setOpen(false)
      }}
    >
      <button type="button" className="stories-note-trigger" aria-expanded={open} aria-controls="story-notes"
        onPointerLeave={leave}
        onPointerEnter={enter}
        onPointerDown={(event) => {
          if (event.pointerType === 'mouse' || !event.isPrimary) return
          heldPointer.current = { id: event.pointerId, y: event.clientY }
          event.currentTarget.setPointerCapture(event.pointerId)
          setOpen(true)
        }}
        onPointerMove={scrollWhileHeld} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release}
        onContextMenu={(event) => event.preventDefault()}
        onClick={(event) => {
          if (event.detail !== 0) return
          keyboard.current = !open
          setOpen(!open)
        }}
      >
        <span aria-hidden="true" className="stories-note-icon">✦</span>
        <span className="stories-note-mouse">查看說明</span>
        <span className="stories-note-touch">觸控查看說明</span>
      </button>
      <div id="story-notes" ref={panel} className="stories-note-panel" hidden={!open} tabIndex={0}
        role="region" aria-label="篇章說明" onPointerEnter={enter} onPointerLeave={leave}>
        {open && <StoryText paragraphs={paragraphs} />}
      </div>
    </aside>
  )
}

function StoryPagination({ episodes, index, goTo }) {
  const dotSlot = useRef(null)
  const [dotCapacity, setDotCapacity] = useState(0)
  const total = episodes.length

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      setDotCapacity(Math.floor(entry.contentRect.width / DOT_TARGET_WIDTH))
    })
    observer.observe(dotSlot.current)
    return () => observer.disconnect()
  }, [])

  return (
    <nav className="stories-pagination" aria-label="選擇篇章">
      <button className="stories-arrow" type="button" aria-label="上一篇" aria-disabled={index === 0} onClick={() => goTo(index - 1)}><span aria-hidden="true">‹</span></button>
      <div className="stories-position">
        <p className="stories-count" aria-live="polite" aria-atomic="true">
          {index + 1} / {total}<span className="stories-visually-hidden">，{episodes[index].title}</span>
        </p>
        <div className="stories-dot-slot" ref={dotSlot} style={{ '--chapter-count': total, '--dot-target-width': `${DOT_TARGET_WIDTH}px` }}>
          {total <= dotCapacity ? (
            <div className="stories-dots control-row">
              {episodes.map((item, i) => (
                <button key={item.image} type="button" aria-label={`第 ${i + 1} 篇：${item.title}`} aria-current={i === index ? 'true' : undefined} onClick={() => goTo(i)} />
              ))}
            </div>
          ) : (
            <select className="stories-jump" aria-label="跳至篇章" value={index}
              onChange={(event) => goTo(Number(event.target.value))} onKeyDown={(event) => event.stopPropagation()}>
              {episodes.map((item, i) => <option key={item.image} value={i}>第 {i + 1} 篇</option>)}
            </select>
          )}
        </div>
      </div>
      <button className="stories-arrow" type="button" aria-label="下一篇" aria-disabled={index === total - 1} onClick={() => goTo(index + 1)}><span aria-hidden="true">›</span></button>
    </nav>
  )
}

export default function AiStories({ batch, onBack, backIcon }) {
  const { episodes, label } = batch
  const [index, setIndex] = useState(0)
  const [notesOpen, setNotesOpen] = useState(false)
  const heading = useRef(null)
  const swipe = useRef(null)
  const episode = episodes[index]
  const total = episodes.length

  useEffect(() => { heading.current.focus({ preventScroll: true }) }, [])

  function goTo(next) {
    if (next < 0 || next >= total || next === index) return
    setNotesOpen(false)
    setIndex(next)
  }

  function startSwipe(event) {
    if (event.pointerType !== 'touch' || !event.isPrimary) return
    swipe.current = { id: event.pointerId, x: event.clientX, y: event.clientY }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function endSwipe(event) {
    const start = swipe.current
    if (start?.id !== event.pointerId) return
    swipe.current = null
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    if (Math.abs(dx) >= SWIPE_THRESHOLD && Math.abs(dx) > 1.4 * Math.abs(dy)) {
      goTo(index + (dx < 0 ? 1 : -1))
    }
  }

  function cancelSwipe(event) {
    if (swipe.current?.id === event.pointerId) swipe.current = null
  }

  function handleKeys(event) {
    if (event.key === 'Escape' && notesOpen) {
      event.preventDefault()
      setNotesOpen(false)
    }
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      goTo(index + (event.key === 'ArrowLeft' ? -1 : 1))
    }
  }

  return (
    <main className="stories-page" onKeyDown={handleKeys}>
      <div className="stories-shell">
        <header className="stories-masthead">
          <button type="button" className="back-button" onClick={onBack}>{backIcon} 返回工具入口</button>
          <div className="stories-series">AI 二三事 <span>{label}</span></div>
        </header>
        <div className="stories-heading">
          <span className="stories-episode">第 {String(index + 1).padStart(2, '0')} 篇</span>
          <h1 ref={heading} tabIndex={-1}>{episode.title}</h1>
        </div>
        <p className="stories-orientation-hint">建議橫向觀看，漫畫更清楚</p>
        <div className="stories-art" style={{ '--comic-ratio': episode.width / episode.height }}
          onPointerDown={startSwipe} onPointerUp={endSwipe} onPointerCancel={cancelSwipe} onLostPointerCapture={cancelSwipe}>
          <img key={episode.image} src={`${import.meta.env.BASE_URL}${episode.image}`} width={episode.width} height={episode.height} alt={episode.alt} draggable={false} />
        </div>
        <StoryPagination episodes={episodes} index={index} goTo={goTo} />
        <StoryNotes paragraphs={episode.paragraphs} open={notesOpen} setOpen={setNotesOpen} />
      </div>
    </main>
  )
}
