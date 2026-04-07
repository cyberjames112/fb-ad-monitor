# CCPS Facebook Ad Library 廣告監控系統

每週一自動掃描 Facebook 廣告檔案庫，找出馬來西亞房產、建案、說明會相關的廣告，生成 HTML 週報並 Email 寄出。

## 架構

```
GitHub Actions (每週一 09:00 MYT)
    ↓
Playwright 爬蟲 → 搜尋 Ad Library (12+ 組關鍵字)
    ↓
GraphQL 攔截 / HTML 解析 → 提取廣告資料
    ↓
生成 HTML 週報（精美暗色風格）
    ↓
Gmail SMTP 寄出報告
```

## 設定步驟

### 1. 建立 GitHub Repo

```bash
git init
git add .
git commit -m "init: fb ad monitor"
git remote add origin https://github.com/你的帳號/fb-ad-monitor.git
git push -u origin main
```

### 2. 設定 GitHub Secrets

到 repo 的 **Settings → Secrets and variables → Actions**，新增以下 Secrets：

| Secret 名稱 | 說明 | 範例 |
|---|---|---|
| `GMAIL_USER` | 寄件者 Gmail 地址 | `你的帳號@gmail.com` |
| `GMAIL_APP_PASSWORD` | Gmail 應用程式密碼 | `xxxx xxxx xxxx xxxx` |
| `REPORT_RECIPIENT` | 收件者 Email | `jamespai@ccpsmy.com` |

### 3. 取得 Gmail 應用程式密碼

1. 到 [Google 帳戶安全性](https://myaccount.google.com/security)
2. 確認已開啟 **兩步驟驗證**
3. 搜尋 **應用程式密碼**
4. 選擇「郵件」→「其他」→ 輸入名稱「CCPS Ad Monitor」
5. 複製產生的 16 位密碼，貼到 GitHub Secret

### 4. 手動測試

到 repo 的 **Actions** 頁面 → 選擇 **FB Ad Monitor Weekly** → 點 **Run workflow**

## 本地測試

```bash
pip install playwright
playwright install chromium

# 設定環境變數（可選，不設的話只會生成報告不會寄信）
export GMAIL_USER="你的@gmail.com"
export GMAIL_APP_PASSWORD="xxxx xxxx xxxx xxxx"
export REPORT_RECIPIENT="收件者@email.com"

python run.py
```

報告會在 `output/` 資料夾下生成。

## 自訂搜尋關鍵字

編輯 `scraper.py` 最上方的 `SEARCH_QUERIES` 列表：

```python
SEARCH_QUERIES = [
    "吉隆坡",
    "Kuala Lumpur property",
    "你想加的關鍵字",
    ...
]
```

## 檔案結構

```
fb-ad-monitor/
├── .github/workflows/
│   └── ad-monitor.yml      # GitHub Actions 排程設定
├── scraper.py               # 爬蟲主程式
├── report_generator.py      # HTML 報告生成器
├── send_email.py            # Email 發送器
├── run.py                   # 主執行腳本（串連以上三個）
├── requirements.txt
└── README.md
```

## 注意事項

- **Meta 反爬蟲**：每週一次的頻率很低，被封鎖風險小。如果被擋，腳本會自動截圖存到 `screenshots/` 供除錯
- **GraphQL 結構變動**：Meta 可能改變回應格式，如果報告突然沒資料，需要更新 `scraper.py` 中的解析邏輯
- **Email 失敗**：報告仍會生成並存在 GitHub Actions 的 Artifacts 中，可以手動下載
