import { formUrl, sheetEmbedUrl } from './questionBoardConfig.js'

export default function QuestionBoard() {
  return <section className="workshop-questions" id="workshop-questions" aria-labelledby="questions-title">
    <h2 id="questions-title">研習問題留言板</h2>
    <section aria-labelledby="question-form-title">
      <h3 id="question-form-title">提出問題</h3>
      <iframe title="Google 問題表單" src={`${formUrl}?embedded=true`} referrerPolicy="no-referrer" />
      <a href={formUrl} target="_blank" rel="noopener noreferrer">另開表單</a>
    </section>
    <section className="workshop-responses" aria-labelledby="question-sheet-title">
      <h3 id="question-sheet-title">其他老師的問題</h3>
      {sheetEmbedUrl ? <iframe className="workshop-response-sheet" title="其他老師的問題：公開試算表" src={sheetEmbedUrl} referrerPolicy="no-referrer" /> : <p>待提供 Google 試算表「發布到網路」的嵌入網址。</p>}
    </section>
  </section>
}
