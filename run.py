"""
主執行腳本
串連爬蟲 → 報告生成 → Email 發送的完整流程
"""

import asyncio
import json
import os
import sys
from datetime import datetime, timezone, timedelta

# 加入當前目錄到路徑
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from scraper import main as run_scraper
from report_generator import generate_report
from send_email import send_report

MYT = timezone(timedelta(hours=8))


async def run():
    """執行完整流程"""
    print("🚀 CCPS 廣告監控系統啟動")
    print(f"⏰ {datetime.now(MYT).strftime('%Y-%m-%d %H:%M:%S')} MYT")
    print()

    # Step 1: 爬取廣告資料
    print("=" * 60)
    print("📡 Step 1/3: 爬取 Facebook Ad Library")
    print("=" * 60)
    try:
        ads_json_path = await run_scraper()
    except Exception as e:
        print(f"❌ 爬蟲執行失敗: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

    if not ads_json_path or not os.path.exists(ads_json_path):
        print("❌ 未產生廣告資料檔，流程中止")
        sys.exit(1)

    # Step 2: 生成 HTML 報告
    print()
    print("=" * 60)
    print("📄 Step 2/3: 生成 HTML 報告")
    print("=" * 60)
    try:
        html_path = generate_report(ads_json_path)
    except Exception as e:
        print(f"❌ 報告生成失敗: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

    # 讀取摘要資訊給 Email 用
    with open(ads_json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    summary = {
        "total_ads": data.get("total_ads", 0),
        "total_pages": len(set(
            ad.get("page_name", "") for ad in data.get("ads", [])
        )),
    }

    # Step 3: 寄送 Email
    print()
    print("=" * 60)
    print("📧 Step 3/3: 寄送 Email 報告")
    print("=" * 60)
    email_sent = send_report(html_path, summary)

    # 完成
    print()
    print("=" * 60)
    print("✅ 流程完成！")
    print(f"  📊 廣告數: {summary['total_ads']}")
    print(f"  👥 粉專數: {summary['total_pages']}")
    print(f"  📄 報告: {html_path}")
    print(f"  📧 Email: {'已寄出' if email_sent else '未寄出（缺少設定）'}")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(run())
