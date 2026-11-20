import { useEffect, useRef, useState } from 'react'
import './workshop.css'
import QuestionBoard from './QuestionBoard.jsx'
import CustomInstructions from './CustomInstructions.jsx'

const sections = [
  { title: '第一小時｜AI 觀念與日常應用', items: [
    ['01', '帳號登入', [['M365 教育帳號/Copilot 登入', '19-m365-login'], ['Chrome/ChatGPT 登入', '20-chatgpt-login'], ['平台及帳號辨識', '21-platform-accounts']]],
    ['02', 'AI 觀念與比較', [['對話型AI 與代理AI差異', '01-dialogue-agent'], ['Vibe Coding/氛圍式編程', '02-vibe-coding'], ['Copilot、ChatGPT、Codex比較與限制', '11-tool-comparison'], ['免費付費差異/額度政策', '12-usage-strategy'], ['上述三個工具在本次研習的分工', '03-tool-roles']]],
    ['03', '個人化自訂指令', [['個人化設定', '13-custom-instructions'], ['指令說明', '22-general-custom-instructions'], { instructions: true, label: '下載指令檔案' }, ['ChatGPT 設定', '23-chatgpt-personalization'], ['Copilot 設定', '24-copilot-personalization']]],
    ['04', '提示詞與需求工程', [['什麼是提示詞工程', '04-prompt'], ['什麼是需求工程', '05-requirements-llm'], ['提示詞教練', '14-prompt-coach'], ['專業名詞與術語', '15-technical-terms']]],
    ['05', '文書示範', ['展示既有對話歷程', '核實文件示範', '填報表單對照示範', '製作文件示範', '自由練習']],
    ['06', '圖像示範', ['展示既有對話歷程', '繪圖提示詞工程示範', '繪圖生成實例', '自由練習']],
  ]},
  { title: '第二小時｜Codex 代理實作', items: [
    ['07', '下載與登入', [['官方下載', '25-official-download'], ['安裝與登入', '26-install-signin'], ['介面導覽', '27-interface-tour'], ['模式辨識', '28-mode-identification'], ['開啟資料夾', '29-open-folder'], ['權限與安全', '30-permissions-safety']]],
    ['08', 'Agent 與額度', ['本機檔案操作', '任務自主執行', '額度檢視', 'Agent.md設定', ['先規劃再執行', '16-agent-permissions']]],
    ['09', '專案與工作流', [['工作流', '06-workflow'], '專案設定', ['需求工程', '07-requirements-agent'], ['需求規格', '08-specification'], ['驗收', '09-acceptance'], ['迭代與修正', '10-iteration']]],
    ['10', '單機網頁實作', [['說明實作範圍', '17-local-web-scope'], '參考範例', ['實作題目', '18-practice-topics'], '操作示範及練習', '如何檢查成果']],
    ['11', '討論與修正', [{ board: true, label: '收集教師操作上的疑問和困難' }, '回答疑問', '完美收尾']],
  ]},
]
const imageUrl = (id, format = 'png') => `${import.meta.env.BASE_URL}workshop/images/${id}.${format}`

export default function Workshop({ onBack }) {
  const [instructionsOpen, setInstructionsOpen] = useState(() => location.hash === '#workshop-instructions')
  const [image, setImage] = useState(null)
  const [boardOpen, setBoardOpen] = useState(false)
  const [preview, setPreview] = useState(null)
  const dialog = useRef(null)
  const trigger = useRef(null)

  useEffect(() => {
    const syncInstructions = () => {
      setInstructionsOpen(location.hash === '#workshop-instructions')
      setPreview(null)
    }
    window.addEventListener('hashchange', syncInstructions)
    return () => window.removeEventListener('hashchange', syncInstructions)
  }, [])

  useEffect(() => {
    if (instructionsOpen) window.scrollTo(0, 0)
  }, [instructionsOpen])

  useEffect(() => {
    if (location.hash === '#workshop-examples') document.getElementById('workshop-examples')?.scrollIntoView()
  }, [])

  useEffect(() => {
    if (!preview) return undefined
    const hide = () => setPreview(null)
    window.addEventListener('scroll', hide, true)
    window.addEventListener('resize', hide)
    return () => {
      window.removeEventListener('scroll', hide, true)
      window.removeEventListener('resize', hide)
    }
  }, [preview])

  const showPreview = (event, id) => {
    if (event.pointerType !== 'mouse' || !window.matchMedia('(any-hover: hover) and (any-pointer: fine)').matches) return
    const rect = event.currentTarget.getBoundingClientRect()
    const width = Math.min(520, window.innerWidth - 24, (window.innerHeight - 24) * 1.5)
    const height = width * 9 / 16 + 12
    const top = rect.top >= height + 20 ? rect.top - height - 8 : rect.bottom + 8
    setPreview({
      id, width,
      left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
      top: Math.max(12, Math.min(top, window.innerHeight - height - 12)),
    })
  }

  const openImage = (event, entry) => {
    trigger.current = event.currentTarget
    setPreview(null)
    setImage(entry)
    dialog.current.showModal()
  }

  const restoreFocus = () => {
    setImage(null)
    trigger.current?.focus({ preventScroll: true })
  }

  if (instructionsOpen) return <CustomInstructions />

  return <main className="workshop" id="workshop-top">
    <div className="workshop-inner">
      <button className="workshop-back" onClick={onBack}>← 返回網站入口</button>
      <header className="workshop-header">
        <p className="workshop-eyebrow">12/02 內惟資訊研習｜授課大綱</p>
        <h1>從聊天工具，變成工作夥伴：<wbr />Codex 實作</h1>
        <p className="workshop-meta"><span>2026 年 12 月 2 日 13:30–15:30</span><span>3F 電腦教室</span><span>許展華老師主講</span></p>
        <p className="workshop-hint">依照紙本大綱上課，點選 <strong>看圖</strong> 可放大觀念圖；桌面移到文字上可先預覽。</p>
      </header>
      {sections.map(section => <section className="workshop-section" key={section.title}>
        <h2>{section.title}</h2>
        <div className="workshop-list">{section.items.map(([number, title, entries]) => <article className="workshop-row" key={number}>
          <div className="workshop-row-heading"><span>{number}</span><h3>{title}</h3></div>
          <ul>{entries.map(entry => {
            if (typeof entry === 'string') return <li key={entry}>{entry}</li>
            if (entry.instructions) return <li key="custom-instructions"><a className="workshop-ref-link" href="#workshop-instructions">{entry.label}</a></li>
            if (entry.board) return <li key={entry.label}><button className="workshop-image-link" aria-expanded={boardOpen} aria-controls="workshop-questions" onClick={() => setBoardOpen(open => !open)}>{entry.label} <span>留言板</span></button></li>
            return <li key={entry[1]}><button className="workshop-image-link" aria-haspopup="dialog"
              onPointerEnter={e => showPreview(e, entry[1])} onPointerLeave={() => setPreview(null)}
              onClick={e => openImage(e, entry)}>{entry[0]} <span>看圖</span></button></li>
          })}</ul>
        </article>)}</div>
      </section>)}
      {boardOpen && <QuestionBoard />}
    </div>
    {preview && <div className="workshop-hover-preview" aria-hidden="true" style={{ left: preview.left, top: preview.top, width: preview.width }}>
      <img src={imageUrl(preview.id, 'webp')} alt="" width="640" height="360" />
    </div>}
    <dialog ref={dialog} className="workshop-dialog" aria-label={image?.[0] ?? '觀念圖'} onClose={restoreFocus}
      onClick={e => { if (e.target === e.currentTarget) dialog.current.close() }}>
      <div className="workshop-viewer">
        <button autoFocus onClick={() => dialog.current.close()} aria-label="關閉圖片">關閉 ✕</button>
        {image && <img src={imageUrl(image[1])} alt={image[0] + '觀念圖'} width="1600" height="900" />}
      </div>
    </dialog>
  </main>
}
