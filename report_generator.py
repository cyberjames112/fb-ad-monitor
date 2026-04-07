"""
HTML 報告生成器 v3
- 清爽明亮風格
- 廣告連結可直接點擊
"""

import json
import os
import sys
from datetime import datetime, timezone, timedelta
from html import escape
from urllib.parse import quote as url_quote

MYT = timezone(timedelta(hours=8))


def generate_report(ads_json_path: str) -> str:
    with open(ads_json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    ads = data.get("ads", [])
    scan_time = data.get("scan_time", "")
    search_stats = data.get("search_stats", {})
    total_ads = data.get("total_ads", len(ads))

    now = datetime.now(MYT)
    report_date = now.strftime("%Y年%m月%d日")
    report_time = now.strftime("%H:%M")
    week_label = ["一", "二", "三", "四", "五", "六", "日"][now.weekday()]

    # 按粉專分組
    pages = {}
    for ad in ads:
        pname = ad.get("page_name", "未知粉專") or "未知粉專"
        if pname not in pages:
            pages[pname] = {
                "page_url": ad.get("page_url", ""),
                "ads": [],
                "queries": set(),
            }
        pages[pname]["ads"].append(ad)
        pages[pname]["queries"].add(ad.get("search_query", ""))

    sorted_pages = sorted(pages.items(), key=lambda x: len(x[1]["ads"]), reverse=True)

    html = _build_html(
        report_date=report_date,
        report_time=report_time,
        week_label=week_label,
        total_ads=total_ads,
        total_pages=len(pages),
        search_stats=search_stats,
        sorted_pages=sorted_pages,
    )

    output_dir = os.path.dirname(ads_json_path)
    html_file = os.path.join(output_dir, f"report_{scan_time}.html")
    with open(html_file, "w", encoding="utf-8") as f:
        f.write(html)

    print(f"HTML 報告已生成: {html_file}")
    return html_file


def _build_html(
    report_date, report_time, week_label,
    total_ads, total_pages,
    search_stats, sorted_pages,
) -> str:

    # 搜尋統計
    stats_rows = ""
    max_count = max(search_stats.values()) if search_stats else 1
    for query, count in search_stats.items():
        bar_width = int((count / max(max_count, 1)) * 100) if count > 0 else 2
        stats_rows += f"""
        <tr>
          <td class="query-name">{escape(query)}</td>
          <td class="query-count">
            <div class="bar-container">
              <div class="bar" style="width: {bar_width}%"></div>
              <span class="bar-label">{count}</span>
            </div>
          </td>
        </tr>"""

    # 粉專卡片
    page_cards = ""
    for idx, (page_name, page_data) in enumerate(sorted_pages):
        ad_count = len(page_data["ads"])
        page_url = page_data.get("page_url", "")
        queries = ", ".join(page_data["queries"])

        # 粉專連結
        page_link = ""
        if page_url:
            page_link = f'<a href="{escape(page_url)}" target="_blank" class="btn btn-page">查看粉專</a>'

        # Ad Library 搜尋連結
        ad_lib_url = f"https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=TW&q={url_quote(page_name)}"
        ad_lib_link = f'<a href="{ad_lib_url}" target="_blank" class="btn btn-adlib">Ad Library</a>'

        # 廣告列表
        ad_items = ""
        for ad in page_data["ads"][:8]:
            body = escape((ad.get("ad_text") or "")[:300])
            start = escape(str(ad.get("start_date", "")))
            platforms = escape(ad.get("platforms", ""))
            lib_id = ad.get("library_id", "")
            ad_lib_url_single = ad.get("ad_library_url", "")
            ext_link = ad.get("external_link", "")

            # 日期
            date_html = f'<span class="meta-item">📅 {start}</span>' if start else ""

            # 平台
            platform_html = f'<span class="meta-item">📱 {platforms}</span>' if platforms else ""

            # Ad Library 連結（最重要的可點擊連結）
            ad_link_html = ""
            if ad_lib_url_single:
                ad_link_html = f'<a href="{escape(ad_lib_url_single)}" target="_blank" class="ad-link">🔗 查看廣告</a>'
            elif lib_id:
                ad_link_html = f'<a href="https://www.facebook.com/ads/library/?id={lib_id}" target="_blank" class="ad-link">🔗 查看廣告</a>'

            # 外部連結
            ext_html = ""
            if ext_link:
                ext_html = f'<a href="{escape(ext_link)}" target="_blank" class="ext-link">↗ 外部連結</a>'

            ad_items += f"""
            <div class="ad-item">
              <div class="ad-body">{body if body else '<em class="empty">（無文案內容）</em>'}</div>
              <div class="ad-meta">
                {date_html}
                {platform_html}
                {ad_link_html}
                {ext_html}
              </div>
            </div>"""

        more_note = ""
        if ad_count > 8:
            more_note = f'<div class="more-note">還有 {ad_count - 8} 則廣告，請至 Ad Library 查看</div>'

        page_cards += f"""
        <div class="page-card">
          <div class="page-header">
            <div class="page-info">
              <h3 class="page-name">{escape(page_name)}</h3>
              <div class="page-meta">
                <span class="badge">{ad_count} 則廣告</span>
                <span class="query-tag">{escape(queries)}</span>
              </div>
            </div>
            <div class="page-actions">
              {page_link}
              {ad_lib_link}
            </div>
          </div>
          <div class="ad-list">
            {ad_items}
            {more_note}
          </div>
        </div>"""

    if not sorted_pages:
        page_cards = """
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <h3>本週未偵測到相關廣告</h3>
          <p>可能沒有針對台灣投放的吉隆坡置產說明會廣告，或需要調整關鍵字。</p>
        </div>"""

    return f"""<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>CCPS 廣告監控週報 — {report_date}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;600;700&display=swap');

  :root {{
    --bg: #f7f8fc;
    --bg-white: #ffffff;
    --accent: #2563eb;
    --accent-light: #dbeafe;
    --accent-dark: #1d4ed8;
    --green: #059669;
    --green-light: #d1fae5;
    --orange: #d97706;
    --orange-light: #fef3c7;
    --text: #1e293b;
    --text-secondary: #64748b;
    --text-muted: #94a3b8;
    --border: #e2e8f0;
    --border-light: #f1f5f9;
    --shadow-sm: 0 1px 2px rgba(0,0,0,0.04);
    --shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
    --shadow-md: 0 4px 6px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.04);
    --radius: 10px;
  }}

  * {{ margin: 0; padding: 0; box-sizing: border-box; }}

  body {{
    font-family: 'Noto Sans TC', -apple-system, BlinkMacSystemFont, sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.7;
    -webkit-font-smoothing: antialiased;
  }}

  /* ===== HEADER ===== */
  .header {{
    background: var(--bg-white);
    border-bottom: 1px solid var(--border);
    padding: 36px 40px 32px;
  }}

  .header-inner {{
    max-width: 960px;
    margin: 0 auto;
  }}

  .header-label {{
    display: inline-block;
    background: var(--accent-light);
    color: var(--accent);
    padding: 4px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.5px;
    margin-bottom: 14px;
  }}

  .header h1 {{
    font-size: 26px;
    font-weight: 700;
    color: var(--text);
    margin-bottom: 6px;
  }}

  .header-date {{
    font-size: 15px;
    color: var(--text-secondary);
    font-weight: 400;
  }}

  /* ===== STATS ===== */
  .stats {{
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 14px;
    max-width: 960px;
    margin: 24px auto;
    padding: 0 40px;
  }}

  .stat {{
    background: var(--bg-white);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 20px;
    text-align: center;
    box-shadow: var(--shadow-sm);
  }}

  .stat-value {{
    font-size: 32px;
    font-weight: 700;
    color: var(--accent);
    line-height: 1.2;
  }}

  .stat-label {{
    font-size: 13px;
    color: var(--text-secondary);
    margin-top: 4px;
  }}

  /* ===== MAIN ===== */
  .main {{
    max-width: 960px;
    margin: 0 auto;
    padding: 0 40px 60px;
  }}

  .section {{
    margin-top: 32px;
  }}

  .section-title {{
    font-size: 17px;
    font-weight: 600;
    color: var(--text);
    margin-bottom: 14px;
    padding-bottom: 10px;
    border-bottom: 2px solid var(--border-light);
  }}

  /* ===== STATS TABLE ===== */
  .stats-table {{
    width: 100%;
    border-collapse: collapse;
    background: var(--bg-white);
    border-radius: var(--radius);
    overflow: hidden;
    border: 1px solid var(--border);
    box-shadow: var(--shadow-sm);
  }}

  .stats-table tr {{ border-bottom: 1px solid var(--border-light); }}
  .stats-table tr:last-child {{ border-bottom: none; }}
  .stats-table td {{ padding: 12px 18px; }}

  .query-name {{
    color: var(--text);
    font-size: 14px;
    width: 40%;
  }}

  .bar-container {{
    display: flex;
    align-items: center;
    gap: 10px;
  }}

  .bar {{
    height: 8px;
    background: linear-gradient(90deg, #60a5fa, var(--accent));
    border-radius: 4px;
    min-width: 4px;
  }}

  .bar-label {{
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
    min-width: 28px;
  }}

  /* ===== PAGE CARDS ===== */
  .page-card {{
    background: var(--bg-white);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    margin-bottom: 16px;
    box-shadow: var(--shadow-sm);
    overflow: hidden;
    transition: box-shadow 0.2s;
  }}

  .page-card:hover {{
    box-shadow: var(--shadow-md);
  }}

  .page-header {{
    padding: 20px 24px 16px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    flex-wrap: wrap;
    border-bottom: 1px solid var(--border-light);
  }}

  .page-name {{
    font-size: 16px;
    font-weight: 600;
    color: var(--text);
    margin-bottom: 6px;
  }}

  .page-meta {{
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }}

  .badge {{
    background: var(--accent-light);
    color: var(--accent);
    padding: 2px 10px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
  }}

  .query-tag {{
    font-size: 12px;
    color: var(--text-muted);
  }}

  .page-actions {{
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  }}

  .btn {{
    display: inline-block;
    padding: 6px 14px;
    border-radius: 7px;
    font-size: 12px;
    font-weight: 500;
    text-decoration: none;
    transition: all 0.15s;
  }}

  .btn-page {{
    background: var(--accent-light);
    color: var(--accent);
  }}

  .btn-page:hover {{
    background: var(--accent);
    color: white;
  }}

  .btn-adlib {{
    background: var(--green-light);
    color: var(--green);
  }}

  .btn-adlib:hover {{
    background: var(--green);
    color: white;
  }}

  /* ===== AD ITEMS ===== */
  .ad-list {{
    padding: 6px 24px 18px;
  }}

  .ad-item {{
    padding: 14px 0;
    border-bottom: 1px solid var(--border-light);
  }}

  .ad-item:last-child {{
    border-bottom: none;
  }}

  .ad-body {{
    font-size: 14px;
    color: var(--text-secondary);
    line-height: 1.7;
    margin-bottom: 8px;
  }}

  .ad-body .empty {{
    color: var(--text-muted);
  }}

  .ad-meta {{
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
  }}

  .meta-item {{
    font-size: 12px;
    color: var(--text-muted);
  }}

  .ad-link {{
    display: inline-block;
    font-size: 12px;
    font-weight: 600;
    color: var(--accent);
    text-decoration: none;
    padding: 2px 10px;
    border-radius: 5px;
    background: var(--accent-light);
    transition: all 0.15s;
  }}

  .ad-link:hover {{
    background: var(--accent);
    color: white;
  }}

  .ext-link {{
    font-size: 12px;
    color: var(--orange);
    text-decoration: none;
    padding: 2px 10px;
    border-radius: 5px;
    background: var(--orange-light);
    font-weight: 500;
  }}

  .ext-link:hover {{
    text-decoration: underline;
  }}

  .more-note {{
    text-align: center;
    color: var(--text-muted);
    font-size: 13px;
    padding: 12px 0 2px;
  }}

  /* ===== EMPTY STATE ===== */
  .empty-state {{
    text-align: center;
    padding: 60px 40px;
    background: var(--bg-white);
    border: 1px solid var(--border);
    border-radius: var(--radius);
  }}

  .empty-icon {{ font-size: 40px; margin-bottom: 12px; }}
  .empty-state h3 {{ font-size: 18px; margin-bottom: 8px; }}
  .empty-state p {{ color: var(--text-secondary); font-size: 14px; }}

  /* ===== FOOTER ===== */
  .footer {{
    max-width: 960px;
    margin: 0 auto;
    padding: 24px 40px;
    text-align: center;
    color: var(--text-muted);
    font-size: 12px;
    border-top: 1px solid var(--border-light);
  }}

  /* ===== RESPONSIVE ===== */
  @media (max-width: 768px) {{
    .header {{ padding: 28px 20px 24px; }}
    .header h1 {{ font-size: 22px; }}
    .stats {{ padding: 0 20px; grid-template-columns: repeat(2, 1fr); }}
    .main {{ padding: 0 20px 40px; }}
    .page-header {{ padding: 16px 18px 14px; }}
    .ad-list {{ padding: 6px 18px 14px; }}
    .page-actions {{ width: 100%; }}
    .btn {{ flex: 1; text-align: center; }}
  }}

  @media print {{
    body {{ background: #fff; }}
    .page-card {{ box-shadow: none; border: 1px solid #ddd; }}
    .stat {{ box-shadow: none; }}
  }}
</style>
</head>
<body>

  <header class="header">
    <div class="header-inner">
      <div class="header-label">CCPS 競品情報</div>
      <h1>吉隆坡置產說明會 · 廣告監控週報</h1>
      <div class="header-date">{report_date}（週{week_label}）{report_time} 掃描 · 投放地區：台灣</div>
    </div>
  </header>

  <div class="stats">
    <div class="stat">
      <div class="stat-value">{total_ads}</div>
      <div class="stat-label">偵測到的廣告</div>
    </div>
    <div class="stat">
      <div class="stat-value">{total_pages}</div>
      <div class="stat-label">投放中的粉專</div>
    </div>
    <div class="stat">
      <div class="stat-value">{len(search_stats)}</div>
      <div class="stat-label">搜尋關鍵字</div>
    </div>
  </div>

  <main class="main">
    <section class="section">
      <h2 class="section-title">📊 各關鍵字命中數</h2>
      <table class="stats-table">
        {stats_rows}
      </table>
    </section>

    <section class="section">
      <h2 class="section-title">📋 粉專與廣告明細</h2>
      {page_cards}
    </section>
  </main>

  <footer class="footer">
    CCPS 廣告監控系統 · 家慶佳業 · 資料來源：Meta Ad Library · 投放地區：台灣
  </footer>

</body>
</html>"""


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("使用方式: python report_generator.py <ads_json_path>")
        sys.exit(1)
    generate_report(sys.argv[1])
