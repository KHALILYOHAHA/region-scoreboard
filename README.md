# 地區計分表

七個地區（HKI、KC、KE、KWS、T&Y、TNS、WTT）實時計分表：上面直條圖、下面卡片。顯示順序按字母：HKI → KC → KE → KWS → T&Y → TNS → WTT，暫不按分數排名。

## 本機預覽

用瀏覽器打開 `index.html`，或：

```bash
npx --yes serve .
```

## 接 Google Sheets（真實分數）

### 1. 開一張 Sheet

第一頁（tab）改名為 `Scores`，內容例如：

| 地區 | 分數 |
|------|------|
| HKI  | 1280 |
| KC   | 1150 |
| KE   | 1320 |
| KWS  | 980  |
| T&Y  | 1410 |
| TNS  | 1095 |
| WTT  | 1240 |

欄名可用「地區 / Region」同「分數 / Score」。

### 2. 分享權限

右上角 **共用** → **一般存取權** → **知道連結的任何人** → **檢視者**。

### 3. 填入 Sheet ID

Sheet 網址類似：

`https://docs.google.com/spreadsheets/d/【這段就係 ID】/edit`

編輯 repo 入面 `config.js`：

```js
sheetId: "你的ID",
sheetName: "Scores",
pollMs: 5000,
```

或者唔改檔，用 URL 參數：

`https://khalilyohaha.github.io/region-scoreboard/?sheet=你的ID`

頁面會每隔約 5 秒自動從 Sheets 拉最新分數。

## 手動改分（本機）

網址加 `?edit=1`（只存你部瀏覽器，唔會寫入 Sheets）。

## GitHub Pages

Settings → Pages → Deploy from branch → `main` / `(root)`  
網站：https://khalilyohaha.github.io/region-scoreboard/
