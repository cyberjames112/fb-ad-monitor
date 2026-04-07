"""
HTML 報告生成器
將爬蟲收集到的廣告資料生成一份精美的 HTML 報告
"""

import json
import os
import sys
from datetime import datetime, timezone, timedelta
from html import escape

MYT = timezone(timedelta(hours=8))


def generate_report(ads_json_path: str) -> str:
    """讀取 JSON 資料並生成 HTML 報告"""

    with open(ads_json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    ads = data.get("ads", [])
    scan_time = data.get("scan_time", "")
    search_stats = data.get("search_stats", {})
    total_ads = data.get("total_ads", len(ads))

    # 整理報告時間
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
                "page_id": ad.get("page_id", ""),
                "page_url": ad.get("page_url", ""),
                "ads": [],
                "queries": set(),
            }
        pages[pname]["ads"].append(ad)
        pages[pname]["queries"].add(ad.get("search_query", ""))

    # 按廣告數量排序（多的在前）
    sorted_pages = sorted(pages.items(), key=lambda x: len(x[1]["ads"]), reverse=True)

    # 找出本週新出現的粉專（如果有歷史資料的話）
    # 這裡先留接口，之後可以比對上週的資料

    html = _build_html(
        report_date=report_date,
        report_time=report_time,
        week_label=week_label,
        total_ads=total_ads,
        total_pages=len(pages),
        search_stats=search_stats,
        sorted_pages=sorted_pages,
        ads=ads,
    )

    # 儲存 HTML
    output_dir = os.path.dirname(ads_json_path)
    html_file = os.path.join(output_dir, f"report_{scan_time}.html")
    with open(html_file, "w", encoding="utf-8") as f:
        f.write(html)

    print(f"HTML 報告已生成: {html_file}")
    return html_file


def _build_html(
    report_date, report_time, week_label,
    total_ads, total_pages,
    search_stats, sorted_pages, ads,
) -> str:
    """組裝完整的 HTML 報告"""

    # 搜尋統計表格行
    stats_rows = ""
    for query, count in search_stats.items():
        bar_width = min(count * 8, 100) if count > 0 else 2
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
        page_id = page_data.get("page_id", "")
        page_url = page_data.get("page_url", "")
        queries = ", ".join(page_data["queries"])
        
        # 粉專連結
        if page_url:
            page_link = f'<a href="{escape(page_url)}" target="_blank" class="page-link">查看粉專 →</a>'
        elif page_id:
            page_link = f'<a href="https://www.facebook.com/{page_id}" target="_blank" class="page-link">查看粉專 →</a>'
        else:
            page_link = ""

        # Ad Library 搜尋連結（用粉專名稱搜尋）
        from urllib.parse import quote as url_quote
        ad_lib_search = url_quote(page_name)
        ad_lib_url = f"https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=MY&q={ad_lib_search}"
        ad_lib_link = f'<a href="{ad_lib_url}" target="_blank" class="adlib-link">在 Ad Library 查看 →</a>'

        # 該粉專的廣告列表
        ad_items = ""
        for ad in page_data["ads"][:5]:  # 每個粉專最多顯示 5 則
            body = escape((ad.get("ad_text") or ad.get("body_text") or "")[:300])
            title = escape(ad.get("title", ""))
            start = escape(str(ad.get("start_date", "")))
            end = escape(str(ad.get("end_date", "")))
            link = ad.get("external_link") or ad.get("link_url") or ""
            cta = escape(ad.get("cta_text", ""))
            platforms = escape(ad.get("platforms", ""))
            lib_id = ad.get("library_id", "")

            date_info = ""
            if start:
                date_info = f'<span class="ad-date">📅 {start}'
                if end:
                    date_info += f' ~ {end}'
                date_info += '</span>'

            link_html = ""
            if link:
                link_html = f'<a href="{escape(link)}" target="_blank" class="ad-ext-link">外部連結 ↗</a>'

            platform_html = ""
            if platforms:
                platform_html = f'<span class="ad-platform">📱 {platforms}</span>'

            lib_id_html = ""
            if lib_id:
                lib_id_html = f'<span class="ad-date">🆔 {lib_id}</span>'

            ad_items += f"""
            <div class="ad-item">
              {f'<div class="ad-title">{title}</div>' if title else ''}
              <div class="ad-body">{body if body else '<em>（無文案內容）</em>'}</div>
              <div class="ad-meta">
                {date_info}
                {platform_html}
                {lib_id_html}
                {f'<span class="ad-cta">{cta}</span>' if cta else ''}
                {link_html}
              </div>
            </div>"""

        more_note = ""
        if ad_count > 5:
            more_note = f'<div class="more-note">⋯ 還有 {ad_count - 5} 則廣告，請至 Ad Library 查看完整列表</div>'

        page_cards += f"""
        <div class="page-card" style="--delay: {idx * 0.05}s">
          <div class="page-header">
            <div class="page-info">
              <h3 class="page-name">{escape(page_name)}</h3>
              <div class="page-meta">
                <span class="ad-count-badge">{ad_count} 則廣告</span>
                <span class="query-tags">🔍 {escape(queries)}</span>
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

    # 如果沒有找到任何廣告
    if not sorted_pages:
        page_cards = """
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <h3>本週未偵測到新廣告</h3>
          <p>可能原因：Meta 反爬蟲機制觸發、關鍵字需要調整、或確實沒有新廣告上線。</p>
          <p>建議檢查 screenshots 資料夾中的截圖確認頁面是否正常載入。</p>
        </div>"""

    return f"""<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>CCPS 廣告監控週報 — {report_date}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;700;900&display=swap');

  :root {{
    --bg-primary: #0a0f1c;
    --bg-card: #111827;
    --bg-card-hover: #1a2332;
    --bg-inner: #0d1422;
    --accent: #3b82f6;
    --accent-glow: rgba(59, 130, 246, 0.15);
    --accent-bright: #60a5fa;
    --text-primary: #e8edf5;
    --text-secondary: #8b95a8;
    --text-muted: #4b5563;
    --border: #1e293b;
    --border-accent: #2563eb;
    --success: #10b981;
    --warning: #f59e0b;
    --danger: #ef4444;
    --gradient-hero: linear-gradient(135deg, #0a0f1c 0%, #111d3a 50%, #0f172a 100%);
  }}

  * {{
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }}

  body {{
    font-family: 'Noto Sans TC', -apple-system, sans-serif;
    background: var(--bg-primary);
    color: var(--text-primary);
    line-height: 1.7;
    min-height: 100vh;
  }}

  /* ===== HERO ===== */
  .hero {{
    background: var(--gradient-hero);
    padding: 60px 40px 50px;
    position: relative;
    overflow: hidden;
    border-bottom: 1px solid var(--border);
  }}

  .hero::before {{
    content: '';
    position: absolute;
    top: -50%;
    right: -20%;
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, var(--accent-glow) 0%, transparent 70%);
    pointer-events: none;
  }}

  .hero-content {{
    max-width: 1100px;
    margin: 0 auto;
    position: relative;
    z-index: 1;
  }}

  .hero-label {{
    display: inline-block;
    background: rgba(59, 130, 246, 0.12);
    border: 1px solid rgba(59, 130, 246, 0.25);
    color: var(--accent-bright);
    padding: 6px 16px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    margin-bottom: 20px;
  }}

  .hero h1 {{
    font-size: 36px;
    font-weight: 900;
    letter-spacing: -0.5px;
    margin-bottom: 10px;
    background: linear-gradient(135deg, #e8edf5 0%, #93a3b8 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }}

  .hero-date {{
    font-size: 18px;
    color: var(--text-secondary);
    font-weight: 300;
  }}

  /* ===== STATS GRID ===== */
  .stats-grid {{
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    max-width: 1100px;
    margin: -30px auto 40px;
    padding: 0 40px;
    position: relative;
    z-index: 2;
  }}

  .stat-card {{
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 24px;
    text-align: center;
    transition: border-color 0.3s;
  }}

  .stat-card:hover {{
    border-color: var(--border-accent);
  }}

  .stat-value {{
    font-size: 36px;
    font-weight: 900;
    color: var(--accent-bright);
    line-height: 1;
    margin-bottom: 6px;
  }}

  .stat-label {{
    font-size: 13px;
    color: var(--text-secondary);
    font-weight: 400;
  }}

  /* ===== MAIN CONTENT ===== */
  .main {{
    max-width: 1100px;
    margin: 0 auto;
    padding: 0 40px 60px;
  }}

  .section {{
    margin-bottom: 48px;
  }}

  .section-title {{
    font-size: 20px;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 20px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    gap: 10px;
  }}

  .section-title .icon {{
    font-size: 22px;
  }}

  /* ===== SEARCH STATS TABLE ===== */
  .stats-table {{
    width: 100%;
    border-collapse: collapse;
    background: var(--bg-card);
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid var(--border);
  }}

  .stats-table tr {{
    border-bottom: 1px solid var(--border);
  }}

  .stats-table tr:last-child {{
    border-bottom: none;
  }}

  .stats-table td {{
    padding: 14px 20px;
  }}

  .query-name {{
    color: var(--text-primary);
    font-size: 14px;
    font-weight: 400;
    width: 40%;
  }}

  .query-count {{
    width: 60%;
  }}

  .bar-container {{
    display: flex;
    align-items: center;
    gap: 12px;
  }}

  .bar {{
    height: 6px;
    background: linear-gradient(90deg, var(--accent), var(--accent-bright));
    border-radius: 3px;
    min-width: 4px;
    transition: width 0.5s ease;
  }}

  .bar-label {{
    font-size: 14px;
    color: var(--text-secondary);
    font-weight: 500;
    min-width: 30px;
  }}

  /* ===== PAGE CARDS ===== */
  .page-card {{
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 14px;
    margin-bottom: 20px;
    overflow: hidden;
    transition: border-color 0.3s, box-shadow 0.3s;
  }}

  .page-card:hover {{
    border-color: var(--border-accent);
    box-shadow: 0 4px 24px rgba(59, 130, 246, 0.08);
  }}

  .page-header {{
    padding: 24px 28px 20px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 20px;
    flex-wrap: wrap;
    border-bottom: 1px solid var(--border);
  }}

  .page-name {{
    font-size: 18px;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 8px;
  }}

  .page-meta {{
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }}

  .ad-count-badge {{
    background: rgba(59, 130, 246, 0.12);
    color: var(--accent-bright);
    padding: 3px 12px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
  }}

  .query-tags {{
    font-size: 12px;
    color: var(--text-muted);
  }}

  .page-actions {{
    display: flex;
    gap: 10px;
    flex-shrink: 0;
  }}

  .page-link, .adlib-link {{
    display: inline-block;
    padding: 6px 14px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 500;
    text-decoration: none;
    transition: all 0.2s;
  }}

  .page-link {{
    background: rgba(59, 130, 246, 0.1);
    color: var(--accent-bright);
    border: 1px solid rgba(59, 130, 246, 0.2);
  }}

  .page-link:hover {{
    background: rgba(59, 130, 246, 0.2);
  }}

  .adlib-link {{
    background: rgba(16, 185, 129, 0.1);
    color: var(--success);
    border: 1px solid rgba(16, 185, 129, 0.2);
  }}

  .adlib-link:hover {{
    background: rgba(16, 185, 129, 0.2);
  }}

  /* ===== AD ITEMS ===== */
  .ad-list {{
    padding: 8px 28px 20px;
  }}

  .ad-item {{
    padding: 16px 0;
    border-bottom: 1px solid rgba(30, 41, 59, 0.6);
  }}

  .ad-item:last-child {{
    border-bottom: none;
  }}

  .ad-title {{
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 6px;
  }}

  .ad-body {{
    font-size: 14px;
    color: var(--text-secondary);
    line-height: 1.7;
    margin-bottom: 10px;
  }}

  .ad-meta {{
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
  }}

  .ad-date {{
    font-size: 12px;
    color: var(--text-muted);
  }}

  .ad-platform {{
    font-size: 12px;
    color: var(--text-muted);
  }}

  .ad-cta {{
    font-size: 11px;
    background: rgba(245, 158, 11, 0.1);
    color: var(--warning);
    padding: 2px 10px;
    border-radius: 8px;
  }}

  .ad-ext-link {{
    font-size: 12px;
    color: var(--accent-bright);
    text-decoration: none;
  }}

  .ad-ext-link:hover {{
    text-decoration: underline;
  }}

  .more-note {{
    text-align: center;
    color: var(--text-muted);
    font-size: 13px;
    padding: 16px 0 4px;
  }}

  /* ===== EMPTY STATE ===== */
  .empty-state {{
    text-align: center;
    padding: 80px 40px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 14px;
  }}

  .empty-icon {{
    font-size: 48px;
    margin-bottom: 16px;
  }}

  .empty-state h3 {{
    font-size: 20px;
    margin-bottom: 12px;
    color: var(--text-primary);
  }}

  .empty-state p {{
    color: var(--text-secondary);
    font-size: 14px;
    margin-bottom: 8px;
  }}

  /* ===== FOOTER ===== */
  .footer {{
    max-width: 1100px;
    margin: 0 auto;
    padding: 30px 40px;
    border-top: 1px solid var(--border);
    text-align: center;
    color: var(--text-muted);
    font-size: 12px;
  }}

  /* ===== RESPONSIVE ===== */
  @media (max-width: 768px) {{
    .hero {{
      padding: 40px 20px 36px;
    }}

    .hero h1 {{
      font-size: 26px;
    }}

    .stats-grid {{
      padding: 0 20px;
      grid-template-columns: repeat(2, 1fr);
    }}

    .main {{
      padding: 0 20px 40px;
    }}

    .page-header {{
      padding: 18px 20px 16px;
    }}

    .ad-list {{
      padding: 8px 20px 16px;
    }}

    .page-actions {{
      flex-direction: column;
    }}
  }}

  /* ===== PRINT ===== */
  @media print {{
    body {{ background: #fff; color: #111; }}
    .hero {{ background: #f8f9fa; border-bottom: 2px solid #e5e7eb; }}
    .hero h1 {{ -webkit-text-fill-color: #111; }}
    .stat-card, .page-card, .stats-table {{ border: 1px solid #e5e7eb; background: #fff; }}
    .stat-value {{ color: #2563eb; }}
    .ad-body {{ color: #555; }}
    a {{ color: #2563eb; }}
  }}
</style>
</head>
<body>

  <!-- HERO -->
  <header class="hero">
    <div class="hero-content">
      <div class="hero-label">CCPS Competitive Intelligence</div>
      <h1>馬來西亞房產廣告監控週報</h1>
      <div class="hero-date">{report_date}（週{week_label}）{report_time} 生成</div>
    </div>
  </header>

  <!-- STATS -->
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-value">{total_ads}</div>
      <div class="stat-label">偵測到的廣告數</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">{total_pages}</div>
      <div class="stat-label">投放中的粉專</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">{len(search_stats)}</div>
      <div class="stat-label">搜尋關鍵字數</div>
    </div>
  </div>

  <!-- MAIN -->
  <main class="main">

    <!-- 搜尋統計 -->
    <section class="section">
      <h2 class="section-title"><span class="icon">📊</span> 各關鍵字命中數</h2>
      <table class="stats-table">
        {stats_rows}
      </table>
    </section>

    <!-- 粉專與廣告明細 -->
    <section class="section">
      <h2 class="section-title"><span class="icon">📋</span> 投放中的粉專與廣告</h2>
      {page_cards}
    </section>

  </main>

  <footer class="footer">
    CCPS 廣告監控系統 · 家慶佳業 · 自動生成報告 · 資料來源：Meta Ad Library
  </footer>

</body>
</html>"""


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("使用方式: python report_generator.py <ads_json_path>")
        sys.exit(1)
    generate_report(sys.argv[1])
