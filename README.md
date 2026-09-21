# 地區計分表（Draft）

七個地區（A–G）實時計分表草稿。顯示順序固定為 A → G，**暫不按分數排名**。

## 本機預覽

直接用瀏覽器打開 `index.html`，或：

```bash
npx --yes serve .
```

## 示範資料

頁面會自動每隔約 3 秒替某個地區加分（假實時）。  
手動改分：在網址加上 `?edit=1`，例如 `index.html?edit=1`。

## GitHub Pages

1. 打開 Repo → **Settings** → **Pages**
2. Source 選 **Deploy from a branch**
3. Branch 選 `main`，folder 選 `/ (root)`
4. 儲存後約一分鐘，網站會係：

`https://khalilyohaha.github.io/region-scoreboard/`

（用戶名大小寫以 GitHub 實際 Pages URL 為準。）
