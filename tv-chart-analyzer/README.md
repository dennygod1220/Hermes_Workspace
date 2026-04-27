# TradingView Chart Analyzer

Chrome Extension + Hermes Agent 整合，一鍵截圖分析 TradingView 圖表。

## 專案結構

```
Downloads/Hermes_Workspace/tv-chart-analyzer/
├── extension/              ← Chrome Extension 原始碼
│   ├── manifest.json
│   ├── background.js
│   ├── content.js
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.css
│   │   └── popup.js
│   └── icons/
├── screenshots/            ← 匯入後的截圖儲存位置
├── hermes-watcher.py       ← WSL 端監控 script
└── README.md
```

## 安裝

### Extension

1. 打開 Chrome → `chrome://extensions/`
2. 開啟右上角「開發人員模式」
3. 點「載入未封裝項目」→ 選 `tv-chart-analyzer/extension/` 目錄
4. 確認出現「TradingView Chart Analyzer」，無錯誤

### Hermes Skill (可選)

`trading-screenshot-analysis` skill 已內建於 Hermes Agent，用 `trading-snap` 指令觸發。

## 使用方式

1. 在 TradingView 打開圖表（如 MNQ1!）
2. 點 Extension 圖示 → 填寫交易參數 → 點「📸 截圖分析」
3. 檔案會下載到 Downloads/（Chrome 147+ 限制，無法指定子目錄）
4. 在 WSL 匯入截圖：
   ```bash
   cd /mnt/c/Users/denny/Downloads/Hermes_Workspace/tv-chart-analyzer
   python3 hermes-watcher.py --import    # 將 tv_* 從 Downloads 移到 screenshots/
   ```
5. 查看最新截圖：
   ```bash
   python3 hermes-watcher.py --latest
   # 或對 Hermes 說: trading-snap
   ```

## Hermes Watcher 指令

| 指令 | 說明 |
|------|------|
| `python3 hermes-watcher.py --latest` | 顯示最新截圖摘要（自動搜尋 screenshots/ 或 Downloads/） |
| `python3 hermes-watcher.py --import` | 將 Downloads 中的 tv_* 檔案匯入至 screenshots/ |
| `python3 hermes-watcher.py --watch` | 持續監控 screenshots/ (按 Ctrl+C 停止) |

## 檔案命名格式

```
tv_2026-04-27_07-30-00.png    ← 時間格式，tv_ 前綴
tv_2026-04-27_07-30-00.json   ← 同名的 metadata
```

## 附帶指標選項

- VRVP
- EMA 20/30/60
- KDJ
- PPO
- Stoch RSI

## 疑難排解

| 問題 | 解決方式 |
|------|----------|
| Popup 無顯示價格 | 重新整理 TradingView 頁面 |
| 截圖失敗 | 確認 Chrome 允許截圖權限 (chrome://extensions/) |
| JSON 缺少數據 | content script 可能因 TradingView DOM 更新而失效，會 fallback 到 page title |
| 按鈕 disabled | 確認當前頁面為 TradingView 圖表頁面 |
| Vision 讀錯價格位數 | 正常現象，以 JSON metadata 中的價格為準 |
| 檔案在 Downloads 不在 screenshots | Chrome 147+ 限制，先執行 `--import` 匯入 |

## 技術限制

- TradingView 圖表使用 Canvas 渲染，DOM 抓價僅為輔助
- Vision 分析為主力方案，可直接讀取 K 線型態和趨勢線
- Chrome 147+ 不支援 `chrome.downloads.download()` 的 filename 參數（blob/data URL），改用 `<a download>` 方式，檔案存到 Downloads/ 根目錄
- 使用 `hermes-watcher.py --import` 將檔案搬運至正確目錄
