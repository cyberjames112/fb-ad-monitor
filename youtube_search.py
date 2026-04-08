"""
YouTube 新影片搜尋器
- 使用 YouTube Data API v3
- 搜尋過去一週內上傳的吉隆坡房產相關中文影片
- 輸出 JSON 供報告生成器使用
"""

import json
import os
import sys
from datetime import datetime, timezone, timedelta
from urllib.request import urlopen, Request
from urllib.parse import urlencode, quote

MYT = timezone(timedelta(hours=8))

# ===== 搜尋設定 =====
SEARCH_QUERIES = [
    "吉隆坡房產",
    "馬來西亞第二家園",
    "新山建案",
    "KLCC建案",
    "KL新建案",
]

MAX_RESULTS_PER_QUERY = 15  # 每個關鍵字最多取幾筆
RELEVANCE_LANGUAGE = "zh-Hant"  # 偏好繁體中文


def search_youtube(api_key: str, query: str, published_after: str, max_results: int = 15) -> list:
    """
    呼叫 YouTube Data API v3 搜尋影片

    Args:
        api_key: YouTube API Key
        query: 搜尋關鍵字
        published_after: RFC 3339 格式的時間（只搜這之後上傳的影片）
        max_results: 最大結果數

    Returns:
        影片列表
    """
    # Step 1: 搜尋影片 ID
    search_params = urlencode({
        "part": "snippet",
        "q": query,
        "type": "video",
        "order": "date",
        "publishedAfter": published_after,
        "maxResults": max_results,
        "relevanceLanguage": "zh-Hant",
        "key": api_key,
    })

    search_url = f"https://www.googleapis.com/youtube/v3/search?{search_params}"

    try:
        req = Request(search_url, headers={"Accept": "application/json"})
        with urlopen(req, timeout=15) as resp:
            search_data = json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        print(f"  ⚠ YouTube API 搜尋失敗: {e}")
        return []

    items = search_data.get("items", [])
    if not items:
        return []

    # 取得影片 ID 列表
    video_ids = [item["id"]["videoId"] for item in items if item.get("id", {}).get("videoId")]

    if not video_ids:
        return []

    # Step 2: 取得影片詳細資訊（觀看數、時長等）
    videos_params = urlencode({
        "part": "snippet,statistics,contentDetails",
        "id": ",".join(video_ids),
        "key": api_key,
    })

    videos_url = f"https://www.googleapis.com/youtube/v3/videos?{videos_params}"

    try:
        req = Request(videos_url, headers={"Accept": "application/json"})
        with urlopen(req, timeout=15) as resp:
            videos_data = json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        print(f"  ⚠ YouTube API 影片詳情取得失敗: {e}")
        # 退回只用 search 結果
        videos_data = {"items": []}

    # 建立影片詳情的 lookup
    video_details = {}
    for v in videos_data.get("items", []):
        video_details[v["id"]] = v

    # Step 3: 組合結果
    results = []
    for item in items:
        video_id = item.get("id", {}).get("videoId", "")
        if not video_id:
            continue

        snippet = item.get("snippet", {})
        detail = video_details.get(video_id, {})
        detail_snippet = detail.get("snippet", snippet)
        stats = detail.get("statistics", {})
        content = detail.get("contentDetails", {})

        # 解析時長 (ISO 8601: PT1H2M3S)
        duration_raw = content.get("duration", "")
        duration = _parse_duration(duration_raw)

        video = {
            "video_id": video_id,
            "title": detail_snippet.get("title", ""),
            "description": detail_snippet.get("description", "")[:500],
            "channel_name": detail_snippet.get("channelTitle", ""),
            "channel_id": detail_snippet.get("channelId", ""),
            "channel_url": f"https://www.youtube.com/channel/{detail_snippet.get('channelId', '')}",
            "video_url": f"https://www.youtube.com/watch?v={video_id}",
            "thumbnail": detail_snippet.get("thumbnails", {}).get("high", {}).get("url", "")
                         or detail_snippet.get("thumbnails", {}).get("medium", {}).get("url", "")
                         or detail_snippet.get("thumbnails", {}).get("default", {}).get("url", ""),
            "published_at": detail_snippet.get("publishedAt", ""),
            "view_count": int(stats.get("viewCount", 0)),
            "like_count": int(stats.get("likeCount", 0)),
            "comment_count": int(stats.get("commentCount", 0)),
            "duration": duration,
            "duration_raw": duration_raw,
        }

        results.append(video)

    return results


def _parse_duration(iso_duration: str) -> str:
    """將 ISO 8601 時長轉為可讀格式 (例: PT1H2M3S → 1:02:03)"""
    if not iso_duration:
        return ""
    import re
    m = re.match(r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?', iso_duration)
    if not m:
        return iso_duration
    h, mi, s = m.groups()
    h = int(h) if h else 0
    mi = int(mi) if mi else 0
    s = int(s) if s else 0
    if h > 0:
        return f"{h}:{mi:02d}:{s:02d}"
    else:
        return f"{mi}:{s:02d}"


def main(api_key: str = None) -> str:
    """主流程：搜尋所有關鍵字，合併結果"""
    if not api_key:
        api_key = os.environ.get("YOUTUBE_API_KEY", "")

    if not api_key:
        print("⚠ 未設定 YOUTUBE_API_KEY，跳過 YouTube 搜尋")
        return ""

    print("=" * 60)
    print("YouTube 新影片搜尋")
    print(f"執行時間: {datetime.now(MYT).strftime('%Y-%m-%d %H:%M:%S')} (MYT)")
    print("=" * 60)

    # 過去 7 天
    one_week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    published_after = one_week_ago.strftime("%Y-%m-%dT%H:%M:%SZ")
    print(f"搜尋範圍: {published_after} 之後上傳的影片\n")

    all_videos = []
    search_stats = {}

    for query in SEARCH_QUERIES:
        print(f"關鍵字: {query}")
        videos = search_youtube(api_key, query, published_after, MAX_RESULTS_PER_QUERY)
        print(f"  找到 {len(videos)} 部影片")

        search_stats[query] = len(videos)
        for v in videos:
            v["search_query"] = query
        all_videos.extend(videos)

    # 去重（同一部影片可能出現在多個關鍵字結果中）
    unique_videos = []
    seen_ids = set()
    for v in all_videos:
        if v["video_id"] not in seen_ids:
            seen_ids.add(v["video_id"])
            unique_videos.append(v)

    # 按發佈時間排序（最新的在前）
    unique_videos.sort(key=lambda x: x.get("published_at", ""), reverse=True)

    print(f"\n總計 {len(all_videos)} 筆結果，去重後 {len(unique_videos)} 部影片")

    # 儲存
    output_dir = os.path.join(os.path.dirname(__file__), "output")
    os.makedirs(output_dir, exist_ok=True)
    now_str = datetime.now(MYT).strftime("%Y%m%d_%H%M%S")

    yt_file = os.path.join(output_dir, f"youtube_{now_str}.json")
    with open(yt_file, "w", encoding="utf-8") as f:
        json.dump({
            "scan_time": now_str,
            "total_videos": len(unique_videos),
            "search_stats": search_stats,
            "videos": unique_videos,
        }, f, ensure_ascii=False, indent=2)

    print(f"結果已儲存: {yt_file}")
    return yt_file


if __name__ == "__main__":
    main()
