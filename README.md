# 內惟國小數位教學工具

提供數學面積切割與重組、國語筆順練習、「AI 二三事」第一彈 8 篇漫畫，以及 2026 年 12 月 2 日 Codex 研習大綱與圖卡。本站使用 React 與 Vite，GitHub Pages 直接提供建置後的靜態檔案。

本網站供一般大眾瀏覽及作非商業教學使用。此聲明描述網站用途。第三方素材各自適用原有授權。

## 本機開發

使用 Node.js 24 與 npm。在專案目錄執行以下指令，並開啟終端機顯示的 `/digital-teaching-tools/` 網址。

```sh
npm ci
npm run dev
```

提交前執行以下指令。用 `preview` 檢查正式建置的子路徑、圖片與教學資料。

```sh
npm run check
npm test
npm run build
npm run preview
```

## 發布與回復

首次發布時，在 GitHub 儲存庫的 **Settings → Pages → Build and deployment → Source** 選擇 **GitHub Actions**。如果首次推送發生在設定之前，完成設定後可在 **Actions → GitHub Pages** 手動執行一次。

日常更新在本專案修改並檢查 Git 差異，提交後推送至 `main`。工作流程會以鎖定檔安裝套件、執行檢查與測試，再依 Pages 的基底路徑建置並發布 `dist/`。在 **Actions** 查看部署是否成功，並開啟 `github-pages` 環境提供的網址確認首頁及各分頁。研習大綱可用 `#workshop-20261202` 直接開啟。

若要回復最近一筆有問題的變更，使用 `git revert <提交 SHA>` 建立反向提交，再將 `main` 推送到 GitHub。GitHub Desktop 可用來核對提交和差異。

## 素材與版本管理

國語筆順資料來自[中華民國教育部《國字標準字體筆順學習網》](https://stroke-order.learningweb.moe.edu.tw/)，依 [CC BY-NC-ND 3.0 臺灣](https://creativecommons.org/licenses/by-nc-nd/3.0/tw/)提供非商業教學使用。資料採一致的技術格式轉換以供筆順工具讀取，詳見[資料來源與轉換說明](docs/hanzi-moe-corpus.md)及[隨站發布的授權聲明](public/hanzi-data/moe/NOTICE.txt)。

`public/hanzi-data/moe/` 中的 6,063 份字形 JSON 是網站驗證輸入、顯示字形及筆順練習時直接讀取的正式資料。產生流程預設把候選資料、暫存 XML 與驗證中間檔寫入本機 `.moe-stroke-staging/`，該目錄由 Git 忽略。

提交時保留網站程式、正式教學素材、鎖定檔、測試與必要設定。備份、驗收截圖、建置產物、私人設定、憑證、個資、文案來源檔與尚未確認授權的第三方素材應留在公開儲存庫之外。
