# 開發環境與發布

正式 Windows 工作目錄是 `%USERPROFILE%\Documents\Codex\digital-teaching-tools`。目前驗證環境為 Windows 11、Node.js 24.16.0、npm 11.13.0、Git 2.55.0.windows.3。GitHub Actions 使用 Ubuntu 與 Node.js 24。

[package.json](package.json) 定義 npm 腳本。[package-lock.json](package-lock.json) 鎖定 React 與 React DOM 19.2.8、Vite 8.2.1、Vite React 外掛 6.0.5、Hanzi Writer 3.7.3 和 ESLint 10.8.1。更新套件後以新的鎖定檔及實測結果為準。

## 本機操作

在正式專案根目錄執行。PowerShell 若封鎖 npm 的指令碼，可改用 `npm.cmd`。

```sh
npm ci
npm run dev
npm run check
npm test
npm run build
npm run preview
```

`dev` 啟動開發伺服器，`check` 執行 ESLint，`test` 以 Node.js 測試執行器執行現有的 22 項數學及筆順資料測試。先用 `build` 產生 `dist/`，再以 `preview` 開啟終端機顯示的 `/digital-teaching-tools/` 網址檢查正式建置。瀏覽器驗收可走過長方形格線切割與還原、輸入「永春」並換字、AI 漫畫翻頁與說明、研習圖卡放大及 A4 列印預覽。

## Git 與回復

遠端 `origin` 是 [neoggyy0814/digital-teaching-tools](https://github.com/neoggyy0814/digital-teaching-tools)，正式分支為 `main`。GitHub Desktop 可從 **File → Add local repository** 指向現有的工作目錄。若搬移後顯示儲存庫找不到，可選 **Locate** 指向新位置。

更新時先用 **Fetch origin** 檢查遠端狀態，確認分支與差異，完成驗收後依當次授權提交及推送。需要回復已發布的變更時，可用 `git revert <提交 SHA>` 建立反向提交，重跑相關檢查，再依授權推送。

## GitHub Pages

[正式網站](https://neoggyy0814.github.io/digital-teaching-tools/) 以 GitHub Actions 作為發布來源。[工作流程](.github/workflows/pages.yml) 在推送 `main` 或手動執行時，依鎖定檔安裝套件、跑 ESLint 與測試，使用 Pages 提供的基底路徑建置並上傳 `dist/`。部署工作發布 `main` 的建置產物。

[Vite 設定](vite.config.js) 的本機預設基底為 `/digital-teaching-tools/`。組合執行時的靜態資源網址時，使用 `import.meta.env.BASE_URL`，讓圖片、筆順 JSON 與 iframe 在子路徑下正常載入。GitHub Pages 僅提供靜態檔案。研習直連使用 `#workshop-20261202`，可直接重新整理。

發布後核對 Actions 的建置、部署及 `github-pages` 環境所對應的提交，再從正式網址檢查四個入口、研習直連與靜態資源。觸控長按、滑動與方向鎖定須以目標裝置驗證，瀏覽器可能不支援方向鎖定。研習 A4 分頁及邊界以實際瀏覽器列印預覽為準。

[原 ChatGPT Sites 網址](https://neiwai-digital-teaching-tools-test.neoggyy0814.chatgpt.site/) 保留為早期發布版本，現行發布走 GitHub Pages。
