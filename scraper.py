"""
Facebook Ad Library 廣告監控爬蟲 v3
- 精準搜尋：吉隆坡置產說明會相關中文關鍵字
- 地區限定：台灣（TW）
- 擷取 Ad Library 廣告連結
"""

import asyncio
import json
import os
import re
from datetime import datetime, timezone, timedelta
from urllib.parse import quote
from playwright.async_api import async_playwright

# ===== 搜尋設定 =====
SEARCH_QUERIES = [
    "吉隆坡 說明會",
    "吉隆坡 置產",
    "吉隆坡 建案",
    "吉隆坡 投資說明會",
    "馬來西亞 說明會",
    "馬來西亞 置產",
    "馬來西亞 建案",
    "大馬 說明會",
    "大馬 置產",
    "大馬 建案",
    "海外置產 說明會",
    "第二家園",
    "MM2H",
]

COUNTRY = "TW"  # 只搜尋投放到台灣的廣告
MAX_SCROLL = 5
SCROLL_DELAY = 3


async def scrape_one_query(search_term: str, country: str = "TW") -> dict:
    """搜尋一個關鍵字，回傳廣告列表"""
    graphql_responses = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 1920, "height": 1080},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/125.0.0.0 Safari/537.36"
            ),
            locale="en-US",
        )
        page = await context.new_page()

        # 攔截 GraphQL（存原始資料供分析）
        async def handle_response(response):
            try:
                if "graphql" in response.url and response.status == 200:
                    ct = response.headers.get("content-type", "")
                    if "json" in ct or "text" in ct:
                        body = await response.text()
                        for line in body.strip().split("\n"):
                            line = line.strip()
                            if not line:
                                continue
                            try:
                                graphql_responses.append(json.loads(line))
                            except json.JSONDecodeError:
                                pass
            except Exception:
                pass

        page.on("response", handle_response)

        url = (
            f"https://www.facebook.com/ads/library/"
            f"?active_status=active"
            f"&ad_type=all"
            f"&country={country}"
            f"&q={quote(search_term)}"
            f"&search_type=keyword_unordered"
            f"&media_type=all"
        )

        print(f"  搜尋: {search_term}")
        try:
            await page.goto(url, wait_until="networkidle", timeout=45000)
        except Exception as e:
            print(f"  ⚠ 頁面載入逾時: {e}")

        await asyncio.sleep(4)

        # 關閉彈窗
        for selector in [
            'div[aria-label="Close"]',
            'div[aria-label="關閉"]',
            'button:has-text("Accept All")',
            'button:has-text("Accept")',
            'button:has-text("Allow essential and optional cookies")',
            'div[aria-label="Decline optional cookies"]',
        ]:
            try:
                btn = page.locator(selector).first
                if await btn.is_visible(timeout=1000):
                    await btn.click()
                    await asyncio.sleep(1)
            except Exception:
                pass

        # 捲動載入更多
        for i in range(MAX_SCROLL):
            await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            await asyncio.sleep(SCROLL_DELAY)
            print(f"  捲動 {i + 1}/{MAX_SCROLL}")

        # 截圖
        screenshot_dir = os.path.join(os.path.dirname(__file__), "screenshots")
        os.makedirs(screenshot_dir, exist_ok=True)
        safe_name = re.sub(r'[^\w]', '_', search_term)[:30]
        screenshot_path = os.path.join(screenshot_dir, f"{safe_name}.png")
        await page.screenshot(path=screenshot_path, full_page=False)

        # ===== HTML DOM 解析 =====
        ads_raw = await page.evaluate(r"""() => {
            const results = [];

            // 找所有包含 "Started running" 的文字節點
            const walker = document.createTreeWalker(
                document.body,
                NodeFilter.SHOW_TEXT,
                { acceptNode: n =>
                    (n.textContent.includes('Started running') ||
                     n.textContent.includes('開始投放'))
                    ? NodeFilter.FILTER_ACCEPT
                    : NodeFilter.FILTER_REJECT
                }
            );

            const dateNodes = [];
            while (walker.nextNode()) {
                dateNodes.push(walker.currentNode);
            }

            const processedContainers = new Set();

            for (const dateNode of dateNodes) {
                let container = dateNode.parentElement;
                let attempts = 0;
                while (container && attempts < 10) {
                    const text = container.innerText || '';
                    if (text.length > 100 && text.length < 8000) {
                        const style = window.getComputedStyle(container);
                        const hasBoundary = (
                            parseInt(style.padding) > 0 ||
                            parseInt(style.paddingTop) > 5 ||
                            style.borderWidth !== '0px' ||
                            style.boxShadow !== 'none'
                        );
                        const childDivs = container.querySelectorAll(':scope > div');
                        if (hasBoundary || childDivs.length >= 2) break;
                    }
                    container = container.parentElement;
                    attempts++;
                }

                if (!container || processedContainers.has(container)) continue;
                processedContainers.add(container);

                const text = container.innerText || '';
                const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

                const ad = {
                    page_name: '',
                    page_url: '',
                    ad_text: '',
                    start_date: '',
                    library_id: '',
                    ad_library_url: '',
                    platforms: '',
                    external_link: '',
                };

                // 1. 粉專名稱和連結
                const allLinks = container.querySelectorAll('a[href]');
                for (const link of allLinks) {
                    const href = link.href || '';
                    if (href.includes('facebook.com') && !href.includes('/ads/library') &&
                        !href.includes('/ad_library')) {
                        const name = (link.innerText || '').trim();
                        if (name && name.length > 1 && name.length < 100) {
                            ad.page_name = name;
                            ad.page_url = href;
                            break;
                        }
                    }
                }

                if (!ad.page_name) {
                    for (const line of lines) {
                        if (line.length > 2 && line.length < 80 &&
                            !line.match(/^(Started|Active|Inactive|Library|Ad|See |About|Disclaimer|開始|進行|廣告)/)) {
                            ad.page_name = line;
                            break;
                        }
                    }
                }

                // 2. 日期
                for (const line of lines) {
                    const enMatch = line.match(/Started running on\s+(.+)/i);
                    if (enMatch) { ad.start_date = enMatch[1].trim(); break; }
                    const zhMatch = line.match(/開始投放[日期]*[：:]\s*(.+)/);
                    if (zhMatch) { ad.start_date = zhMatch[1].trim(); break; }
                }

                // 3. Library ID + Ad Library 連結
                for (const line of lines) {
                    const idMatch = line.match(/(?:Library ID|廣告檔案庫編號)[：:\s]*(\d+)/i);
                    if (idMatch) {
                        ad.library_id = idMatch[1];
                        ad.ad_library_url = 'https://www.facebook.com/ads/library/?id=' + idMatch[1];
                        break;
                    }
                }

                // 也從連結中找 Ad Library 連結
                if (!ad.ad_library_url) {
                    for (const link of allLinks) {
                        const href = link.href || '';
                        if (href.includes('/ads/library/') && href.includes('id=')) {
                            ad.ad_library_url = href;
                            const m = href.match(/id=(\d+)/);
                            if (m) ad.library_id = m[1];
                            break;
                        }
                    }
                }

                // 4. 平台
                for (const line of lines) {
                    if (line.match(/^\s*(Facebook|Instagram|Messenger|Audience Network)/)) {
                        const ps = [];
                        if (line.includes('Facebook')) ps.push('Facebook');
                        if (line.includes('Instagram')) ps.push('Instagram');
                        if (line.includes('Messenger')) ps.push('Messenger');
                        if (line.includes('Audience Network')) ps.push('Audience Network');
                        if (ps.length > 0 && ps.length <= 4) {
                            ad.platforms = ps.join(', ');
                        }
                    }
                }

                // 5. 廣告文案
                const skipPatterns = [
                    /^Started running/i, /^開始投放/, /^Library ID/i, /^廣告檔案庫/,
                    /^Active$/i, /^Inactive$/i, /^See summary/i, /^查看摘要/,
                    /^About this ad/i, /^關於此廣告/, /^See ad details/i,
                    /^Disclaimer/i, /^Impressions/i, /^See All/i, /^Ad $/i,
                    /^Platforms?$/i, /^Facebook$/i, /^Instagram$/i,
                    /^Multiple/i, /^Sponsored/i,
                ];
                const bodyLines = lines.filter(line => {
                    if (line === ad.page_name) return false;
                    if (line === ad.platforms) return false;
                    if (line.length < 4) return false;
                    return !skipPatterns.some(pat => pat.test(line));
                });
                ad.ad_text = bodyLines.slice(0, 6).join(' ').substring(0, 500);

                // 6. 外部連結
                for (const link of allLinks) {
                    const href = link.href || '';
                    if (href && !href.includes('facebook.com') && !href.includes('instagram.com') &&
                        href.startsWith('http') && !href.includes('l.facebook.com')) {
                        ad.external_link = href;
                        break;
                    }
                }

                if (ad.page_name || ad.ad_text.length > 15) {
                    results.push(ad);
                }
            }

            // 備用方案
            if (results.length === 0) {
                const fallbackCards = document.querySelectorAll(
                    'div._7jvw, div[role="article"], div[class*="xrvj5dj"]'
                );
                for (const card of fallbackCards) {
                    const text = card.innerText || '';
                    if (text.length < 30) continue;
                    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                    if (lines.length < 2) continue;
                    const ad = {
                        page_name: lines[0] || '',
                        page_url: '',
                        ad_text: lines.slice(1, 5).join(' ').substring(0, 500),
                        start_date: '',
                        library_id: '',
                        ad_library_url: '',
                        platforms: '',
                        external_link: '',
                        source: 'fallback',
                    };
                    for (const line of lines) {
                        const m = line.match(/Started running on\s+(.+)/i);
                        if (m) { ad.start_date = m[1].trim(); break; }
                    }
                    if (ad.page_name && ad.page_name.length < 100) results.push(ad);
                }
            }

            return results;
        }""")

        print(f"  HTML 解析取得 {len(ads_raw)} 則廣告")
        print(f"  GraphQL 攔截取得 {len(graphql_responses)} 個回應")

        await browser.close()

    return {
        "ads": ads_raw,
        "graphql_raw": graphql_responses,
        "screenshot": screenshot_path,
    }


async def main():
    """主流程"""
    MYT = timezone(timedelta(hours=8))
    print("=" * 60)
    print(f"Facebook Ad Library 廣告監控 v3")
    print(f"目標：吉隆坡置產說明會 · 投放地區：台灣")
    print(f"執行時間: {datetime.now(MYT).strftime('%Y-%m-%d %H:%M:%S')} (MYT)")
    print("=" * 60)

    all_ads = []
    all_graphql = []
    search_stats = {}

    for query in SEARCH_QUERIES:
        print(f"\n{'─' * 40}")
        print(f"關鍵字: {query}")

        result = await scrape_one_query(query, COUNTRY)
        ads = result["ads"]
        search_stats[query] = len(ads)

        for ad in ads:
            ad["search_query"] = query

        all_ads.extend(ads)
        all_graphql.extend(result["graphql_raw"])
        await asyncio.sleep(5)

    # 去重
    unique_ads = []
    seen = set()
    for ad in all_ads:
        # 用 library_id 去重最精準，否則用 page_name + 文案前 80 字
        if ad.get("library_id"):
            key = ad["library_id"]
        else:
            key = f"{ad.get('page_name', '')}|{ad.get('ad_text', '')[:80]}"
        if key in seen:
            continue
        seen.add(key)
        unique_ads.append(ad)

    print(f"\n{'=' * 60}")
    print(f"總計收集 {len(all_ads)} 則廣告，去重後 {len(unique_ads)} 則")
    for q, count in search_stats.items():
        print(f"  {q}: {count} 則")

    # 儲存
    output_dir = os.path.join(os.path.dirname(__file__), "output")
    os.makedirs(output_dir, exist_ok=True)
    now_str = datetime.now(MYT).strftime("%Y%m%d_%H%M%S")

    ads_file = os.path.join(output_dir, f"ads_{now_str}.json")
    with open(ads_file, "w", encoding="utf-8") as f:
        json.dump({
            "scan_time": now_str,
            "total_ads": len(unique_ads),
            "search_stats": search_stats,
            "ads": unique_ads,
        }, f, ensure_ascii=False, indent=2)
    print(f"\n結果已儲存: {ads_file}")

    raw_file = os.path.join(output_dir, f"raw_{now_str}.json")
    with open(raw_file, "w", encoding="utf-8") as f:
        json.dump(all_graphql, f, ensure_ascii=False, indent=2)

    return ads_file


if __name__ == "__main__":
    asyncio.run(main())
