import { useEffect, useState } from 'react'

const instructionUrl = `${import.meta.env.BASE_URL}workshop/files/general-custom-instructions.txt`

export default function CustomInstructions() {
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

  return <main className="workshop" id="workshop-instructions">
    <div className="workshop-inner custom-instructions-page">
      <a className="workshop-back" href="#workshop-20261202">返回研習大綱</a>
      <header className="workshop-header">
        <h1>通用版自訂指令</h1>
        <p>可複製完整指令，貼入支援個人化指令的 AI 平台，也可以下載 TXT 檔案保存。</p>
      </header>
      <div className="custom-instructions-content">
        <div className="custom-instructions-actions">
          <button type="button" onClick={copyInstructions} disabled={text === null}>複製指令</button>
          <a href={instructionUrl} download="通用版自訂指令.txt">下載 TXT 檔案</a>
          <span role="status" aria-live="polite">{copyStatus}</span>
        </div>
        <pre className="custom-instructions-text" tabIndex={0} aria-label="完整通用版指令">{text ?? (loadError ? '無法載入指令，請重新整理或使用下載入口。' : '載入指令中…')}</pre>
      </div>
    </div>
  </main>
}
