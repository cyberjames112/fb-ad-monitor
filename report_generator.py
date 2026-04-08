"""
HTML 報告生成器 v4
- 雙分頁：FB 廣告 / YouTube 新影片
- 清爽明亮風格
- 所有連結可點擊
"""

import json
import os
import sys
from datetime import datetime, timezone, timedelta
from html import escape
from urllib.parse import quote as url_quote

MYT = timezone(timedelta(hours=8))


def generate_report(ads_json_path: str = None, yt_json_path: str = None) -> str:
    # 讀取 FB 廣告資料
    ads = []
    ad_search_stats = {}
    ad_total = 0
    ad_scan_time = ""
    if ads_json_path and os.path.exists(ads_json_path):
        with open(ads_json_path, "r", encoding="utf-8") as f:
            ad_data = json.load(f)
        ads = ad_data.get("ads", [])
        ad_search_stats = ad_data.get("search_stats", {})
        ad_total = ad_data.get("total_ads", len(ads))
        ad_scan_time = ad_data.get("scan_time", "")

    # 讀取 YouTube 資料
    videos = []
    yt_search_stats = {}
    yt_total = 0
    if yt_json_path and os.path.exists(yt_json_path):
        with open(yt_json_path, "r", encoding="utf-8") as f:
            yt_data = json.load(f)
        videos = yt_data.get("videos", [])
        yt_search_stats = yt_data.get("search_stats", {})
        yt_total = yt_data.get("total_videos", len(videos))

    now = datetime.now(MYT)
    report_date = now.strftime("%Y年%m月%d日")
    report_time = now.strftime("%H:%M")
    week_label = ["一", "二", "三", "四", "五", "六", "日"][now.weekday()]
    scan_time = ad_scan_time or now.strftime("%Y%m%d_%H%M%S")

    # 按粉專分組
    pages = {}
    for ad in ads:
        pname = ad.get("page_name", "未知粉專") or "未知粉專"
        if pname not in pages:
            pages[pname] = {"page_url": ad.get("page_url", ""), "ads": [], "queries": set()}
        pages[pname]["ads"].append(ad)
        pages[pname]["queries"].add(ad.get("search_query", ""))
    sorted_pages = sorted(pages.items(), key=lambda x: len(x[1]["ads"]), reverse=True)

    # 組裝 HTML
    fb_tab = _build_fb_tab(ad_total, len(pages), ad_search_stats, sorted_pages)
    yt_tab = _build_yt_tab(yt_total, yt_search_stats, videos)

    html = _build_page(report_date, report_time, week_label, ad_total, len(pages), yt_total, fb_tab, yt_tab)

    output_dir = os.path.dirname(ads_json_path) if ads_json_path else os.path.join(os.path.dirname(__file__), "output")
    os.makedirs(output_dir, exist_ok=True)
    html_file = os.path.join(output_dir, f"report_{scan_time}.html")
    with open(html_file, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"HTML 報告已生成: {html_file}")
    return html_file


def _build_fb_tab(total_ads, total_pages, search_stats, sorted_pages) -> str:
    # 統計表
    max_count = max(search_stats.values()) if search_stats else 1
    stats_rows = ""
    for query, count in search_stats.items():
        bar_w = int((count / max(max_count, 1)) * 100) if count > 0 else 2
        stats_rows += f"""
        <tr>
          <td class="q-name">{escape(query)}</td>
          <td><div class="bar-wrap"><div class="bar" style="width:{bar_w}%"></div><span class="bar-num">{count}</span></div></td>
        </tr>"""

    # 粉專卡片
    cards = ""
    for idx, (page_name, pd) in enumerate(sorted_pages):
        ad_count = len(pd["ads"])
        page_url = pd.get("page_url", "")
        queries = ", ".join(pd["queries"])

        page_link = f'<a href="{escape(page_url)}" target="_blank" class="btn btn-blue">查看粉專</a>' if page_url else ""
        adlib_url = f"https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=TW&q={url_quote(page_name)}"
        adlib_link = f'<a href="{adlib_url}" target="_blank" class="btn btn-green">Ad Library</a>'

        ad_items = ""
        for ad in pd["ads"][:8]:
            body = escape((ad.get("ad_text") or "")[:300])
            start = escape(str(ad.get("start_date", "")))
            platforms = escape(ad.get("platforms", ""))
            ad_lib_url = ad.get("ad_library_url", "")
            lib_id = ad.get("library_id", "")
            ext_link = ad.get("external_link", "")

            date_h = f'<span class="meta">📅 {start}</span>' if start else ""
            plat_h = f'<span class="meta">📱 {platforms}</span>' if platforms else ""

            ad_link_h = ""
            if ad_lib_url:
                ad_link_h = f'<a href="{escape(ad_lib_url)}" target="_blank" class="chip chip-blue">🔗 查看廣告</a>'
            elif lib_id:
                ad_link_h = f'<a href="https://www.facebook.com/ads/library/?id={lib_id}" target="_blank" class="chip chip-blue">🔗 查看廣告</a>'

            ext_h = f'<a href="{escape(ext_link)}" target="_blank" class="chip chip-orange">↗ 外部連結</a>' if ext_link else ""

            ad_items += f"""
            <div class="ad-row">
              <div class="ad-body">{body if body else '<em class="muted">（無文案）</em>'}</div>
              <div class="ad-meta">{date_h}{plat_h}{ad_link_h}{ext_h}</div>
            </div>"""

        more = f'<div class="more">還有 {ad_count - 8} 則，請至 Ad Library 查看</div>' if ad_count > 8 else ""

        cards += f"""
        <div class="card">
          <div class="card-head">
            <div>
              <div class="card-title">{escape(page_name)}</div>
              <div class="card-sub"><span class="badge">{ad_count} 則廣告</span> <span class="muted">{escape(queries)}</span></div>
            </div>
            <div class="card-actions">{page_link}{adlib_link}</div>
          </div>
          <div class="card-body">{ad_items}{more}</div>
        </div>"""

    if not sorted_pages:
        cards = '<div class="empty"><div class="empty-icon">🔍</div><h3>本週未偵測到相關廣告</h3><p>可能沒有針對台灣投放的吉隆坡置產說明會廣告。</p></div>'

    return f"""
    <div class="section">
      <h2 class="sec-title">📊 關鍵字命中數</h2>
      <table class="stats-tbl">{stats_rows}</table>
    </div>
    <div class="section">
      <h2 class="sec-title">📋 粉專與廣告明細</h2>
      {cards}
    </div>"""


def _build_yt_tab(total_videos, search_stats, videos) -> str:
    if not videos:
        return '<div class="empty"><div class="empty-icon">🎬</div><h3>本週未找到新影片</h3><p>過去 7 天沒有符合關鍵字的新影片上架，或未設定 YouTube API Key。</p></div>'

    # 統計
    max_count = max(search_stats.values()) if search_stats else 1
    stats_rows = ""
    for query, count in search_stats.items():
        bar_w = int((count / max(max_count, 1)) * 100) if count > 0 else 2
        stats_rows += f"""
        <tr>
          <td class="q-name">{escape(query)}</td>
          <td><div class="bar-wrap"><div class="bar bar-red" style="width:{bar_w}%"></div><span class="bar-num">{count}</span></div></td>
        </tr>"""

    # 影片卡片
    video_cards = ""
    for v in videos:
        title = escape(v.get("title", ""))
        desc = escape(v.get("description", "")[:200])
        channel = escape(v.get("channel_name", ""))
        channel_url = v.get("channel_url", "")
        video_url = v.get("video_url", "")
        thumbnail = v.get("thumbnail", "")
        published = v.get("published_at", "")[:10]
        views = v.get("view_count", 0)
        likes = v.get("like_count", 0)
        duration = v.get("duration", "")

        views_str = f"{views:,}" if views else "—"
        likes_str = f"{likes:,}" if likes else "—"

        video_cards += f"""
        <div class="yt-card">
          <a href="{escape(video_url)}" target="_blank" class="yt-thumb">
            <img src="{escape(thumbnail)}" alt="" loading="lazy">
            {'<span class="yt-dur">' + escape(duration) + '</span>' if duration else ''}
          </a>
          <div class="yt-info">
            <a href="{escape(video_url)}" target="_blank" class="yt-title">{title}</a>
            <a href="{escape(channel_url)}" target="_blank" class="yt-channel">{channel}</a>
            <div class="yt-desc">{desc}</div>
            <div class="yt-meta">
              <span>📅 {published}</span>
              <span>👁 {views_str}</span>
              <span>👍 {likes_str}</span>
            </div>
          </div>
        </div>"""

    return f"""
    <div class="section">
      <h2 class="sec-title">📊 關鍵字搜尋結果</h2>
      <table class="stats-tbl">{stats_rows}</table>
    </div>
    <div class="section">
      <h2 class="sec-title">🎬 本週新影片（{total_videos} 部）</h2>
      <div class="yt-grid">{video_cards}</div>
    </div>"""


def _build_page(report_date, report_time, week_label, ad_total, page_total, yt_total, fb_tab, yt_tab) -> str:
    return f"""<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>CCPS 週報 — {report_date}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;600;700&display=swap');
:root {{
  --bg:#f7f8fc; --white:#fff; --blue:#2563eb; --blue-l:#dbeafe; --blue-d:#1d4ed8;
  --green:#059669; --green-l:#d1fae5; --orange:#d97706; --orange-l:#fef3c7;
  --red:#dc2626; --red-l:#fee2e2;
  --txt:#1e293b; --txt2:#64748b; --txt3:#94a3b8;
  --bdr:#e2e8f0; --bdr2:#f1f5f9;
  --r:10px;
}}
*{{margin:0;padding:0;box-sizing:border-box}}
body{{font-family:'Noto Sans TC',-apple-system,sans-serif;background:var(--bg);color:var(--txt);line-height:1.7;-webkit-font-smoothing:antialiased}}

/* HEADER */
.hdr{{background:var(--white);border-bottom:1px solid var(--bdr);padding:32px 40px 28px}}
.hdr-in{{max-width:960px;margin:0 auto}}
.hdr-label{{display:inline-block;background:var(--blue-l);color:var(--blue);padding:4px 12px;border-radius:6px;font-size:12px;font-weight:600;margin-bottom:12px}}
.hdr h1{{font-size:24px;font-weight:700;margin-bottom:4px}}
.hdr-date{{font-size:14px;color:var(--txt2)}}

/* STATS ROW */
.stats-row{{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;max-width:960px;margin:20px auto;padding:0 40px}}
.st{{background:var(--white);border:1px solid var(--bdr);border-radius:var(--r);padding:18px;text-align:center}}
.st-v{{font-size:30px;font-weight:700;line-height:1.2}}
.st-v.blue{{color:var(--blue)}} .st-v.green{{color:var(--green)}} .st-v.red{{color:var(--red)}}
.st-l{{font-size:12px;color:var(--txt2);margin-top:2px}}

/* TABS */
.tabs{{max-width:960px;margin:24px auto 0;padding:0 40px;display:flex;gap:0;border-bottom:2px solid var(--bdr)}}
.tab{{padding:10px 24px;font-size:14px;font-weight:600;color:var(--txt3);cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;transition:all .15s;user-select:none}}
.tab:hover{{color:var(--txt2)}}
.tab.active{{color:var(--blue);border-bottom-color:var(--blue)}}
.tab-content{{display:none}}.tab-content.active{{display:block}}

/* MAIN */
.main{{max-width:960px;margin:0 auto;padding:0 40px 60px}}
.section{{margin-top:28px}}
.sec-title{{font-size:16px;font-weight:600;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid var(--bdr2)}}

/* STATS TABLE */
.stats-tbl{{width:100%;border-collapse:collapse;background:var(--white);border-radius:var(--r);overflow:hidden;border:1px solid var(--bdr)}}
.stats-tbl tr{{border-bottom:1px solid var(--bdr2)}}.stats-tbl tr:last-child{{border:0}}
.stats-tbl td{{padding:10px 16px}}
.q-name{{font-size:14px;width:40%}}
.bar-wrap{{display:flex;align-items:center;gap:8px}}
.bar{{height:8px;background:linear-gradient(90deg,#60a5fa,var(--blue));border-radius:4px;min-width:4px}}
.bar-red{{background:linear-gradient(90deg,#fca5a5,var(--red))}}
.bar-num{{font-size:14px;font-weight:600;min-width:24px}}

/* CARDS */
.card{{background:var(--white);border:1px solid var(--bdr);border-radius:var(--r);margin-bottom:14px;overflow:hidden;transition:box-shadow .2s}}
.card:hover{{box-shadow:0 4px 12px rgba(0,0,0,.06)}}
.card-head{{padding:18px 22px 14px;display:flex;justify-content:space-between;align-items:flex-start;gap:14px;flex-wrap:wrap;border-bottom:1px solid var(--bdr2)}}
.card-title{{font-size:16px;font-weight:600;margin-bottom:4px}}
.card-sub{{display:flex;align-items:center;gap:8px;flex-wrap:wrap}}
.badge{{background:var(--blue-l);color:var(--blue);padding:2px 10px;border-radius:12px;font-size:12px;font-weight:600}}
.muted{{font-size:12px;color:var(--txt3)}}
.card-actions{{display:flex;gap:6px;flex-shrink:0}}
.btn{{display:inline-block;padding:5px 12px;border-radius:7px;font-size:12px;font-weight:500;text-decoration:none;transition:all .15s}}
.btn-blue{{background:var(--blue-l);color:var(--blue)}}.btn-blue:hover{{background:var(--blue);color:#fff}}
.btn-green{{background:var(--green-l);color:var(--green)}}.btn-green:hover{{background:var(--green);color:#fff}}
.card-body{{padding:4px 22px 16px}}
.ad-row{{padding:12px 0;border-bottom:1px solid var(--bdr2)}}.ad-row:last-child{{border:0}}
.ad-body{{font-size:14px;color:var(--txt2);margin-bottom:6px}}
.ad-meta{{display:flex;align-items:center;gap:10px;flex-wrap:wrap}}
.meta{{font-size:12px;color:var(--txt3)}}
.chip{{display:inline-block;font-size:12px;font-weight:600;text-decoration:none;padding:2px 10px;border-radius:5px;transition:all .15s}}
.chip-blue{{background:var(--blue-l);color:var(--blue)}}.chip-blue:hover{{background:var(--blue);color:#fff}}
.chip-orange{{background:var(--orange-l);color:var(--orange)}}
.more{{text-align:center;color:var(--txt3);font-size:13px;padding:10px 0 2px}}

/* YOUTUBE CARDS */
.yt-grid{{display:flex;flex-direction:column;gap:14px}}
.yt-card{{display:flex;gap:16px;background:var(--white);border:1px solid var(--bdr);border-radius:var(--r);overflow:hidden;transition:box-shadow .2s}}
.yt-card:hover{{box-shadow:0 4px 12px rgba(0,0,0,.06)}}
.yt-thumb{{position:relative;flex-shrink:0;width:240px;height:135px;overflow:hidden;display:block}}
.yt-thumb img{{width:100%;height:100%;object-fit:cover;display:block}}
.yt-dur{{position:absolute;bottom:6px;right:6px;background:rgba(0,0,0,.8);color:#fff;font-size:11px;font-weight:600;padding:2px 6px;border-radius:4px}}
.yt-info{{padding:14px 16px 14px 0;flex:1;min-width:0}}
.yt-title{{display:block;font-size:15px;font-weight:600;color:var(--txt);text-decoration:none;margin-bottom:4px;line-height:1.4}}
.yt-title:hover{{color:var(--blue)}}
.yt-channel{{display:inline-block;font-size:13px;color:var(--red);text-decoration:none;margin-bottom:6px}}
.yt-channel:hover{{text-decoration:underline}}
.yt-desc{{font-size:13px;color:var(--txt2);line-height:1.6;margin-bottom:8px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}}
.yt-meta{{display:flex;gap:14px;font-size:12px;color:var(--txt3)}}

/* EMPTY */
.empty{{text-align:center;padding:50px 40px;background:var(--white);border:1px solid var(--bdr);border-radius:var(--r)}}
.empty-icon{{font-size:36px;margin-bottom:10px}}
.empty h3{{font-size:17px;margin-bottom:6px}}
.empty p{{color:var(--txt2);font-size:14px}}

/* FOOTER */
.ftr{{max-width:960px;margin:0 auto;padding:20px 40px;text-align:center;color:var(--txt3);font-size:12px;border-top:1px solid var(--bdr2)}}

/* RESPONSIVE */
@media(max-width:768px){{
  .hdr,.stats-row,.tabs,.main{{padding-left:20px;padding-right:20px}}
  .hdr h1{{font-size:20px}}
  .stats-row{{grid-template-columns:repeat(2,1fr)}}
  .yt-card{{flex-direction:column}}
  .yt-thumb{{width:100%;height:auto;aspect-ratio:16/9}}
  .yt-info{{padding:12px 16px 16px}}
  .card-actions{{width:100%}}.btn{{flex:1;text-align:center}}
}}
@media print{{body{{background:#fff}}.card,.yt-card,.st{{box-shadow:none;border:1px solid #ddd}}}}
</style>
</head>
<body>

<header class="hdr">
  <div class="hdr-in">
    <div class="hdr-label">CCPS 競品情報</div>
    <h1>吉隆坡置產 · 週報</h1>
    <div class="hdr-date">{report_date}（週{week_label}）{report_time} 掃描</div>
  </div>
</header>

<div class="stats-row">
  <div class="st"><div class="st-v blue">{ad_total}</div><div class="st-l">FB 廣告</div></div>
  <div class="st"><div class="st-v green">{page_total}</div><div class="st-l">投放粉專</div></div>
  <div class="st"><div class="st-v red">{yt_total}</div><div class="st-l">YT 新影片</div></div>
</div>

<div class="tabs">
  <div class="tab active" onclick="switchTab('fb')">📢 FB 廣告</div>
  <div class="tab" onclick="switchTab('yt')">🎬 YouTube 影片</div>
</div>

<main class="main">
  <div id="tab-fb" class="tab-content active">{fb_tab}</div>
  <div id="tab-yt" class="tab-content">{yt_tab}</div>
</main>

<footer class="ftr">CCPS 廣告監控系統 · 家慶佳業 · FB 投放地區：台灣 · YT 搜尋範圍：過去 7 天</footer>

<script>
function switchTab(id) {{
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
  document.getElementById('tab-' + id).classList.add('active');
  event.target.classList.add('active');
}}
</script>
</body>
</html>"""


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("使用方式: python report_generator.py <ads_json> [youtube_json]")
        sys.exit(1)
    ads_path = sys.argv[1] if sys.argv[1] != "-" else None
    yt_path = sys.argv[2] if len(sys.argv) > 2 else None
    generate_report(ads_path, yt_path)
