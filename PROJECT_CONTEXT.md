# 網站脈絡

內惟國小數位教學工具提供公開、非商業的數位教學與 AI 科普資源。各工具最初分開製作，後來整合至 ChatGPT Sites。目前四個入口共用同一份網站原始碼。專案以 Codex Cloud 作為主要開發及自動測試環境，ChatGPT Sites 作為使用者互動驗收的測試網站，GitHub Pages 作為正式發布網站；操作與授權邊界見 [AGENTS.md](AGENTS.md)，環境與發布程序見 [ENVIRONMENT.md](ENVIRONMENT.md)。

## 整體架構與導覽

React 由 [src/main.jsx](src/main.jsx) 啟動。[src/App.jsx](src/App.jsx) 管理首頁、四個工具入口、子項目及返回行為。精細指標裝置可用滑鼠預覽，觸控以點選進入。研習大綱以雜湊支援直連，其餘入口由首頁切換。首頁教室動畫以 iframe 載入 [public/classroom-animation](public/classroom-animation)。各工具自行管理操作狀態，共用 [src/styles.css](src/styles.css) 的版面、控制列及焦點樣式。各工具的樣式再依可用寬高、容器大小、指標能力和減少動態效果偏好調整。

## 數學教學工具

目前可操作「面積 → 長方形」。教師可調整長寬、沿格線或自行畫線切割、拖曳拼接、縮放與還原，觀察圖塊面積守恆。[MathVisualization.jsx](src/math/MathVisualization.jsx) 管理 SVG 工作區與操作，[geometry.js](src/math/geometry.js) 與 [workspace.js](src/math/workspace.js) 處理圖形及視窗座標。其他概念與面積模板目前僅展示入口。

## 國語筆順練習

[HanziPractice.jsx](src/hanzi/HanziPractice.jsx) 管理輸入、字序、換字及完成畫面。[WritingBoard.jsx](src/hanzi/WritingBoard.jsx) 使用 Hanzi Writer 比對筆畫，[HanziGlyph.jsx](src/hanzi/HanziGlyph.jsx) 顯示字形。[hanziData.js](src/hanzi/hanziData.js) 依 Unicode 碼位載入並快取 [正式字形資料](public/hanzi-data/moe) 的 6,063 份 JSON。輸入可包含多個漢字，空白會忽略，非漢字與資料集未收錄的字無法練習。

資料來自中華民國教育部《國字標準字體筆順學習網》，適用 CC BY-NC-ND 3.0 臺灣。來源、技術格式轉換與授權條件見 [筆順資料文件](docs/hanzi-moe-corpus.md)，隨站保留[授權聲明](public/hanzi-data/moe/NOTICE.txt)。

## AI 二三事

第一彈有 8 篇科普漫畫。[batches.js](src/ai-stories/batches.js) 註冊有內容的批次，[first-batch.json](src/ai-stories/first-batch.json) 保存標題、兩段說明、圖片路徑、尺寸及替代文字，正式圖檔位於 [public/ai-stories](public/ai-stories)。新增批次時，以相同欄位提供資料及圖片，並給批次唯一識別碼。閱讀器依該批篇數產生導覽。

[AiStories.jsx](src/ai-stories/AiStories.jsx) 以原比例顯示單篇漫畫。左右箭頭、篇數和定位點同步，首尾不循環，空間不足時以篇章選單代替定位點。桌面可用指標與鍵盤，觸控可橫滑翻頁，按住說明入口閱讀，放開或取消便關閉。說明浮在畫面上並逐字呈現，減少動態效果模式直接顯示全文。直向觸控裝置會顯示橫向建議，方向鎖定能否成功由瀏覽器決定。

## 研習資訊

[Workshop.jsx](src/workshop/Workshop.jsx) 提供 2026 年 12 月 2 日 Codex 研習大綱、授課段落和參考範例區。18 張教學圖卡位於 [public/workshop/images](public/workshop/images)，桌面懸停使用 WebP 預覽，點選開啟 PNG 大圖。[workshop.css](src/workshop/workshop.css) 定義 A4 列印樣式，可用瀏覽器列印或另存 PDF。目前參考範例區尚無確認可公開的項目。
