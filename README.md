# English Adventure 英文冒險樂園

台灣國小一至六年級英文遊戲網站。React + TypeScript + Vite，純靜態網站，不用登入、付費 API 或 API 金鑰。原創吉祥物「小芽」陪孩子探索英文。

**正式網站：<https://youcheng88.github.io/english-adventure/>**

2026-10-23 已部署並實際驗證首頁、地圖與記錄重整、完整答題及儲存。[首次成功部署](https://github.com/youcheng88/english-adventure/actions/runs/39911417242)。

## 開始遊玩

在首頁選年級、難度與主題，再選遊戲。年級是建議程度，孩子可自由選擇其他年級；並非出版社進度或能力測驗。手機點選卡片即可排列，桌面也可拖曳。Tab 移動焦點，Enter／空白鍵啟動按鈕；右上設定可減少動畫。音效與手動英文朗讀分開控制。

| 遊戲 | 完整玩法 |
| --- | --- |
| 單字圖片配對 | 看圖選英文、即時回饋、發音與分數 |
| 翻牌記憶 | 英中配對、翻轉與回蓋、計時、翻牌與配對次數 |
| 英文聽力挑戰 | Speech Synthesis 英文語音、四種語速、重播、文字替代模式 |
| 拼字大師 | 點選或拖曳字母、空格卡、提示、檢查與發音 |
| 限時英文搶答 | 每題倒數、連勝加分、逾時處理、錯題回顧 |
| 英文句子排序 | 點選或拖曳單字、中文句意、句型解釋 |
| 英文閱讀冒險 | 原創短文、朗讀、重點單字、理解選擇題 |
| 英文冒險闖關 | 每年級五關、混合單字／聽力／句型、解鎖、最佳星等與重玩 |

## 本機開發

需求：Node.js 22+、pnpm 10.28.2。可用 `npm install -g pnpm@10.28.2` 安裝 pnpm。

```sh
git clone https://github.com/youcheng88/english-adventure.git
cd english-adventure
pnpm install --frozen-lockfile
pnpm dev
```

開啟終端顯示的本機網址。正式建置與檢查：

```sh
pnpm validate:data
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm preview
```

正式輸出在 `dist/`，必須透過 HTTP(S) 提供，不能直接雙擊 HTML。環境的 Windows 沙箱若對 Node 的 realpath 回傳 EPERM，可在一般終端於本專案目錄重跑。這與應用程式功能無關。

## 架構

```text
src/
  data/bank.json             # 386 筆可擴充原創教材
  types.ts                   # 資料契約
  lib/engine.ts              # 抽題、遊戲格式、選項洗牌、評分
  lib/storage.ts             # 進度、最佳成績、錯題、徽章
  lib/audio.ts               # 語音偵測與 Web Audio 音效
  games/GameSession.tsx      # 遊戲生命週期與結果
  games/QuestionPlay.tsx     # 題型 UI、拖曳／點選排列、倒數
  games/MemoryGame.tsx       # 翻牌狀態機
  components/               # 首頁、地圖、成果、進度、原創 SVG
  lib/engine.test.ts         # 245 項 Vitest 檢查
scripts/validate-data.mjs    # 題庫完整性檢查
.github/workflows/pages.yml  # 驗證、建置與 Pages 自動部署
```

採用模組化 CSS 與 CSS media queries 組合版面，沒有 Tailwind 依賴。使用 Lucide 圖示、原創 SVG 吉祥物與風景、作業系統原生 Unicode emoji 教學圖示，不依賴圖片 CDN 或外部字型。

## 題庫與擴充

每年級 30 個單字、18 組句型、6 篇原創文章／12 題閱讀理解；一年級另有 26 組大小寫字母。共 386 筆，36 篇故事。內容隨年級增加篇幅與難度，二年級含自然發音提示，五／六年級加入過去、未來、問句、否定及比較。非任何出版社教材重製。

`src/data/bank.json` 是完整 JSON 陣列。欄位：

```json
{
  "id": "g1-custom-001",
  "grade": 1,
  "difficulty": "easy",
  "topic": "水果與食物",
  "questionType": "vocabulary",
  "question": "選出「蘋果」的英文。",
  "choices": ["apple", "cat", "red", "one"],
  "correctAnswer": "apple",
  "explanation": "apple 的意思是「蘋果」。",
  "image": "🍎",
  "audioText": "apple",
  "translation": "蘋果"
}
```

題型為 `vocabulary`、`sentence`、`reading`、`alphabet`；難度為 `easy`、`normal`、`hard`。句型的 `correctAnswer` 是有大小寫與標點的完整句子或入門短語，`choices` 可為空陣列。閱讀另需 `passageId`、`passage`、`glossary: [{word, meaning}]`，同篇文章必須一致。CSV 編輯者可將相同欄位轉為 JSON 後加入，choices／glossary 需解析成陣列。新增後執行 `pnpm validate:data` 及測試，再重新部署。題庫目前由原始碼管理，沒有瀏覽器上傳題庫功能。

一般遊戲每場 5／8／10 題，翻牌 4／6／8 對；主題只有少量題目時會縮短場次，無適用題型時明示改用同年級教材。難度先挑該難度及較簡單的教材，再視不足補入同年級內容並提示；不重複同場題目。闖關跨主題混合出題，每關 5–12 題。

## 成績與資料保存

- 每題答對 100 分；限時模式按先前連勝數加 20 分，額外加分上限 100。
- 正確率 90% 以上 3 星，70% 以上 2 星，至少答對一題 1 星，完全未答對 0 星。翻牌依成功配對／配對嘗試計算。
- 每星 10 金幣；今日挑戰達 80%，每日額外 20 金幣一次，以目前裝置日期計算。
- 闖關達 60% 通關；每年級獨立進度，重玩保留最高星等。
- `localStorage` 鍵 `english-adventure-v1`，版本化、驗證結構，壞資料回到安全預設。儲存失敗會提示。
- 保留最近 300 場詳細記錄與最多 365 天每日獎勵日期；累積次數、總星星、金幣、最佳分數與關卡獨立保存。錯題答對會移出重練清單。
- 不蒐集姓名、學校、住址、不提供兒童帳號。沒有第三方分析追蹤。清除瀏覽器資料或換裝置將不再有原記錄；本機測試網址與正式網址的儲存互不共用。網站託管服務仍可能有其標準伺服器存取紀錄。

## 部署與更新

GitHub 倉庫：<https://github.com/youcheng88/english-adventure>

在 Settings → Pages → Build and deployment → Source 選 **GitHub Actions**。每次推送 `main`，工作流程會依序安裝鎖定依賴、驗證題庫、lint、測試、TypeScript 檢查及 Vite build，再部署 `dist/`。也可在 Actions 手動 Run workflow。若建置失敗，修正後推送即可，前次成功版本維持服務。

Vite 使用 `base: './'`，導覽使用 `#home`／`#map`／`#progress`，在 GitHub Pages 子目錄重新整理不會請求不存在的伺服器路由。正在進行的場次重新整理會回首頁，已完成的記錄保留。

一般更新方式：

```sh
pnpm validate:data && pnpm lint && pnpm test && pnpm build
git add src README.md
git commit -m "Update learning content"
git push origin main
```

等待 Actions 的 build／deploy 都成功，從 deployment 的 `page_url` 開啟並確認；不要把尚未成功的預期網址當成已上線。

## 瀏覽器支援與限制

現代 Chrome、Edge、Firefox、Safari 的基本 DOM／CSS／localStorage。英文語音由裝置／瀏覽器提供，第一次載入語音可能延遲；沒有英文 voice 或播放錯誤時，聽力自動呈現文字替代。也能手動選文字練習。朗讀不是自行預錄音檔，品質與可用性依作業系統而異。未在全部實體 iOS／Android／螢幕閱讀器組合逐一測試，請參閱 `TESTING.md` 的實際範圍。

## 設計參考與素材

- [Wordwall](https://wordwall.net/)：同教材可套用不同互動模板。
- [British Council LearnEnglish Kids 程度說明](https://learnenglishkids.britishcouncil.org/levels)：程度分流與自由跨級選擇。
- [LearnEnglish Kids 單字遊戲](https://learnenglishkids.britishcouncil.org/grammar-vocabulary/word-games)：主題探索與簡單任務。
- [使用者提供的 Baamboozle 參考頁](https://baamboozle.net/)：題格挑戰與無學生登入互動。僅參考互動形式，未引用其程式、圖像或題庫；baamboozle.com 直接讀取遭 403，沒有宣稱已實測該服務。
- [GitHub Pages 官方部署說明](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。

所有題目、故事、吉祥物與風景 SVG 均為此專案原創。Lucide 採 ISC 授權（詳見套件）；emoji 由裝置字型繪製，沒有擷取或散布第三方圖庫圖檔。
