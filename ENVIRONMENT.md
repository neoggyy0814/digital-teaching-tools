# 開發環境、測試驗收與發布

本專案採用 **Codex Cloud 開發與自動測試 → ChatGPT Sites 測試部署與使用者互動驗收 → GitHub 版本整合 → GitHub Pages 正式發布** 的流程。Codex Cloud 中的暫時性開發伺服器與 ChatGPT Sites 測試網站不是同一個環境；兩者之間目前**沒有經本專案驗證的自動同步或直接部署流程**，須依當次可用工具確認交付方式。操作授權與停止條件以 [AGENTS.md](AGENTS.md) 為準。

## 執行環境與工具鏈

主要雲端工作區為 Codex Cloud，目前儲存庫位於 `/workspace/digital-teaching-tools`。附件記錄曾在此路徑執行 React／Vite 開發伺服器，並以 Playwright＋Chromium 完成瀏覽器操作及截圖測試；本次文件更新未重現該歷史操作，儲存庫亦未定義 Playwright 相依套件或測試腳本，後續使用前須確認當次工具是否可用。雲端 `127.0.0.1` 僅適用於可連接該服務的雲端工作區，不能視為使用者 Windows 瀏覽器可直接存取的網址；目前尚未確認 Codex 網頁版提供可讓使用者直接互動的預覽入口。雲端工具版本與功能應依各次實測，不沿用本機版本數字。本次文件更新（2026 年 11 月 14 日）實測為 Node.js 24.22.1、npm 11.9.0、Git 2.52.0。

既有 Windows 本機工作目錄是 `%USERPROFILE%\Documents\Codex\digital-teaching-tools`，保留供本機開發、瀏覽器互動測試及 GitHub Desktop 操作使用。原文件記錄的已驗證本機環境為 Windows 11、Node.js 24.16.0、npm 11.13.0、Git 2.55.0.windows.3；這是當時的驗證紀錄，不保證未來環境版本不變。GitHub Actions 使用 Ubuntu 與 Node.js 24。

[package.json](package.json) 定義 npm 腳本。[package-lock.json](package-lock.json) 目前鎖定 React 與 React DOM 19.2.8、Vite 8.2.1、Vite React 外掛 6.0.5、Hanzi Writer 3.7.3 和 ESLint 10.8.1。更新套件後以實際鎖定檔、原始碼及測試結果為準。

## 安裝、開發與驗證

在實際專案根目錄執行；Windows PowerShell 若封鎖 npm 指令碼，可改用 `npm.cmd`。

```sh
npm ci
npm run dev
npm run check
npm test
npm run build
npm run preview
```

`dev` 啟動開發伺服器，`check` 執行 ESLint，`test` 以 Node.js 測試執行器執行現有的 22 項數學及筆順資料測試。先用 `build` 產生 `dist/`，再用 `preview` 檢查正式建置；依終端機實際輸出的網址開啟 `/digital-teaching-tools/`。本次文件更新已核對鎖定版本，並執行 `npm test` 確認 22 項測試通過；後續以實際鎖定檔及測試結果為準。

瀏覽器驗證應涵蓋受影響的路徑，必要時檢查桌面與觸控版面；既有代表性流程包括長方形格線切割與還原、輸入「永春」並換字、AI 漫畫翻頁與說明、研習圖卡放大及 A4 列印預覽。當次雲端環境若支援 Playwright，可用於截圖與自動化操作；自動化檢查與使用者互動驗收的區別見 [AGENTS.md](AGENTS.md#environment-and-acceptance-workflow)。

## 測試網站：ChatGPT Sites

既有「內惟國小數位教學工具」測試網址：

[開啟測試網站](https://neiwai-digital-teaching-tools-test.neoggyy0814.chatgpt.site/)

依 [AGENTS.md 的測試部署授權邊界](AGENTS.md#environment-and-acceptance-workflow)，保留既有網址及未受本次需求影響的功能，先確認待測版本及 Sites 端實際可用的更新途徑，再執行部署；回報已部署內容與可核對的版本資訊。Codex Cloud 並未因此自動取得 Sites 操作權限，也不能假設 Sites 會自動讀取未提交的雲端工作區原始碼。

若執行端不能直接操作 ChatGPT Sites，應整理可重現的交付內容（例如變更清單、來源版本、必要資源及部署說明），交給有權限且支援 Sites 的環境或工具；在真實交付與部署完成前，狀態只能標示為「待部署」。替代託管方式的授權邊界見 [AGENTS.md](AGENTS.md#environment-and-acceptance-workflow)。

使用者應能在測試站親自檢查操作、版面及功能。驗收狀態須明列「待驗收／需修正／已通過」；使用者要求修正時，回到開發與測試流程。Sites 的執行或建置方式可能與 GitHub Pages 不同，正式發布前要確認對應的原始碼版本及必要資源一致，並另行驗證正式建置。

## Git 與版本管理

遠端 `origin` 是 [neoggyy0814/digital-teaching-tools](https://github.com/neoggyy0814/digital-teaching-tools)，正式分支為 `main`。GitHub Desktop 可從 **File → Add local repository** 指向既有工作目錄；搬移後找不到儲存庫時可用 **Locate** 重新指定。

更新前檢查 Git 狀態、分支及遠端差異。本機可用 **Fetch origin** 檢查遠端。測試中的變更使用獨立分支、合併請求或尚未提交的工作區，依 [AGENTS.md](AGENTS.md#repository-and-release-boundaries) 的授權規則保存版本。保存至 GitHub 的獨立分支與整合至正式 `main` 是不同操作；現有 Actions 未設定路徑排除，即使只將規則文件推送至 `main`，仍會觸發正式發布流程。

需要回復已發布變更時，可用 `git revert <提交 SHA>` 建立反向提交，重跑相關檢查，再依當次授權推送；不擅自改寫遠端歷史。

## 正式網站：GitHub Pages

[正式網址](https://neoggyy0814.github.io/digital-teaching-tools/) 由 GitHub Pages 提供。[現有工作流程](.github/workflows/pages.yml) 以 GitHub Actions 作為發布來源，已核對目前設定：推送 `main` 或以 `workflow_dispatch` 手動執行時，建置工作使用 Ubuntu 與 Node.js 24，執行 `npm ci`、`npm run check`、`npm test`，再使用 Pages 提供的基底路徑建置並上傳 `dist/`。部署工作另外限定 `github.ref == 'refs/heads/main'`，且須建置成功，才會發布至 `github-pages` 環境；手動選擇其他分支只會建置，不會執行部署工作。工作流程檔案無法證明遠端環境的保護或審核設定，正式發布前仍須核對實際設定與執行狀態。

正式發布的驗收與授權條件依 [AGENTS.md](AGENTS.md#environment-and-acceptance-workflow)。發布前核對已驗收候選版本對應的程式碼、素材及正式建置結果，再依授權整合至 `main` 或手動執行 `main` 的發布流程。現有 Actions 不會自行判斷使用者是否已驗收或授權，這些條件須在觸發前完成確認。

[Vite 設定](vite.config.js) 的本機預設基底為 `/digital-teaching-tools/`。組合執行時的靜態資源網址時使用 `import.meta.env.BASE_URL`，確保圖片、筆順 JSON 與 iframe 在子路徑下正常載入。GitHub Pages 僅提供靜態檔案；研習直連使用 `#workshop-20261202`，可直接重新整理。

正式發布後核對 Actions 建置、部署及 `github-pages` 環境對應的提交，再由正式網址檢查四個入口、研習直連與靜態資源。觸控長按、滑動與方向鎖定須以目標裝置驗證；研習 A4 分頁及邊界以實際瀏覽器列印預覽為準。
