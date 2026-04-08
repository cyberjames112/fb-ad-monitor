"""
主執行腳本 v4
FB Ad Library 爬蟲 + YouTube 新影片搜尋 → HTML 報告 → Email
"""

import asyncio
import json
import os
import sys
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from scraper import main as run_scraper
from youtube_search import main as run_youtube
from report_generator import generate_report
from send_email import send_report

MYT = timezone(timedelta(hours=8))


async def run():
    print("🚀 CCPS 廣告監控系統 v4 啟動")
    print(f"⏰ {datetime.now(MYT).strftime('%Y-%m-%d %H:%M:%S')} MYT")
    print()

    # Step 1: FB Ad Library
    print("=" * 60)
    print("📡 Step 1/4: 爬取 Facebook Ad Library")
    print("=" * 60)
    try:
        ads_json_path = await run_scraper()
    except Exception as e:
        print(f"❌ FB 爬蟲失敗: {e}")
        import traceback
        traceback.print_exc()
        ads_json_path = None

    # Step 2: YouTube 搜尋
    print()
    print("=" * 60)
    print("🎬 Step 2/4: 搜尋 YouTube 新影片")
    print("=" * 60)
    try:
        yt_json_path = run_youtube()
    except Exception as e:
        print(f"❌ YouTube 搜尋失敗: {e}")
        import traceback
        traceback.print_exc()
        yt_json_path = None

    # Step 3: 生成 HTML 報告（合併兩個資料來源）
    print()
    print("=" * 60)
    print("📄 Step 3/4: 生成 HTML 報告")
    print("=" * 60)
    try:
        html_path = generate_report(ads_json_path, yt_json_path)
    except Exception as e:
        print(f"❌ 報告生成失敗: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

    # 讀取摘要
    summary = {"total_ads": 0, "total_pages": 0, "total_videos": 0}
    if ads_json_path and os.path.exists(ads_json_path):
        with open(ads_json_path, "r", encoding="utf-8") as f:
            ad_data = json.load(f)
        summary["total_ads"] = ad_data.get("total_ads", 0)
        summary["total_pages"] = len(set(
            ad.get("page_name", "") for ad in ad_data.get("ads", [])
        ))
    if yt_json_path and os.path.exists(yt_json_path):
        with open(yt_json_path, "r", encoding="utf-8") as f:
            yt_data = json.load(f)
        summary["total_videos"] = yt_data.get("total_videos", 0)

    # Step 4: Email
    print()
    print("=" * 60)
    print("📧 Step 4/4: 寄送 Email 報告")
    print("=" * 60)
    email_sent = send_report(html_path, summary)

    print()
    print("=" * 60)
    print("✅ 流程完成！")
    print(f"  📊 FB 廣告數: {summary['total_ads']}")
    print(f"  👥 粉專數: {summary['total_pages']}")
    print(f"  🎬 YouTube 影片: {summary['total_videos']}")
    print(f"  📄 報告: {html_path}")
    print(f"  📧 Email: {'已寄出' if email_sent else '未寄出'}")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(run())
