"""
Facebook Ad Library 廣告監控爬蟲
- 搜尋馬來西亞房產/建案/說明會相關廣告
- 透過攔截 GraphQL 回應取得結構化資料
- 輸出 JSON 供報告生成器使用
"""

import asyncio
import json
import os
import re
import time
from datetime import datetime, timezone, timedelta
from playwright.async_api import async_playwright

# ===== 搜尋設定 =====
SEARCH_QUERIES = [
    # 地點關鍵字
    "吉隆坡",
    "Kuala Lumpur property",
    "KL condo",
    "Mont Kiara",
    "Bukit Bintang",
    # 活動關鍵字
    "馬來西亞 說明會",
    "馬來西亞 投資說明",
    "大馬 建案",
    "海外置產 馬來西亞",
    "MM2H",
    # 英文關鍵字
    "Malaysia property investment",
    "KL new launch condo",
]

COUNTRY = "MY"  # 馬來西亞
MAX_SCROLL = 5   # 每個關鍵字最多捲動次數
SCROLL_DELAY = 3  # 每次捲動間隔秒數


async def scrape_ad_library_graphql(search_term: str, country: str = "MY") -> list:
    """
    用 GraphQL 攔截法爬取 Ad Library 資料。
    Ad Library 頁面載入時會發出 GraphQL 請求，
    我們攔截這些回應來取得結構化的廣告資料。
    """
    collected_responses = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 1920, "height": 1080},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/125.0.0.0 Safari/537.36"
            ),
            locale="zh-TW",
        )
        page = await context.new_page()

        # 攔截 GraphQL 回應
        async def handle_response(response):
            try:
                url = response.url
                if "graphql" in url and response.status == 200:
                    content_type = response.headers.get("content-type", "")
                    if "json" in content_type or "text" in content_type:
                        body = await response.text()
                        # 有些回應是多行 JSON
                        for line in body.strip().split("\n"):
                            line = line.strip()
                            if not line:
                                continue
                            try:
                                data = json.loads(line)
                                collected_responses.append(data)
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
            f"&q={search_term}"
            f"&search_type=keyword_unordered"
            f"&media_type=all"
        )

        print(f"  搜尋: {search_term}")
        try:
            await page.goto(url, wait_until="networkidle", timeout=30000)
        except Exception as e:
            print(f"  ⚠ 頁面載入逾時，繼續處理已收集的資料: {e}")

        # 等待內容載入
        await asyncio.sleep(3)

        # 捲動頁面載入更多廣告
        for i in range(MAX_SCROLL):
            await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            await asyncio.sleep(SCROLL_DELAY)
            print(f"  捲動 {i + 1}/{MAX_SCROLL}")

        await browser.close()

    return collected_responses


def extract_ads_from_graphql(responses: list) -> list:
    """
    從 GraphQL 回應中提取廣告資料。
    Meta 的 GraphQL 回應結構可能變動，這裡嘗試多種路徑提取。
    """
    ads = []
    seen_ids = set()

    for resp in responses:
        try:
            _extract_recursive(resp, ads, seen_ids)
        except Exception:
            pass

    return ads


def _extract_recursive(obj, ads: list, seen_ids: set, depth=0):
    """遞迴搜尋 JSON 結構中的廣告資料"""
    if depth > 15 or obj is None:
        return

    if isinstance(obj, dict):
        # 嘗試識別廣告節點 — 常見的欄位名稱
        is_ad = False
        ad_data = {}

        # 檢查是否有廣告相關欄位
        ad_id = obj.get("adArchiveID") or obj.get("ad_archive_id") or obj.get("adid") or obj.get("id")
        
        if obj.get("adArchiveID") or obj.get("isAdLibraryEntry") or obj.get("snapshot"):
            is_ad = True
            ad_data["ad_id"] = ad_id or "unknown"

        if obj.get("collation_count") is not None or obj.get("collationCount") is not None:
            is_ad = True

        # 提取頁面/粉專資訊
        page_info = obj.get("page_info") or obj.get("pageInfo") or obj.get("page") or {}
        if isinstance(page_info, dict):
            ad_data["page_name"] = page_info.get("name") or page_info.get("page_name") or ""
            ad_data["page_id"] = page_info.get("id") or page_info.get("page_id") or ""
            page_profile = page_info.get("profile_picture") or page_info.get("profilePicture") or {}
            if isinstance(page_profile, dict):
                ad_data["page_avatar"] = page_profile.get("uri") or ""

        # 直接在當前層級找頁面名稱
        if not ad_data.get("page_name"):
            ad_data["page_name"] = obj.get("page_name") or obj.get("pageName") or ""
        if not ad_data.get("page_id"):
            ad_data["page_id"] = obj.get("page_id") or obj.get("pageID") or ""

        # 提取廣告快照/內容
        snapshot = obj.get("snapshot") or obj
        if isinstance(snapshot, dict):
            # 廣告文案
            body = snapshot.get("body") or snapshot.get("ad_creative_body") or {}
            if isinstance(body, dict):
                ad_data["body_text"] = body.get("text") or body.get("markup", {}).get("__html", "") or ""
            elif isinstance(body, str):
                ad_data["body_text"] = body
            else:
                ad_data["body_text"] = ""

            # 標題
            title = snapshot.get("title") or snapshot.get("link_title") or ""
            if isinstance(title, dict):
                ad_data["title"] = title.get("text") or ""
            else:
                ad_data["title"] = str(title) if title else ""

            # CTA 連結
            cta = snapshot.get("cta_text") or snapshot.get("ctaText") or ""
            ad_data["cta_text"] = cta if isinstance(cta, str) else ""

            link_url = snapshot.get("link_url") or snapshot.get("linkUrl") or ""
            ad_data["link_url"] = link_url if isinstance(link_url, str) else ""

            # 廣告素材
            images = snapshot.get("images") or snapshot.get("cards") or []
            if isinstance(images, list) and images:
                ad_data["has_media"] = True
                first = images[0] if images else {}
                if isinstance(first, dict):
                    ad_data["media_url"] = first.get("original_image_url") or first.get("resized_image_url") or ""

        # 廣告時間
        ad_data["start_date"] = obj.get("startDate") or obj.get("start_date") or obj.get("ad_delivery_start_time") or ""
        ad_data["end_date"] = obj.get("endDate") or obj.get("end_date") or obj.get("ad_delivery_stop_time") or ""

        # 投放狀態
        ad_data["is_active"] = obj.get("isActive") or obj.get("is_active") or obj.get("ad_delivery_status") or ""

        # 花費
        spend = obj.get("spend") or obj.get("ad_spend") or {}
        if isinstance(spend, dict):
            ad_data["spend_lower"] = spend.get("lower_bound") or spend.get("min") or ""
            ad_data["spend_upper"] = spend.get("upper_bound") or spend.get("max") or ""

        # 曝光
        impressions = obj.get("impressions") or obj.get("ad_impressions") or {}
        if isinstance(impressions, dict):
            ad_data["impressions_lower"] = impressions.get("lower_bound") or impressions.get("min") or ""
            ad_data["impressions_upper"] = impressions.get("upper_bound") or impressions.get("max") or ""

        # 平台
        platforms = obj.get("publisher_platforms") or obj.get("publisherPlatforms") or []
        if isinstance(platforms, list):
            ad_data["platforms"] = ", ".join(str(p) for p in platforms)

        if is_ad and ad_data.get("page_name"):
            unique_key = f"{ad_data.get('ad_id', '')}_{ad_data.get('page_name', '')}"
            if unique_key not in seen_ids:
                seen_ids.add(unique_key)
                ads.append(ad_data)

        # 繼續遞迴搜尋子物件
        for key, value in obj.items():
            _extract_recursive(value, ads, seen_ids, depth + 1)

    elif isinstance(obj, list):
        for item in obj:
            _extract_recursive(item, ads, seen_ids, depth + 1)


async def scrape_ad_library_html(search_term: str, country: str = "MY") -> list:
    """
    備用方案：直接從 HTML DOM 提取廣告卡片資訊。
    當 GraphQL 攔截拿不到資料時使用。
    """
    ads = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 1920, "height": 1080},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/125.0.0.0 Safari/537.36"
            ),
            locale="zh-TW",
        )
        page = await context.new_page()

        url = (
            f"https://www.facebook.com/ads/library/"
            f"?active_status=active"
            f"&ad_type=all"
            f"&country={country}"
            f"&q={search_term}"
            f"&search_type=keyword_unordered"
            f"&media_type=all"
        )

        print(f"  [HTML模式] 搜尋: {search_term}")
        try:
            await page.goto(url, wait_until="networkidle", timeout=30000)
        except Exception:
            pass

        await asyncio.sleep(3)

        # 捲動載入更多
        for i in range(MAX_SCROLL):
            await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            await asyncio.sleep(SCROLL_DELAY)

        # 嘗試截圖以便除錯
        screenshot_dir = os.path.join(os.path.dirname(__file__), "screenshots")
        os.makedirs(screenshot_dir, exist_ok=True)
        safe_name = re.sub(r'[^\w]', '_', search_term)[:30]
        await page.screenshot(
            path=os.path.join(screenshot_dir, f"{safe_name}.png"),
            full_page=False,
        )

        # 提取廣告卡片 — 從可見文字中盡量抓取資訊
        # Ad Library 的結構經常變動，這裡用寬泛的選擇器
        cards = await page.query_selector_all('div[class*="x1yztbdb"]')
        if not cards:
            cards = await page.query_selector_all('div[role="article"]')
        if not cards:
            # 最後嘗試：找所有看起來像廣告卡片的區塊
            cards = await page.query_selector_all('div._7jvw')

        print(f"  找到 {len(cards)} 個可能的廣告卡片")

        for card in cards:
            try:
                text = await card.inner_text()
                lines = [l.strip() for l in text.split("\n") if l.strip()]
                if len(lines) >= 2:
                    ad = {
                        "page_name": lines[0] if lines else "",
                        "body_text": " ".join(lines[1:4]) if len(lines) > 1 else "",
                        "start_date": "",
                        "source": "html_parse",
                    }
                    # 嘗試找日期模式
                    for line in lines:
                        if any(kw in line for kw in ["Started", "開始", "started", "Active"]):
                            ad["start_date"] = line
                            break
                    ads.append(ad)
            except Exception:
                pass

        await browser.close()

    return ads


async def main():
    """主流程：依序搜尋所有關鍵字，合併結果"""
    print("=" * 60)
    print(f"Facebook Ad Library 廣告監控")
    print(f"執行時間: {datetime.now(timezone(timedelta(hours=8))).strftime('%Y-%m-%d %H:%M:%S')} (MYT)")
    print("=" * 60)

    all_ads = []
    all_raw = []
    search_stats = {}

    for query in SEARCH_QUERIES:
        print(f"\n{'─' * 40}")
        print(f"關鍵字: {query}")

        # 先嘗試 GraphQL 攔截法
        raw_responses = await scrape_ad_library_graphql(query, COUNTRY)
        ads = extract_ads_from_graphql(raw_responses)
        print(f"  GraphQL 攔截取得 {len(raw_responses)} 個回應，解析出 {len(ads)} 則廣告")

        # 如果 GraphQL 沒抓到，用 HTML 備用方案
        if not ads:
            html_ads = await scrape_ad_library_html(query, COUNTRY)
            ads = html_ads
            print(f"  HTML 備用方案取得 {len(ads)} 則廣告")

        search_stats[query] = len(ads)
        for ad in ads:
            ad["search_query"] = query
        all_ads.extend(ads)
        all_raw.extend(raw_responses)

        # 避免太快被封鎖
        await asyncio.sleep(5)

    # 去除重複（依 page_name + body_text 前 50 字）
    unique_ads = []
    seen = set()
    for ad in all_ads:
        key = f"{ad.get('page_name', '')}|{ad.get('body_text', '')[:50]}"
        if key not in seen:
            seen.add(key)
            unique_ads.append(ad)

    print(f"\n{'=' * 60}")
    print(f"總計收集 {len(all_ads)} 則廣告，去重後 {len(unique_ads)} 則")
    print(f"各關鍵字統計:")
    for q, count in search_stats.items():
        print(f"  {q}: {count} 則")

    # 儲存結果
    output_dir = os.path.join(os.path.dirname(__file__), "output")
    os.makedirs(output_dir, exist_ok=True)

    now_str = datetime.now(timezone(timedelta(hours=8))).strftime("%Y%m%d_%H%M%S")

    # 儲存處理後的廣告資料
    ads_file = os.path.join(output_dir, f"ads_{now_str}.json")
    with open(ads_file, "w", encoding="utf-8") as f:
        json.dump(
            {
                "scan_time": now_str,
                "total_ads": len(unique_ads),
                "search_stats": search_stats,
                "ads": unique_ads,
            },
            f,
            ensure_ascii=False,
            indent=2,
        )
    print(f"\n結果已儲存: {ads_file}")

    # 也儲存原始 GraphQL 回應（用於除錯）
    raw_file = os.path.join(output_dir, f"raw_{now_str}.json")
    with open(raw_file, "w", encoding="utf-8") as f:
        json.dump(all_raw, f, ensure_ascii=False, indent=2)
    print(f"原始資料已儲存: {raw_file}")

    return ads_file


if __name__ == "__main__":
    asyncio.run(main())
