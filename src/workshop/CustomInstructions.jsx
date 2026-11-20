import { useEffect, useState } from 'react'

const instructionUrl = `${import.meta.env.BASE_URL}workshop/files/general-custom-instructions.txt`
const cardUrl = `${import.meta.env.BASE_URL}workshop/images/22-general-custom-instructions.png`

export default function CustomInstructions({ onOpenImage }) {
  const [text, setText] = useState(null)
  const [loadError, setLoadError] = useState(false)
  const [copyStatus, setCopyStatus] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    fetch(instructionUrl, { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error('Unable to load instructions')
        return response.text()
      })
      .then(setText)
      .catch(error => {
        if (error.name !== 'AbortError') setLoadError(true)
      })
    return () => controller.abort()
  }, [])

  const copyInstructions = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopyStatus('已複製')
    } catch {
      setCopyStatus('無法自動複製，請選取下方全文後複製。')
    }
  }

  return <section className="workshop-custom-instructions" id="workshop-custom-instructions" aria-labelledby="custom-instructions-title">
    <h4 id="custom-instructions-title">通用版自訂指令</h4>
    <p>可直接複製以下內容，貼入 ChatGPT 或其他支援個人化指令的 AI 平台。</p>
    <div className="custom-instructions-grid">
      <button className="custom-instructions-card" aria-haspopup="dialog" aria-label="放大通用版自訂指令圖卡"
        onClick={event => onOpenImage(event, ['通用版自訂指令', '22-general-custom-instructions'])}>
        <img src={cardUrl} alt="讓 AI 記住你的工作原則：通用版自訂指令的六項功能" width="3200" height="1800" loading="lazy" />
        <span>放大圖卡</span>
      </button>
      <div className="custom-instructions-content">
        <div className="custom-instructions-actions">
          <button type="button" onClick={copyInstructions} disabled={text === null}>複製指令</button>
          <a href={instructionUrl} download="通用版自訂指令.txt">下載通用版指令</a>
          <span role="status" aria-live="polite">{copyStatus}</span>
        </div>
        <pre className="custom-instructions-text" tabIndex={0} aria-label="完整通用版指令">{text ?? (loadError ? '無法載入指令，請重新整理或使用下載入口。' : '載入指令中…')}</pre>
      </div>
    </div>
  </section>
}
