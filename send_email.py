"""
Email 發送器
將 HTML 報告透過 Gmail SMTP 寄送
"""

import os
import sys
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from datetime import datetime, timezone, timedelta

MYT = timezone(timedelta(hours=8))


def send_report(html_file: str, summary: dict = None):
    """
    透過 Gmail SMTP 寄送 HTML 報告

    需要的環境變數：
    - GMAIL_USER: 寄件者 Gmail 地址
    - GMAIL_APP_PASSWORD: Gmail 應用程式密碼（不是一般密碼）
    - REPORT_RECIPIENT: 收件者 Email（預設同寄件者）
    """

    gmail_user = os.environ.get("GMAIL_USER", "")
    gmail_password = os.environ.get("GMAIL_APP_PASSWORD", "")
    recipient = os.environ.get("REPORT_RECIPIENT", gmail_user)

    if not gmail_user or not gmail_password:
        print("⚠ 未設定 GMAIL_USER 或 GMAIL_APP_PASSWORD，跳過 Email 發送")
        print("  請在 GitHub Secrets 中設定這兩個環境變數")
        return False

    # 讀取 HTML 報告
    with open(html_file, "r", encoding="utf-8") as f:
        html_content = f.read()

    # 組裝郵件
    now = datetime.now(MYT)
    date_str = now.strftime("%Y/%m/%d")
    subject = f"📊 CCPS 廣告監控週報 — {date_str}"

    msg = MIMEMultipart("mixed")
    msg["From"] = gmail_user
    msg["To"] = recipient
    msg["Subject"] = subject

    # 信件正文（簡短摘要）
    total_ads = summary.get("total_ads", 0) if summary else 0
    total_pages = summary.get("total_pages", 0) if summary else 0

    body_text = f"""
CCPS 廣告監控週報 — {date_str}

本週掃描結果：
- 偵測到 {total_ads} 則廣告
- 來自 {total_pages} 個粉專

完整報告請查看附件的 HTML 檔案。
（用瀏覽器開啟附件即可檢視精美報告）

---
此郵件由 CCPS 廣告監控系統自動發送
"""

    msg.attach(MIMEText(body_text, "plain", "utf-8"))

    # 附加 HTML 報告
    with open(html_file, "rb") as f:
        attachment = MIMEBase("text", "html")
        attachment.set_payload(f.read())
        encoders.encode_base64(attachment)
        filename = os.path.basename(html_file)
        attachment.add_header(
            "Content-Disposition",
            f"attachment; filename={filename}",
        )
        msg.attach(attachment)

    # 發送
    try:
        print(f"正在寄送報告到 {recipient}...")
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(gmail_user, gmail_password)
            server.sendmail(gmail_user, recipient, msg.as_string())
        print(f"✅ Email 已成功寄出！")
        return True
    except smtplib.SMTPAuthenticationError:
        print("❌ Gmail 認證失敗！請確認：")
        print("  1. GMAIL_USER 是完整的 Gmail 地址")
        print("  2. GMAIL_APP_PASSWORD 是「應用程式密碼」，不是一般密碼")
        print("  3. 產生方式：Google 帳戶 → 安全性 → 兩步驟驗證 → 應用程式密碼")
        return False
    except Exception as e:
        print(f"❌ Email 發送失敗: {e}")
        return False


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("使用方式: python send_email.py <html_report_path>")
        sys.exit(1)
    send_report(sys.argv[1])
