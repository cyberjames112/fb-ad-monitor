import { useState, useCallback, useEffect, useRef } from "react";

// ═══════════════════════════════════════════════
// CCPS 廣告監控儀表板
// ═══════════════════════════════════════════════

const LOGO_URL = "https://i.imgur.com/placeholder.png"; // fallback

const THEMES = {
  clean: {
    name: "清爽明亮",
    bg: "#f5f6fa", card: "#ffffff", accent: "#2563eb", accentLight: "#dbeafe",
    text: "#1e293b", text2: "#64748b", text3: "#94a3b8", border: "#e2e8f0",
    green: "#059669", greenL: "#d1fae5", red: "#dc2626", redL: "#fee2e2",
    orange: "#d97706", orangeL: "#fef3c7", headerBg: "#ffffff",
  },
  dark: {
    name: "暗黑專業",
    bg: "#0f1117", card: "#1a1d2e", accent: "#6366f1", accentLight: "#312e81",
    text: "#e2e8f0", text2: "#94a3b8", text3: "#4b5563", border: "#2d3148",
    green: "#34d399", greenL: "#064e3b", red: "#f87171", redL: "#7f1d1d",
    orange: "#fbbf24", orangeL: "#78350f", headerBg: "#141625",
  },
  warm: {
    name: "暖色質感",
    bg: "#faf7f2", card: "#ffffff", accent: "#b45309", accentLight: "#fef3c7",
    text: "#292524", text2: "#78716c", text3: "#a8a29e", border: "#e7e5e4",
    green: "#059669", greenL: "#d1fae5", red: "#dc2626", redL: "#fee2e2",
    orange: "#b45309", orangeL: "#fef3c7", headerBg: "#faf7f2",
  },
  ocean: {
    name: "海洋清新",
    bg: "#f0fdfa", card: "#ffffff", accent: "#0891b2", accentLight: "#cffafe",
    text: "#134e4a", text2: "#5eead4", text3: "#99f6e4", border: "#ccfbf1",
    green: "#059669", greenL: "#d1fae5", red: "#e11d48", redL: "#ffe4e6",
    orange: "#d97706", orangeL: "#fef3c7", headerBg: "#f0fdfa",
  },
};

const DEFAULT_FB_KEYWORDS = [
  "吉隆坡 說明會", "吉隆坡 置產", "吉隆坡 建案", "馬來西亞 說明會",
  "馬來西亞 置產", "大馬 說明會", "大馬 建案", "第二家園", "MM2H",
];

const DEFAULT_YT_KEYWORDS = [
  "吉隆坡房產", "馬來西亞第二家園", "新山建案", "KLCC建案", "KL新建案",
];

const SCHEDULE_OPTIONS = [
  { value: "weekly_mon", label: "每週一" },
  { value: "weekly_fri", label: "每週五" },
  { value: "biweekly", label: "每兩週" },
  { value: "daily", label: "每天" },
  { value: "manual", label: "手動執行" },
];

const AVAILABLE_REGIONS = [
  { code: "TW", name: "台灣", flag: "🇹🇼" },
  { code: "MY", name: "馬來西亞", flag: "🇲🇾" },
  { code: "SG", name: "新加坡", flag: "🇸🇬" },
  { code: "HK", name: "香港", flag: "🇭🇰" },
  { code: "JP", name: "日本", flag: "🇯🇵" },
  { code: "US", name: "美國", flag: "🇺🇸" },
  { code: "AU", name: "澳洲", flag: "🇦🇺" },
  { code: "GB", name: "英國", flag: "🇬🇧" },
  { code: "CA", name: "加拿大", flag: "🇨🇦" },
  { code: "TH", name: "泰國", flag: "🇹🇭" },
  { code: "VN", name: "越南", flag: "🇻🇳" },
  { code: "PH", name: "菲律賓", flag: "🇵🇭" },
  { code: "ID", name: "印尼", flag: "🇮🇩" },
  { code: "KR", name: "韓國", flag: "🇰🇷" },
];

const YT_DATE_RANGE_OPTIONS = [
  { value: 7, label: "過去 7 天" },
  { value: 14, label: "過去 14 天" },
  { value: 30, label: "過去 30 天" },
];

const YT_ORDER_OPTIONS = [
  { value: "date", label: "最新上傳" },
  { value: "viewCount", label: "觀看數最多" },
  { value: "relevance", label: "相關性最高" },
  { value: "rating", label: "評分最高" },
];

const YT_DURATION_OPTIONS = [
  { value: "any", label: "不限" },
  { value: "short", label: "短片（< 4 分鐘）" },
  { value: "medium", label: "中等（4-20 分鐘）" },
  { value: "long", label: "長片（> 20 分鐘）" },
];

// ── Mock data generators ──
function generateMockAds(keywords, excludes) {
  const pages = [
    "東南亞置產王", "大馬房產投資顧問", "亞太國際地產", "海外置產小幫手",
    "馬來西亞MM2H簽證中心", "吉隆坡VIP房產", "全球置產網", "台灣海外投資協會",
  ];
  const texts = [
    "🏠 台北說明會｜吉隆坡全新建案首度公開！投報率6.2%，現場享早鳥優惠。",
    "📢 台中場｜馬來西亞房產投資趨勢分析會。了解法規、稅務與最新建案。",
    "Mont Kiara 高端公寓 1200sqft 起，含傢俱交屋。台灣買家專屬優惠。",
    "📍高雄場 漢來飯店｜2026吉隆坡最值得投資三大區域深度分析。",
    "🔥 KLCC全新建案，總價台幣380萬起。永久地契、包租三年。",
    "MM2H第二家園2026最新政策！門檻調整、申請流程、所需文件。",
    "想在吉隆坡買房？十年經驗一站式服務：選房、貸款、律師全程協助。",
    "馬來西亞置產避險首選！穩定租金回報，永久產權，外國人可100%持有。",
  ];
  const ads = [];
  const stats = {};
  keywords.forEach(kw => { stats[kw] = 0; });

  for (let i = 0; i < 24; i++) {
    const kw = keywords[i % keywords.length];
    const page = pages[i % pages.length];
    const text = texts[i % texts.length];
    const skip = excludes.some(ex => text.includes(ex) || page.includes(ex));
    if (skip) continue;
    stats[kw] = (stats[kw] || 0) + 1;
    ads.push({
      page_name: page, ad_text: text,
      start_date: `Apr ${(i % 7) + 1}, 2026`,
      platforms: i % 3 === 0 ? "Facebook, Instagram" : "Facebook",
      library_id: `${1000000000 + i}`,
      ad_library_url: `https://www.facebook.com/ads/library/?id=${1000000000 + i}`,
      search_query: kw,
    });
  }
  return { ads, stats, total: ads.length };
}

function generateMockVideos(keywords, excludes) {
  const titles = [
    "2026吉隆坡房產投資全攻略｜五大熱門區域分析",
    "MM2H 第二家園 2026最新政策｜申請門檻大調整！",
    "實地走訪｜KLCC旁新建案 一房一廳只要台幣350萬？",
    "新山房產值得投資嗎？跟吉隆坡比差在哪？",
    "在吉隆坡買房的五個大坑｜台灣人真實經驗",
    "KL全新建案開箱！月租金收入實算給你看",
    "馬來西亞置產必看！外國人買房流程完整教學",
    "第二家園計劃深度解析｜移居大馬你需要知道的事",
  ];
  const channels = ["海外房產頻道", "移民生活日記", "台灣人在大馬", "KL生活觀察"];
  const videos = [];
  const stats = {};
  keywords.forEach(kw => { stats[kw] = 0; });

  for (let i = 0; i < 12; i++) {
    const kw = keywords[i % keywords.length];
    const title = titles[i % titles.length];
    const skip = excludes.some(ex => title.includes(ex));
    if (skip) continue;
    stats[kw] = (stats[kw] || 0) + 1;
    videos.push({
      video_id: `vid_${i}`, title,
      description: `這支影片深入分析${kw}相關主題，提供最新的市場資訊和投資建議。`,
      channel_name: channels[i % channels.length],
      channel_url: `https://www.youtube.com/channel/UC${i}`,
      video_url: `https://www.youtube.com/watch?v=demo${i}`,
      thumbnail: `https://picsum.photos/seed/${i + 10}/320/180`,
      published_at: `2026-04-0${(i % 7) + 1}T10:00:00Z`,
      view_count: Math.floor(Math.random() * 15000) + 500,
      like_count: Math.floor(Math.random() * 400) + 20,
      duration: `${Math.floor(Math.random() * 20) + 8}:${String(Math.floor(Math.random() * 59)).padStart(2, "0")}`,
      search_query: kw,
    });
  }
  return { videos, stats, total: videos.length };
}

// ── Components ──

function KeywordManager({ keywords, setKeywords, label }) {
  const [input, setInput] = useState("");
  const add = () => {
    const kw = input.trim();
    if (kw && !keywords.includes(kw)) {
      setKeywords([...keywords, kw]);
      setInput("");
    }
  };
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{label}</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && add()}
          placeholder="輸入關鍵字後按 Enter"
          style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 14, outline: "none" }}
        />
        <button onClick={add} style={{ padding: "8px 16px", borderRadius: 8, background: "var(--accent)", color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>新增</button>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {keywords.map((kw, i) => (
          <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 16, background: "var(--accentLight)", color: "var(--accent)", fontSize: 13, fontWeight: 500 }}>
            {kw}
            <span onClick={() => setKeywords(keywords.filter((_, j) => j !== i))} style={{ cursor: "pointer", opacity: 0.6, fontSize: 16, lineHeight: 1 }}>×</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function StatsBar({ stats, barColor }) {
  const max = Math.max(...Object.values(stats), 1);
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", background: "var(--card)", borderRadius: 10, overflow: "hidden", border: "1px solid var(--border)" }}>
      <tbody>
        {Object.entries(stats).map(([k, v], i) => (
          <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
            <td style={{ padding: "10px 16px", fontSize: 13, width: "40%", color: "var(--text)" }}>{k}</td>
            <td style={{ padding: "10px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ height: 7, borderRadius: 4, background: barColor || "var(--accent)", width: `${Math.max((v / max) * 100, 3)}%`, transition: "width 0.5s" }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{v}</span>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AdCard({ ad }) {
  return (
    <div style={{ padding: "14px 0", borderBottom: "1px solid var(--border)" }}>
      <div style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.7, marginBottom: 8 }}>{ad.ad_text}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        {ad.start_date && <span style={{ fontSize: 12, color: "var(--text3)" }}>📅 {ad.start_date}</span>}
        {ad.platforms && <span style={{ fontSize: 12, color: "var(--text3)" }}>📱 {ad.platforms}</span>}
        {ad.ad_library_url && (
          <a href={ad.ad_library_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", textDecoration: "none", padding: "2px 10px", borderRadius: 5, background: "var(--accentLight)" }}>🔗 查看廣告</a>
        )}
      </div>
    </div>
  );
}

function VideoCard({ video }) {
  return (
    <div style={{ display: "flex", gap: 14, padding: "14px 0", borderBottom: "1px solid var(--border)" }}>
      <a href={video.video_url} target="_blank" rel="noreferrer" style={{ flexShrink: 0, width: 180, height: 101, borderRadius: 8, overflow: "hidden", position: "relative", display: "block" }}>
        <img src={video.thumbnail} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        {video.duration && <span style={{ position: "absolute", bottom: 4, right: 4, background: "rgba(0,0,0,.8)", color: "#fff", fontSize: 11, fontWeight: 600, padding: "2px 6px", borderRadius: 4 }}>{video.duration}</span>}
      </a>
      <div style={{ flex: 1, minWidth: 0 }}>
        <a href={video.video_url} target="_blank" rel="noreferrer" style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", textDecoration: "none", display: "block", marginBottom: 4, lineHeight: 1.4 }}>{video.title}</a>
        <a href={video.channel_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "var(--red)", textDecoration: "none" }}>{video.channel_name}</a>
        <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 4, lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{video.description}</div>
        <div style={{ display: "flex", gap: 12, marginTop: 6, fontSize: 12, color: "var(--text3)" }}>
          <span>📅 {video.published_at?.slice(0, 10)}</span>
          <span>👁 {video.view_count?.toLocaleString()}</span>
          <span>👍 {video.like_count?.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

// ── Report Preview ──
function ReportPreview({ fbData, ytData, activeReportTab, setActiveReportTab, theme }) {
  if (!fbData && !ytData) return null;

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: "flex", gap: 0, borderBottom: "2px solid var(--border)", marginBottom: 20 }}>
        {fbData && (
          <div onClick={() => setActiveReportTab("fb")}
            style={{ padding: "10px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer", borderBottom: activeReportTab === "fb" ? "2px solid var(--accent)" : "2px solid transparent", marginBottom: -2, color: activeReportTab === "fb" ? "var(--accent)" : "var(--text3)", transition: "all .15s" }}>
            📢 FB 廣告 ({fbData.total})
          </div>
        )}
        {ytData && (
          <div onClick={() => setActiveReportTab("yt")}
            style={{ padding: "10px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer", borderBottom: activeReportTab === "yt" ? "var(--red) 2px solid" : "2px solid transparent", marginBottom: -2, color: activeReportTab === "yt" ? "var(--red)" : "var(--text3)", transition: "all .15s" }}>
            🎬 YouTube ({ytData.total})
          </div>
        )}
      </div>

      {activeReportTab === "fb" && fbData && (
        <div>
          <StatsBar stats={fbData.stats} />
          <div style={{ marginTop: 16 }}>
            {Object.entries(
              fbData.ads.reduce((acc, ad) => {
                const p = ad.page_name;
                if (!acc[p]) acc[p] = [];
                acc[p].push(ad);
                return acc;
              }, {})
            ).sort((a, b) => b[1].length - a[1].length).map(([page, pageAds], i) => (
              <div key={i} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, marginBottom: 12, overflow: "hidden" }}>
                <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>{page}</div>
                    <span style={{ fontSize: 12, background: "var(--accentLight)", color: "var(--accent)", padding: "2px 10px", borderRadius: 12, fontWeight: 600 }}>{pageAds.length} 則廣告</span>
                  </div>
                </div>
                <div style={{ padding: "0 20px" }}>
                  {pageAds.slice(0, 5).map((ad, j) => <AdCard key={j} ad={ad} />)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeReportTab === "yt" && ytData && (
        <div>
          <StatsBar stats={ytData.stats} barColor="var(--red)" />
          <div style={{ marginTop: 16, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: "4px 20px" }}>
            {ytData.videos.map((v, i) => <VideoCard key={i} video={v} />)}
          </div>
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════
export default function App() {
  const [theme, setTheme] = useState("clean");
  const [activeTab, setActiveTab] = useState("settings");
  const [schedule, setSchedule] = useState("weekly_mon");

  // Keywords
  const [fbKeywords, setFbKeywords] = useState(DEFAULT_FB_KEYWORDS);
  const [ytKeywords, setYtKeywords] = useState(DEFAULT_YT_KEYWORDS);
  const [fbExcludes, setFbExcludes] = useState([]);
  const [ytExcludes, setYtExcludes] = useState([]);

  // FB Regions
  const [fbRegions, setFbRegions] = useState(["TW"]);
  const [showRegionPicker, setShowRegionPicker] = useState(false);

  // YT Advanced Filters
  const [ytDateRange, setYtDateRange] = useState(7);
  const [ytOrder, setYtOrder] = useState("date");
  const [ytDuration, setYtDuration] = useState("any");
  const [ytMinViews, setYtMinViews] = useState(0);
  const [ytShowAdvanced, setYtShowAdvanced] = useState(false);

  // Execution
  const [runFb, setRunFb] = useState(true);
  const [runYt, setRunYt] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("");

  // Results
  const [fbData, setFbData] = useState(null);
  const [ytData, setYtData] = useState(null);
  const [activeReportTab, setActiveReportTab] = useState("fb");
  const [exportTheme, setExportTheme] = useState("clean");

  const t = THEMES[theme];

  const cssVars = {
    "--bg": t.bg, "--card": t.card, "--accent": t.accent, "--accentLight": t.accentLight,
    "--text": t.text, "--text2": t.text2, "--text3": t.text3, "--border": t.border,
    "--green": t.green, "--greenL": t.greenL, "--red": t.red, "--redL": t.redL,
    "--orange": t.orange, "--orangeL": t.orangeL,
  };

  const runScan = useCallback(async () => {
    setIsRunning(true);
    setProgress(0);
    setFbData(null);
    setYtData(null);
    setActiveTab("report");

    const steps = [];
    if (runFb) steps.push({ label: "搜尋 Facebook 廣告檔案庫...", pct: 50, run: () => generateMockAds(fbKeywords, fbExcludes) });
    if (runYt) steps.push({ label: "搜尋 YouTube 新影片...", pct: 50, run: () => generateMockVideos(ytKeywords, ytExcludes) });

    let pct = 0;
    for (let i = 0; i < steps.length; i++) {
      setProgressText(steps[i].label);
      await new Promise(r => setTimeout(r, 800));
      pct += steps[i].pct / 2;
      setProgress(pct);
      await new Promise(r => setTimeout(r, 600));
      const result = steps[i].run();
      pct += steps[i].pct / 2;
      setProgress(pct);

      if (i === 0 && runFb) { setFbData(result); setActiveReportTab("fb"); }
      else if (runFb && runYt && i === 1) setYtData(result);
      else if (!runFb && runYt && i === 0) { setYtData(result); setActiveReportTab("yt"); }
    }

    setProgress(100);
    setProgressText("報告生成完成 ✅");
    await new Promise(r => setTimeout(r, 500));
    setIsRunning(false);
  }, [runFb, runYt, fbKeywords, ytKeywords, fbExcludes, ytExcludes]);

  const handleExport = (format) => {
    alert(`即將以 ${format.toUpperCase()} 格式下載報告（${THEMES[exportTheme].name}風格）\n\n實際部署後此功能會產生真實檔案。`);
  };

  return (
    <div style={{ ...cssVars, background: "var(--bg)", color: "var(--text)", minHeight: "100vh", fontFamily: "'Noto Sans TC', -apple-system, sans-serif", transition: "background .3s, color .3s" }}>

      {/* ── Header ── */}
      <header style={{ background: "var(--card)", borderBottom: "1px solid var(--border)", padding: "20px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB3aWR0aD0iMTAyNCIgem9vbUFuZFBhbj0ibWFnbmlmeSIgdmlld0JveD0iMCAwIDc2OCA1NzYiIGhlaWdodD0iNzY4IiBwcmVzZXJ2ZUFzcGVjdFJhdGlvPSJ4TWlkWU1pZCBtZWV0IiB2ZXJzaW9uPSIxLjAiPjxkZWZzPjxjbGlwUGF0aCBpZD0iNzljZjFmZDFjNiI+PHBhdGggZD0iTSAwIDU5LjI3NzM0NCBMIDc2OCA1OS4yNzczNDQgTCA3NjggNTE2Ljc3NzM0NCBMIDAgNTE2Ljc3NzM0NCBaIE0gMCA1OS4yNzczNDQgIiBjbGlwLXJ1bGU9Im5vbnplcm8iLz48L2NsaXBQYXRoPjwvZGVmcz48ZyBjbGlwLXBhdGg9InVybCgjNzljZjFmZDFjNikiPjxnIHRyYW5zZm9ybT0ibWF0cml4KDIuMDk4MzYsIDAsIDAsIDIuMDk4NjI0LCAwLjAwMDAwMDAwMDAwMDIxMzE2MywgNTkuMjc4Njk4KSI+PGltYWdlIHg9IjAiIHk9IjAiIHdpZHRoPSIzNjYiIHhsaW5rOmhyZWY9ImRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBVzRBQUFEYUNBSUFBQUFKN0Q4UEFBQUFCbUpMUjBRQS93RC9BUCtndmFlVEFBQWdBRWxFUVZSNG5PMmRkM3dUNVIvSDd5NnpTZE8wNmFaN2J3b1VLQzB0RzJUSUZsa2lvaUtpNGg3SUR4SEhUeFQzK0NFdUVGSDJSdmFHbGxVS1pSWG8zbnRrNzl6OS9xaUdOSjNKUFpkTDJ1Zjk0by9rY3MvM3ZrZmJUNTU3bnU5QUNZSkFJQkFJaEJ3WTNRNUFJSkNlQUpRU0NBUUNBQ2dsRUFnRUFGQktJQkFJQUtDVVFDQVFBRUFwZ1VBZ0FJQlNBb0ZBQUFDbEJBS0JBQUJLQ1FRQ0FRQ1VFZ2dFQWdBb0pSQUlCQUJRU2lBUUNBQ2dsRUFnRUFCQUtZRkFJQUNBVWdLQlFBQUFwUVFDZ1FDQVNiY0RJQ0YwY3AyaTBxQ3N4OVVOQm5XalFTZkhkWEpDcnlCd1BVTG9DTnhncVVIUDFNOVJCb2NLVjhsRDZPUjZSWlZlV1llckd3M3FCbHduTjVDODJTR2ZvQ3puTGsvNy92elo3TXBLcTF5MkhpYUdNUmtNSG9zbDRIRGN1RHhQQWQ5WDRCSWdjZ3R5RmJHWlBlRjNXS0pTRlRZMmxEWTExVWdsZFFxbFZLMlNhN1U2SE1keDNHWSsvUEw0SEJhRFlmVnd4LzR4R0pTMW1xWmNuU1JmSzc2dmt4WGhtZ2F3OWdsQ2p5TDJJaVVHVloyMk1WY3J5ZGRLN3V1a3hiaW1EcXg5Z2pDZzNUaXR1TGs1dytaUzBoRXNESXR4ZDAvMDhSbmc3ejh3SU1qWHhZVnVqeXhBckZSbUZoZGRMUys3V2xGUklCSFRYczZRWkVGRng1TVNYSy9VMUdhcjZ5NnJHNjRibE9WMHUwTXR1RjZ0cWJ1bXJydXFxYittVjViUjdZN2RvY1B4Vy9YMXQrcnJOOSsralNCSVAwL1BzZUdSRTJKaUFrVWl1bDNyRUxWZWYrckIvUU81ZDgrV2x4bHd1dlVESEE0akpZUkJvNnErcUt3NG9hbS9UT0JhdXQyaEZzS2dWZGRjVWxhY1ZOZGRKSEFOM2U0NEREbjE5VG4xOVY5ZXlrejE4NXZidi8vb2lDZ21pUms3Y0pxVnlxM1oyWC9leXFsVHFlajJCVHdPSUNWNmFiRzgrSUN5NGdpdWw5UHRDK1hvWmFYeTRnUEs4a085NFdZcEFrZVFqTXJLak1yS1lKZHp6dzBhUEMwaGtmYjFGSVZXKzhmVnl6OW5aOHQwT25vOW9RNjdsaEoxZmJZc2I2dW00VExkanRnQ2RjTU5XZDVXVGYxRnVoM3BPWlJJWlN0T25mb3RLK3ZWdFBUeHNYSGRXUW1pZ3RONUQvNTc1bFNwcklkL045aXBsR2hxcjBudS9hYVYzS2JiRVZ1Z3JyOGh5LzFWSTc1SnR5TTlrMEtwZE5uaFE4TnUzM3B2ekxnUWQzZGJYbHF1MGZ6MzVQR2Q5KzdaOHFKMFlYZFNvcE1VaU8rczd5VXpFWjIwU0h4blBaeUoySUR6NWVWVE4yOWFucDQrZDhCQUZMWEZCS1d3b1g3Wi9uMTV6YzAydUpZOVlFZFNRdWpra25zYjVTVzdFTUxpbUFpSGc5QXBKUGYva0JkdjZ3MDNheWNvOWZwVlo4NWNLUy8vZVB4RUFaZEw2Yld1bHBhOGNHQy9XTk9MbHN6dFJVclVOVmVhYjY0MXFHdnBkc1FXYUdxdk5lV3NOYWlyNkhha04zS29vS0JveTU4L1RwL3A3K1pHMFNYT0YrYS9lT0NBeXRDN3ZpVG9ENXduREpybUcxODBYSG1qTitnSVlkQTIzL3ltL3ZLclVFZG81RjVUMCt5dGY5MnZxNkhDK09YUzRsNm9Jd2p0VXFLWGxkU2RmVjVSdG85ZU4yeURUbDVXZDI2cG9tUVgzWTVBa0ZxbGN1R083YmsxMVdETjV0ZlhMZHUvdnhmcUNFS3ZsS2lyTDlhZFg2S1Q1OVBvZzgxUTExeXRQL2VjVHZhQWJrY2cvOUNvMWp5N2UxZGhBN0JrQzZsYXRXemYzbVp0RDQrZjdBamFwRVNXdjZQaDZuSmNyNkRMQVZzaUw5emJjUFVOR0hWbWI5U3BWTS92MmRXa0FQTkx1UHJZMFFLSkJJZ3BSNFFXS1NFa2QzNlM1SDZISUxiTGVxUVJhZTV2NGp0ZklyUm5hMEhhbzFncWZmM0FQajNwQk55RGQyOGZ5TzhWOCt1T3NMMlVFTTA1MzhvS045djh1dlFndnZXOU5IOGozVjVBT2lPanN2Si9GODZUc1NCV0tkZWNQUXZJSFVmRnhsSkNpRzkrcnlqdExldU9rdHZyNU1YYjZmWUMwalUvWE12S0xyYys4WHA5NXNVZW1hRm5FVGFWRXNtOTMrVWxPMng1UlJxUlB2aExWclNGYmk4ZzNZSWdpSlhIanFyMWVpdkdWb3JGbTIvbEFIZko0YkNkbENoTERzdnlmclBaNWVoRlVYWkNldjlIdXIyQVdFQytXTHpweWhVckJtNjhla1ZqdzFwbmRvdU5wRVRUZUx2NTFscmJYSXQydE0zM3hUZlgwTzBGeEdMV1hidFNKNU5aTkVTc1V1M0t2VXVSUDQ2RkxhVEVvRzVzekhxZklLeVpQVG9jdUthNThlcktIbCtjcVVlaTBPbC91WHpKb2lHSGN1L0lyWG9zNm5sUW40TkRFRTNYUHdWZWlMUVRVQWFYSll4bUNVS1pmRDhHMXhQanVtSXNad3hqSWFqRkJiVXdCcy9DRVVUVGpiVUdOU1VSMmUyQ1lrNHMxeWlXSUpUSjc4UGdlbUZjSWNZU1lCZ1RRUzMreVdJc0FSVWVtdkg5eEVuUjNqNFdEY0VKUW9mclpXcE5nMXhlSm03T3EyL0lxcXFzQWhRTVlzYTJPN2NYcDZSNk9YZGRMcnVGL1hmQlQwbUViSGFJVU9qQzViSVpERnV1WlpKTW1LWmNTdVNGdXpUMWxpbTlOYUFvVzVUazVKM0M5UnpBRklhaWxxc0dFQlJGKzlXMUY2aS9Ec1oyNysva2xjTHg2czhTaHROMXM5YmhJM1FoWHpTRVFKRDgrcnBURC9MMjVONHBsa3FCT05hQ3ltRFlmdjNhc21FanVuTnloVmg4dlE3WWQyUzBtOXVzaElTMDBQQlFkM2ZibEVFQUM3VlNvbGRVU082dHAvUVNUT2RRNTZESnZJRFJHSWZteXNCNlpZMDRkeDJsbDJEeVEvaEJrM2tCb3hsY201YndzVGRRQkluMDlJcjA5SG91TmZWMC9vTjFseTdkQmhmL3Z1UE9uZWVIcG5lbmpjUEY0a0lnVjNUbmN0NGRQbkpLZkFMbWdBcGloRklwSVpwenZxR3V5akhiUFVrWThRVEhleUNDMk1VUFFIenpHOEtncE1nNFc5VFBKV0lCMTNzdzRzaS9iY0JoWU5qWXFKaFJFVkhiYjl6NFBPTThrTXFwMVVybHVjS0NNWkZSWFo1NXBSeEF3NE1Za1dqOWpNZjhYRjNKbTZJWENxVkVXWEdPb21Kb0xFRzBNR0VwMXpPSkN1UFdvYXJLVU5kbFVHR1pKWWgwalgyZTR6T1lDdU05QXdhR3pVdEtTZ2tPZm5YLzNydE5UZVFOSHJsL3J6dFNjcjJLYktXSUVCZVhEWS9QOGV6MjBvdzlRNVdVRUFhdEpCZjhvdzNHNEx2RVBPY2NPaDFCNmErMFlvVEE5VlRjTE1yZ3VrUXZjUTZiNFZpcklYUVI0dTYrZWQ0VEwrN2VlYW1hYk9tQWs4VkZHcDJPdzJKMWNrNlRRbEV1SjVXZnljR3diNmRNN1JrNmdsQzNHYXdvUG1CUVZZQzF5WEZOOUJxNXdUbHNwbDNwQ0lJZ3lwSkRla1VKV0p0c1lZTFhpSTJDOEZsUVI3cVBDNWU3YnVhc1JBOFBrbllVT3YzVjh0TE96eWx1YWlSNWxXZjZENGoxOFNWcHhINmc1RytTTUdpa0JYK0N0ZWtjTXRzai9Wc20zdytzV2ZJUXVFNmFEemc3a1IvOG1PZXc3MWpPQVdETjlnWUVYTzUzMDJhNGt5N2RlcVcwaTVTY0tpbXBlZ0pzQnVPcHdjbGtMTmdibEVpSm91UXcwUGE5bUZ2QzI2NTlsNkdZdlZTaU5VVlplaFJvSUFubUd2K2FXK0tyS05iWjdCclNDWDZ1cnF0SGp5WnBKS3VpaXlYVmVuSlBOMk9DZzBWOFBoa0w5Z1lGVWtMZ3NpSndPWHNvUTVUMEFUOTBDakNEWUNFSVdTSFFtKzIveWpsc0pqQ0R2WlVKTVhFakF3UEpXTGhWWDk5NWRwOU1UV3ByY3BBL0tmZnNFUEJTb3E2K0JLNHJPQ2JxdjRyblB4S1FOZkNvYTdQMGltSlExdHdTMytVRmpnRmxyWmV6TEMyZHpIQWRqaGMwZEJaK3BpSzM4Undrb3FyZVBWMkFseEo1NlVGUXBvU3hML0lDeU01VUtVVUI3bVpkb3BmeWc4YURzZ2JwMjhkdnFCK3BsYlhpeHM0V1Zra1dYblBtY01nTXQwTUFTNGxCM2FBR0ZDYlA5MzlVRURFYmlDbUt3RFhOb01Ma25md2VjWW1hRDhRVXhNaTB1RGd5dzh1YnhKMThpbUdrL25ZTVBhNHVBV0FwVVphZkJ0SnVqdWtjSnV6M0duazdsS0tzT0FjazNabkpEM2JyOXdaNU94QXowc01peUNTelZNazd5KzdoTWtodEFqUlNrNDVJSTRDbFJGVkRxa2JtUDZBTTk2U1ZHTVBlWjRDcW1uTUFyS0FNVWRJS2pHbHBDaktrYXp6NC9CaVI5WmxaZFozdTBRaTRiS3N0SXdoU0FDNXB5RTRBS1NVR2RhTzI2Ulo1TzRLdytTelhDUEoyS0FYWGlqV04xOG5iY1E1NW5PMFdTOTRPcEYzaXZMeXNIaXZ1dEZ5ck83bXQzRXRsWFlUQU9Sd2dwVVJkbTAyK0h3WEc4UkpFUFFIRUgwcFIxMTRuL3lpSHNkMkYwVStCY0FmU1BuNHVRcXZIU2p0dEh1NGpjTEhhTW9JZ1YydXFpM3JXeEFTa2xHZ2JBSHhMdTBRLzR4Q3pmUTJJbXhWR0xVSlpQU3BPeWQ1d2M3TCtkMG5UYWIvT0lEZFNSUzBJQXZubEN2VjFmR3dJMEZsSlF4WkpDd3duZjM3Z0kwQ2NvUnAxUXpaSkN3eXVEeTk0RWhCbklCM0JJbEdIVE52cEpvdXZVQ2hrazFvdTJYWC9YaWFnaWlmMkFEQXBNYWpxRGVwYWtrWUVZYlB0TXpyZURGd2pKaCtHNXh6Nk9JeU9weG9kYnYxREtLUFQzUjhNUlFmNFdGWlowZ3lDUU40NmZMano2QlVIQXBpVWFKdkpOdGJHR0h4ZTBEZ2d6bEFOK1p0Rk1TZm40QWxBbklGMGdsUmxmWGc3cDZ0Q2FnUDl5T1piMXFsVVQrL2NubDl2dThySDFBRk9TaVFGSkMxdy9jWmdUTWRZT0NCL3M3dytvMUNibEdYdTVWVExyTS9mZGVucStXVkljSkRWeG8yVXkrV1BiL2xyWjg1MTNNRzdTb043d0pHVDNkemkrZHQxakx3cEJybjFUU0ZiY1BKem1KdDFhTzdYMTFzOTFxV3JTZ1VKZmZ6NmdNanVsZWwwNzU0OE9lUDNEYnR5YmpRNWJPZ2FzSVVKbll5VWxLQXNJY2NqRVpRelZLT1RrVXJodzVqT0hLLytvSnlCZElSY295RlRQdHFMMzBWOU13eEZKMGRGLzNTZDdBSjhDM2NhRzVlZlBJR2VPaEhoNmhibTV1Ym01TVRDbUsyKzYzR0VRQW1DSUhDQ0lBaUVJQWdjSVRBTTQyQk1JWmZ0emhmMEVRcUMzTndEM2R3WTVJTDZyUU9ZbE9pVnBHcW1PWGtPZHFCeVlUcGxKWm5oSEk5QmNNSFZCbHdxS2RhUlNIWHhFWFQ5QkRvdElRR1VsTFJBRUVoZWMzTmVjN1BWRmdRc1ZwS1BiM0pnUUZwb1dJeUZMWWZJQUVaS2NLMlVaTEYxanJ2RGZFdmplaldoSTFWQmkrUFJENVF6a0U3NCsxNHVtZUVCM2FnQ0grSHBOU0lnOEd3NTJRZGVnTWgwdXJQbFpXZkx5ejdMekF3WENtZkV4VTFOU1BUdWhpeVNCTXhFQ0ZlVDNkQmlpYUtCZUdJRERHcnJINzliWUxzNXpNMDZMdVhOemNjS1NVVnRkTFAxMTlPRDdiY1pRSUZFc3ZiaXhaRy8vdlRlNFVPbEZPODZnNUVTZzVaY2h6U1V3UklFQS9IRUJoQWtieGJCbUM0aFlGeUJkTXlQbHpMMUpQWkVVQlNOOU94Vy9rNXFTR2hxbno1V1g4Z0dhQTM0MXR5NzR6WnQrUGo0OFdZbFZhMmFBTTFLdEpiMWZ6ZUQ2ZVNITWtnRkR0b1NYRXVxcUNmRHlkY2hNZ01jbXV6eXNwM2tubTZpM0Z3RjNhNDEvY2FJRWZiZjZjeUFFNy9meXBtMDhiZkR1ZUQ3SENQQXBFUkhTdW9ZOWxkSHZoTndIYW50T2dhdjUvUXJzRStrYXRXS0k0ZEpSbWtrKzFsUWV6V3hqLys4dUhoUzE3TVZkU3JWeTRjUHZYdm9vRktyQldzWjBLWVJUc290QnBkczR4SmJRdUNreWgweHVKNmdQSUcwUldjd3ZIbGdmeUhwbnVTRGd5eUxaSDE5K0VoL3gybU90ZlBldlFWYi9xeVdrTm85TUFPUWxKQkx0MmM0Vk53blFaQ3FEOHhnazBwT2gzU0NWcTkvOCtEKzAyVms5MU5ZR0pZU0hHclJFS0dUMDVyeEU1ajIvNXp6THpjYkd1WnUvYk93Z2V3ZWdoRXdVa0syTGlIVENZZ2J0Z0VscDVzWXc1RnUxb0ZvVUNpZTI3bjlVQUhabkFZRVFZWUhCbllaNnRxV2xPQ1ExMU5TeUYvZFpsVElGVS91MkFhcWJBb1lLVUZSVWdGWGpoV3ZoYUtrZ25FSVIwaDlkampPNXVmTitHTmpSaVdwMEVFamsySmlyQnU0T0dYb0xHdkgwa0t0VXJWNDk4NWFHYWx0a3hZQVNRbEdMbERWb1JLWkNMTEM1MGczYS8vY3I2MTVjZmZPWi9mdnExS0EyZVowWTdOSFIwUlpOeFpGMFkvR1R4d2ZhdG5ERWIyVXltUXY3OXZUZWYrdzdnQm9yUVFqVjlJWko3WDZZR013a2xMaVVEZHJ0eWgxdW1QM2NoZnYyRFpsOHgvSGlvRjFOVU1RNUxHNGVCNkpta1pNQnVQcnFkTW5oNGNEZElscXNtdHIxNTQrU2RJSW1NazJ4aWFWSDRuckhTa2JFbU9SV3FnbnVaZmNPekhndUZ5anFaZkx5OFhOZWZWMTF5dXJMbFZXS0VsL2tiYUZnYUh6QmlTUk5NSmlNTDZZTXMzNzlLbGZjMjRBOGNvRy9ISHIxckNRMEJFUmtWWmJBQ01sS0p2VUZnelpZRm5iUXZKbWNYTDVPejJZQ2IvK1hOcmVRenRCRUdTeThpeGlSbFIwZ0J1QUZwd01ERnMrWm15c2ovZjdwMDdKeUxVRXRSbXJUNTc0T3pESTZyYUJZQjV3TUxiMWRiMFJCREdvSGFtS0ZNWWhkYk42RmJEdHR4NkdIc2UxQmtQYmZ6YlRFUTZHTFUwWkN0RGdsUGkrZXhjc1RDUFhiOVJtVkNnVVAyVm1XajBjakpRd25henZOb0lnaUVGQnFrQ0JqV0Z3UGNqOHZ6bld6ZllxRmliMkN5VFJncXRkZ2tXaWpYUG1mZm5JZUg4UVJaS281cmViTnlyRVZ0WTNBTFNEdytDZ0xPdW5oUVoxTGFFamxkaGlTMUNNaVhHc0Q4L0Z0WTI0Rmo3ajJCMTkrUHlsYWVsVVdFWlJkR3BDM3lQUFB2Zis4SkVCOWgwUnF6VVlmcnR5MmJxeHdLb3RNWjFKbGN6VlNoeXBpai9KbTlVMUF3aWpnb0RsZ3pGakJOWXVFM1FISnhacndhQkJKeFl2V2ZmbzVISEJ3U3c2Q3AxMWgrMjVkK3VzQ2pNQmRqOHM1MkF5dzdWTnBQSTRiUXpKbTlXSTd3RnlCQUtHK2ZIeEk2Mk5KYkVJSm9NeExqcG0zV09QWDNyK2hXOG5USndiR3hjdUpMWDBCaHl0QWQ5OTg2WVZBNEZGWHJJRXBLcHZxeHV1Q3lMbmduS0dhbGdDQzlKRzI2S3B6MFljb1pscEx5SEJ3MlA1NkxFMnZxZ3JqemNwTG41U1hEeUNJQktWcXJpcHNWSXNycFhMcENxTlNxZlZFVGpSSm00VFJWRVVSVEVFWmFBb2lxSTRUc2gxbWtxSjVHWmRIZGhOb3QxM2J5OFpPaFN6TUo4SW5KU1FheGl1YmJ5TzY1V09Vc2lEN00wMjNTQjBNdGk4d2g3d2NuTDZidXAwSnhhZHFSdENKNmQrZnY3OS9QeXRHMjdBOGV6eXN0MjNidTNQZTBDbTJwT1JFcGtzcDdKOGdMOWwzNWZBSG5BNDVQNjZDRnlqcnJrQ3lobXFZUW5ERVJKRnJRbENyNnkyY25FTEFoQStpN2x1MmpRZ2dTUTB3c0N3d1VIQm4wMmVzbS9CZ242ZVlFcFluTTYzZURrUG1KU2dMQUhUT1l5TUJXWDVNVkRPVUEzRzVMR2NTVW1uc3VJb0tHY2cxdUhFWVB3NFpWby8waDMyN0lkb0w1OC81eStZRWtIcU43T0Z6TklTUzRlQVhFYm1lcENLT0ZiWForcVZOYUNjb1JxdTV3QXl3elgxV1FZNUREQ2hEUUdMOWN1TUdha2hqcFIzMXgyNFRPYm5rNmMrRWtLMmVQQ2R4Z2F4U21YUkVKQlN3dkVnMTRDQ0lCU0Zld0Q1UWpsa2J4YkJaWTV6c3owTWZ6NS84K3c1UTRKNlpyRnVCb1o5T21seWlBdXBDbHNFZ2VUV1ZGczBCT2lzeEtzL3lWb2U4dEk5dU1iNlprSzJoTzJaaUpMTGgxYVU3VGVvd1ZTZGdYU2ZGRi9mYmZNWHhQdjA1QXE3QWk1M3hjaFJKSTBVV0ZoZ0RhU1VvQ3hudGdlcG5pQ0VRUzE5OENjb2Z5Z0ZZL0k0bnNsa0xCQzRSbnAvTXloL0lGM0NSTkVYQnc3YU1HZWVEN2x2YklkZ1JFUmtvZ2Vwa3NtbFRaWjlxUU1PdWVQNWtnMDlWcFRzMXN0S1FQaENPVTdrYjdac24wNENJMTl0UVp4SXRHWDJuTmRHakdReEhLYWZMQmxRQkprYVM2b0lmcFhjc3BoWHdGTGk1RGVNYkwxQ1F0K1U4d1ZDMkNnWmxBeThQdWtrbjNFUXd0Qjg0MHVDWExGWVNPZUlPSnlWNmNOM0xWdzB3TC9uYk5aMGgwRkJwQUlwR3hXV0ZkWUJMQ1VZVzhqMUdVYlNpTFlwUjVhL0E0Zy9sSUt5bkxtK0kwZ2EwVXB1eXg1c0FlRU94QndobS8zU29NSEhuMW44VkhKeUw1bU1tQkxpN29HU3FJQXYwYWd0T2g5OHlXSis0QVJWOVdtU1JxVDMxN1BkNHpqdUNVQmNvZzduZ0ltcVNyTGhNTks4WHprZThhUzNoQ0FQQ1JZSTV2WHJON052UDZGVDc2M3Z6MlV5aFd5MldLT3hicmhLYjlsa0dieVVjTDJUbWJ4QXZaSlVMeEtDMERkbXZlYzE3Q2Ntenh1VVkxVEE4UjdBNUlmcUZVV2tyQkNHeHF6M3ZZYjl5SFNvTG9WMmlJakRHUnNXTmlrMmRraGdNR2F2cWJlMmhJbFpQeXZSVzFoeGlvSkdDaWptSERKRGZQY2JrbVp3VFVQRHBiZTgwcjdET0s1QS9LSUdWQkE2cy9uMjV5U3Q0TnFtaGt2dmVLWjl5K0M2QTNHcjk4QmpNdnQ1ZVEzeUQwd09DaHpnSDhEc2ZROHlIWUVUaEpSRU4wKzJoVnBNU1U4V1h2QkVXZDRtZzQ1c2hJaGVYbFNmK1libjBDOHdqdjFtU2ZDQ3hrc2ViTUMxalNUdDZCVWw5Wm12ZXc3OXF0ZXFDWmZKRkhTUVZzZkNNQllERTdEWUxseXV5TW5KUnlEd0ZRaUNSYUlRZDQ5UWR3OG1uSUMwUjZWWXJEVll2MzNCdHpERmtSSXB3Wmc4ZnRoczZmMzE1RTNwWkEvcUxpenpTUG5NYmlmL0tJTWpDSnNydWZjRGVWTjZlV0hkaFpjOFV0YXl5SlZXY2xBT1B2MHMzUzcwS0s2VmsxcGtjTFZ3bVlrcU9SZUVUc1BZWU1wazZoVWx0ZWVlVjlkbkE3RkdCZnpRS1JnYlRFYW1RVmxlZDM2SnV1WXFFR3VRM3N5QjNMdGtobnRiV0R1U0tpbEJXYzR1a1F0QldTTjB6UTBYWDVQbWJpQnc4SzFQeUlNeGVjS29SYUNzRVRwcHc1VTNKWGQvSVdEekxZaTFYQ3NydlZCQktsL1VUMkJaZVRjS0h6TDVJVk9ZdkdCdzluQnAvb2E2Yzg5cm0rMnhkQ012ZUNMSkdndXR3V1VGbStyT0x0RTIzUUZuRTlKYlVPcDBINXc4UWRKSWlMdGxUeFVVU2dtS3NkejZ2Z0xXcGs1NnYrNzg4MDNYMXhwVTl0VTZCOFdZYm9tdmdyV3BrK1hWWFhpaE9YdU5YbGtMMWpLa0I0TVR4SHVIRDkxcmFpSnBKOUxic280MDFDNTljN3dIOGZxTUEyMFZWNVlmcURrNXAvbm1OM3A3NmluRDhlalA5NThFMmlxdXFEaFVlMnB1Yzg1WEJuazVhT09Rbm9aYXIzLzM3NFA3OC9OSTJ1RXhtVkdlbG9WMFViS0RZNHByMzVmVkRkbms5MHJOSUhDdG9tU1hvbVFQMTNzb1AyQTgxeWNGWlZqZk1ob1V3b1FYVmZWWnVBYndqSW5BdFlyU1BZclNmVnl2Rkg3QUJLNXZxajNjTE1UZXVGRlovdkdKRXpjYkFGU3VTUEh6dHpUVmdISXB3VGl1Ym9sdk5tYTlTNDE1WEYxN1FWMTdBV1B3dWQ2cGJNK0JISSsrTEdkL0JMRSt5SThNR050RmxQaFd3OVczcURHUHErc3kxWFdaS0lQSDlVcmxlZzVrZS9abE9RZlFkYk1RTzZGS0lybGFXbkxnWHU3NWNtRHoxbUdXMTVlalhFb1FCSEhxazg0UGZreFJzb3U2UytBR2hiTHFoTExxQklJZ0tNdUY3UkxGZEE1aThud1lUaDRZeXdWbDgxQ01oVnBlMkpubEVvcWdsajBEY24xVG5FUG55SXUyV1hxdDdrTVlsS3JxazZycWt3aUNZRXdYcGpDUzFYS3pYRStNTFVEWmZPdHVsdWtTWXNXb1hzNEx1M2FvRGZRa2RodHdYS0hWbHN1a2pXb3JzMnc2QWtYUlVaWVhpTFdGbENBSTRwcndncTdwbmxaS2FxTzdteEE2cWFZeFM5T1lSZDVVbjBuSE1LYkZyVjZGY2M5cm11L3FtbStUZDZCTGNMMVUyM2hOMjNpTnZLaytFdzZoNU5ySTkwSXVWVmFDN1VGakR3ejM5L2Uxdk5HWGpTS09VWXp0bnZ3aHFEZ3VPd2ZGbUI2RFBzUTRwRnF5UXlCME1Tc3gwWXBSdGt0ZVlQQzhQWkkvSmxzcnlFRmdPSGw2Sks5QnNkNmI0UTV4VUlKZEJLTWpvNjBZYU5NOEtMWW9UcFQwQVpsbVZBNEUyeTNLZmVDSEpHdktRU0EyWnNuZ1pPdlNJMjJkVXVuVUo4MHQ4VjNiWDVjV3VMNHBidjFYOXBLYmhmUUFJdDNjcGlWWTgzU0QwUEpiemc4YUwrbzFhc0lMR09QVy83MWVNaEdET0RyTFI0eXd1bklsUFgvUHZPQUpvdjZyZXNua254ODRWalJnZFMrNVdZampNaTB5YWxpWTlVMUNhWnNhOEFMSGVDUi9ZY1ZXcXlQQzh4L3BudklWeHJRc2F4c0NzUm4rZlA3S01XUEpXS0R6S1lQalBkQXpiUjNEeVo5R0gyd0cxM09BVi9xUFRCNnBmZ0lRQ0JXd01PekxSeWU3OG5oa2pOQzhZTUVTaG5tUCtJbmptVXF2RzdhQjZSTGlOZnducmxjYTNZNUFJSzM0WU9USXBBQ3lYM0wwcjMxaWJLRm55cWZDbUJkNncyb0N4aFo0REZrampGMkdZakFmRDJJWHZEdzQrZkgrU2VUdDBDOGxDSUlnS0NhSW5PYzU3Q2VXcy9XclBnNERpZ29pWm51bC84UVNSTkh0Q3FTMzgzelN3SmVIRFFkaXlqNmtCRUVRQkdHN1JubU4vTmtsYWtsditNWm11VVo0amZqSkpYcHBMd24vaGRnYktJcThuWnIyNXNoUm9BemFrWlFnQ0lKaUxKZm9CZDZqL25MeUhVMjNMNVNEWWt5WHFQbmVvLy9pOVNHMWNnNkJXSXFBeGZwaDRxUFBwWUpjbzdRdktXbUJ5ZmQxSC95Qlo5bzZ0dnRBdW4yaEhDYlBSelRvZmEvMDlSeVB3WFQ3QXVrVjlQZnkyajEvd1NNeHNXRE4ydTlLSjhlOXIxZmFOK3I2RzdMOHJacjZpM1M3UXkxc1Viem4wSzgwRFRkbCtWdlVkWmwwdXdQcG1mQ1l6SmNHRDM0Nk9ZV0tIb2IyS3lVdGNEMzdjejM3NjZSRjhxSjlxb3BqdUVGQnQwY1V3dkZJNUhnazZxWEZzcUo5cXNxanVMNG4zeXpFbHFBbytsaDA5RXREMC8xY3FXcWJhKzlTMGdMTEpkU3QzK3ZDK09kVmxlZVVsYWMxRFZjUmdwN1NWVGFBNlJMaTF1ODFZZnhTVmVWWlplVnBiY01Wb3VmZUxJUnFuQmlNNmRIUkN3Y2xoM2w0VUhvaHg1Q1NGakFtang4MGdSODBBZGRLVk5XWDFQVlptdm9zWEV1MlNMOTlnakc1L0tEeC9LRHh1RmFpcXJtc3JydW1xYi9TVTI4V1FnWDl2YnlteE1STWlvMFg4VzJSbnVKSVVtSUVZd3RiL3N4YTNoSUdqVmFTcjVjVTYyUWxPbG1wUVZscFVOY1N1UFU5M08wS2pDM2tCejdDRDN5azVTMWgwT29rK1RwSmtVNVdxcE9YR2hTVkJuVk5qN2xaaUhXZ0tCb3NFRVM2dThkNStTVDQrZmIzQzNEbTJEcklBQ1VJd3NhWHRBVUVnV3ZGdUZhSzYyUzRWb25nT29MUUU3akZqd2xPZnNOUnpPN3JBenk4V1RtaFZSRFczMnc2aW5YZHZQNTZSVm10VEdhVm93aUNJRU9DUXR6STVYcllGY2Z2M3pNUXVPMnZpeUlvazRGeG1Td0JsK3ZPNDNrNUM5aE1tcWNGUFZSS0lCQ0liYkhIdUJJSUJPSndRQ21CUUNBQWdGSUNnVUFBQUtVRUFvRUFBRW9KQkFJQkFKUVNDQVFDQUNnbEVBZ0VBRkJLSUJBSUFLQ1VRQ0FRQUVBcGdVQWdBSUJTQW9GQUFBQ2xCQUtCQUFCS0NRUUNBUUNVRWdnRUFnQW9KUkFJQkFCUVNpQVFDQUNnbEVBZ0VBQkFLWUZBSUFDQVVnS0JRQUFBcFFRQ2dRQUFTZ2tFQWdFQWxCSUlCQUlBaDJ5cDFUc3BLQ3cwT3hJV0dvcWlLQzNPUUNCbTJHa2ZuQ2VmV2RUWTFHaDZaTXFqazVjOHM1Z3VmMmlISUlpeGs4YWJIVHl5LzI4V3Erc21XSTVDVnZhMU83bTVwa2VlbURPM096ZVlmZVA2clR0M1RJK01IVFhhMzg4UHNIKzBjdXYyclhkWHJUUTk4dHY2WDN5OHZZMXZsVXJsclBselRFK1lPWFg2MDA4dHNwRi9kanNyMFdxMUdvM0c5SWhlcjZmTEdZaHQyTGw3MS9XY0c4YTN2ajYraXhZODJaMkJOMjdtYk51eDNmUklYRXlNQTBuSjl6Lys3K2F0VzhhMzhYRnhyNzcwc3RrNU9FNlkvVVVnYlNZQlppZm9ETzM4eVd6YzlIdm01VXZHdHh3TzU0ZXZ2d1V5dDdWVEtZSDBOdlI2ZmU3OWU2WkgraWIwcGNzWkc4TmlzVXRLUzR4dkpWSkpXeWtCUmZiTkc2YlhpbytMQi9XTURLWEVkcFNWbHhjVkZ3RTBlRDdqQW9OaFRVdmpwQUVEQk00Q2dKNlFKL2YrUGJWYWJYcGs0SUFCZERsalkrSmlZbmFadkcxdWJpNHJMdzhNQ0FCK0laMU9WMVJVYkhvRW9GNVRKU1ViTi85eC9PUnhxNGMzTlRlYkhUbDYvRmpHeFV6cnJJMGFNWEx4b21lc2RnWVVGeTlkL1BYM0RRQU5ydm44TStzR3J2djJCMEdFZlVuSitZd00wN2NZeGhqUXY3ZEl5WUIrL1Zrc2xrNm5NeDdKdXBaRmhaVGNlM0JmcTIzMUVKUXllREFvNDFSSmlWd3VyNit2QjJoUXBWS3BWQ3JyeHNwa2NvQ2VRSUJERUVSR1ppc3BpWXVORmJxNDBPV1BqZUh6K2FsRFVzNWRPRzg4Y3VGaTVzenBNNEJmNk5LVnk2WnZmWDE4bzZPaVFSbUhEemkwNGVURTgvTDBiUGVqaXNwS2c4RGhmRU1BQUJpZlNVUkJWTW1hV1VCQUFJYWFSd0JwZGRycTZtcmpXdzZINCtQdDA4MUxzOWxzQzUybGxtdlhzeHNhRzB5UHBLZWx0N3lvcUt5OGRmdFdlNE1lVWxoay90aVlsWDJ0b2FHaDNaT045RXRNN09QYngwSlBxV0xXakpubkxseEFrSDlXVXUvbTNxMnByZW4rRDdRN0dIRDh6TGx6cGtlbVRIb1VZRENCN2FURWxyKytPcDJlSUhDYlhjNDZFdnYyL2ZqOUQ5cjlhUFlUODB6M3d2LzM5WGM4SHMvc25NS2l3aVV2dldCOEd4NFcvdTBYWDFIaHB3M1llMkMvNlZzR2d6RXlmVmpMNjd1NWQ3LzY3aHVMRGU3ZjErVTVLOTVlYmo5U0VoMFZuVDUwNklWL3AyWUVRUncrZHV6cEp4Y0N2RVJHWmtaRHc4TUhCWkZJOU9qRVNRRHQyMDVLOXUvY1k3TWdpSmRlZStYK2cvdTJ1UmFFSk9YbDVWblhycGtlR1RJNDJjM05qUzUvNk9MRjU1ZXkyR3pqRnEvWklqUjVLaW9xUm8wWWFYdzdldVFvSnljbmdQYmhBdzZFWmpaczNtUTJoWncrWlJwZHp0Q0loN3ZIaXJmZW9jNysvTG56cURPT1FDbWhFWjFPMXl3V3Qvc1IzdnBQU3l3V2E3UmFzM09rVXBucFc3MWUzNUUxVTV5NFhDNlhhNkduRkhML3dZTUxyUmRjWTJOaSt5VW1HdDlHUlVZdWZ1Ylp6bzFrWldYbDNMcHBlbVQ4dVBFQkFmNmRqd29QQzdQUVdaQmtYTXpjdVdkMzk4OVhLQlJtUno1WTh6R2I5WERSd0lBYnpFNDRmZlpzN3IxN1NMZUpqWWxkMHRWL2RTZEFLYUdON092WnMrYk43czZaVHo3YmRmanpnN3dIM2JIMnpNSkZjMmZQNmZJMDI2QTNHTDcrNFR2VHFFMFVSYzNTSTRLRGdvT0RnanUzSTVQSnpLUmtXRnJhNElHRHdIa0tudWJtNXJ1NWQ4bFl5TS9QNy95RXhzYUd4c1l1MXA1TmNYWjJKdU1QekF5RzBNYjJIZHNMQ3d0TWo2UU5UWXVMamFYTEh3Z1pxSnFWekh0ODlxTVRKcGdlMlhOZ1gxVlZkVWZuZzJYRjIrK1k1aU1JQlBZVmp0V0NwNGRudjhSKzdYNTBQdU84cWY4alI0eGtNc3gvVWpLNTdMSkptSUNycSt1Z3BIYStoM051NVpnRytOalB0dGJ0TzNjMmIvM0w3S0JRS0tURkdkdkQ1L1A5N0N4THlGM2tUbVk0VlZMaTd1N3U3dDdLcysvVy9lLzJuZHNVWGM2TTE1WlJsY0lBa0xDd3NIZmVlTFBkajY3ZnVHNHFKYSs5OUhLN204R21VdUxYeDY5ZGE2cytYRzBxSmFoOUpJTFhOelI4dU9iajNweWlPV3JFU05QOWxCNEFYQ3ZwNGFoYTd5bTJsU1RiSTVWSzMxMjFzcmxOYmdURWxIdjM3MjNmdGRQMHlQeTU4eUxDd3JzNXZMS3E4cGNOdjVrZUdUZDZUR3BLS2pELzJnQ2xwQ2RUVWxwaXRyWVhIQnhNa3kvL0lKZkwzLzdQdXlVbHhWMmYycnZ4OWZITnZIVEpkSnZjMTllMysxSnlJU1BETEdkdE5NV1RJTnRKeWVlZmZOcWRNa3M0anYvKzV4Kzc5dXcyTzFra2N2OW8xZXJRa0JES0hMUTF1ZmR5MzFqK2Ryc2ZTV1ZTMDdmL1diMEt3OHdYeUZYcVZobEpKYVVscHRaUUZOWHBkSG41ZWFaSllsNmVYZ2x4OFdUOUprRk5iZTEvM24rdnRLeVVSaDhjQlZkWDE0anc4THo4UE9PUksxbFozYS8rZFRucnF0bVJ5SWhJWU02MWgrMmtoTW5zK2xxVlZWVmZmUE5WMnlXVjBKRFFqMWQvMkZIR2lvTWlsVXB2dHQ3QzdJanVyREVwRklyT3JiSFpuTGRlZTkyNm9nUkFxS210V2ZiYXE4M2loODgxWEM2WHlXVEs1VERac24xU0JpZWJTa2xaV1dsMWRiV3ZyMitYQTZWU3FWbnhGejgvUDIrVGttdFVZQzhQT0ZxdGR2ZmVQWnUzYmpGTGdrWVFKSFZJNnJ0dnZRMDJ5TmNlUURHczdiNE1XQWdDUnhEVXpjMHRzVy9mT1kvTjZqSkFnMUpxYW1wTmRhUnZRdDgzWG43MXYycy9OZjFyTWFXOG91SkN4b1h1V0w3YnVvd2pnaUJuenAwdEtDaG85MlF6Umd3ZmJqK1pPR2FNR0Q1aTA1WS9UZU51emwwNFArZnhycU9ITWk1bTRvWldFV3ZqeG93RjcxOXI2SmNTSE1kUG5EcTU2Yy9OZGZWMVpoK2hLRHB2enR5bm5uaXlSeFpEVGg0MHVLTjB2cDZObDVmWE13c1hqUm94c3ZNZmExbFo2WVkvZnJmdUVpZE9uZXptbWVGaFlUUkt5YzY5dS8vOHkzeEgzQlRVbUN5TUlBaUNiTno4eDliV3BTZmJwVzFzOU5idDIzYnMzTm51eVFpQ01KaU1QZHM2L0xTYjBDa2xhclg2eUlsamUvYnVyYTVwUDk0a0pEaGs0aVBqZTZTTzlFNjh2THhtejV3MWNmeUVubFRkbWd3Nm5VNmhOSStJN3dTRFFhOVFXck9EM25seVlIY1dIN3FFSGluSkx5ZzRjdnpvNmJObk9uOU9MaW91V3ZUY3N5OHVXVHBwd2tRcnJpSVdpODluWENncUthYXVVaVlaeXNyS2Z0bjRXOWZuZ2NiSHkzdnlwRWR0Zjkyb3FLak52LzFPNDJJTmhGSnNLaVVscGFVWE1pNmN5N2hnV3FqV0ZCNlBGeGNibDMzanV2RkpUNnZWZnYzOXQzVU45WXNXUEt6ZG9GS3BUcDQ5YlRvUVExQW1rNG5qdUZxdGxrZ2sxYlUxaGNWRnBhVmxCSUYzRkZGS08xWFZWZHQzN3JEOWRlTmk0MmlSRWljTDB3Z2pJaUxlZWVNdGlwd3hFaG9TU3ZVbE9pSEF6MzlvNmxEcnhqN0l5ek90UDhKZ01JY2tKMXRuaW9FQjBIZktwVVNwVk42OGZTc3IrMXBXZG5aMWRWVkhwL242OXBrMFllS2o0eWM0T3p2bkZ4U3MrdWlEZXBPbGs3KzJidkh6N1dOY09wSktwZDkrL3gzVm5rUG94Y3ZUYSt6b01YUjdRUzNwUTlQU2g2WlpOL2JqejlhY1BYZlcrSmJENFh5d2NoVVl0NnlDS2ltcHFLemNkL0RBbmJ0M2lvcUw4VGJwejBZRUFrRmFhdHJva1NNVEUvb2ExMFFpd3NQZmV1MzF0MWNzTnoxejNjL3JCdzBjNk9iYWN5cmloQVNIVEg3VVJyT0R6SXNYczY5bjIrWmFrTjRKVlZMeUlPL0J2Z01kRmNWRGd3SURrd1lrcFNZUFNZaVBiL3Z3ZlBQMnJUV2ZyelU3S0pmTDkrM2Z2MmpoVXhhNTRlL25QMzdzT0l1RzJBeHZiKzhwRS8rUmtyejhmSjFPaXlDSXlFM2s2K3RiVmw0dU00bFNpNG1PTVlhb1ZkZFVOelUxdGJ3TzhBOXdhYStXc2w2dmY1RDNvT1cxbjUrZnE5QzFwcWEyQjB2SnpyMTdEaDg5YkhyazlXV3ZKTVFuME9WUDc4UkdheVVvaWdiNEI4VEh4ZmVOaisvWE45SER3NlBkMC9SNi9kYnQyLzdjdHNWZ2FHY2ljL2pZMGFlZVhJaWlLTm9tOUhOSThoQW1rNm5YNjFFVWRlSnlSU0pSb0g5QVhHeHNVR0FRK0p1aGdEZmZmVWVwVkNBSXNtRHUvSVVMbnZ4dDA4Wk1rNmpuQTd2MkduTm5xcXFxM2xtNW91VjEvMzc5UC8vazA3YldHQXpHbXMvWDF0VFdJQWd5ZXRUb2Q5OXNQNmEyeHlDUmlNdkx5MDJQcUVCWE02UVVqVVpqVnYrcE85VFcxcHErMVJ2MEowK2ZzdFJJVEhTMFh4OHdDY29VU29tUGoyOTRXRmg0V0hoTVpHUlVaRlNYaFZVS2l3clhmdjFsWVpzbTIwYWF4YzE1K2ZsUmtaRWU3dTVjTHRkMGYydmgvQ2Npd2lPQXVXNWJtcHFhbFAvdUNQcjRkRkZrUEdsQVVtQkFZRmw1R1lJZ04zSnVaRnpNVEd1emJvZWlhTnJRdEYxN2RpRUljdTdDK2FYUFB1ZnA3aDcrYi9xR0EzWEE3Q1hJNUxKUHZ6Q2ZobHVLVnFPeHdzanJMNzlxNzFJeWV1U28wU05IZGZOa2lWVDYrK1pOaDQ0ZU1RdlJjM1oyTnRzdHZwZDNQeW95RXNPd2tPQ1FleWFod1lWRlJZNHJKWGtGRDh0aGRhZVIwdWdSSXpkdTN0VHlldWVlM1MxU2N2Yjh1ZUovOThVV0xWZzRaTkNnRmluUjYzU256cHllT1gzRzlLbTlzV0FxeEdiUVhFVk5xVkp1M2I1dDRiTlBIenowdDVtT0pQWk4vUFhIbjNrOHZ1bkJpb3FLbGhkbWhUa2ZkRldjenA2NTlXK0tEWVpoTFptN1p1dEhVbG1yTXE3Smc1TUQvQU5hL3Nsa3NoYTF6YmlZK2RmV0xTMy9FQVNKalkwemRnczViYkxPRDRGUUJHM1JybEtwOU8vRGgzYnQyeU9WU3MwKzRuS2RGczUvWXViMEdSaUcrZlhwazIveXBTMFdTMXBleE1YRUhqejB0L0Y0MXJVc0cvZ01tSDl6SzY1Yy9TZUpNeWd3eUlucmhDQ0lxSFhyaHBOblRqMHg1Mkc1OFBDd3NJMC8vMnBtclA1aEJ5a1V4M0UyaXhVUkh0RlNZU0F2UDYraHNkSERuVlNOTEFoMThIajhweXh2ZVhQdXd2bmk0b2UxR2xnczl2eTVjeTAxQWpCZG1BWXBLU3dxMm5md3dPbXpwMDBMaGYwRGlxYWxEbjFoOFJJdkw2K1dBMmI5VUl5WjlVTUdKN2VzczdhOHJhbXRLU2t0b1RkZHpWSmFoS1M0cE1TWWRKOFEvMDhGZ0lFRGt2YVpkSm5hOU9mbXVycTZ2dkVKSFFVNDU5eTZhYXhMSWhLNXRXejNSRWI4SXlVRVFXUmZ6MzdFWG5leU9tZkhycDExWGZYWnk3MW5uczUzOFBDaHE2MTc2N1RGMjl0N0ZnWE5OSzJBNStSaytsWFJUVXBLUzF0TENjc0tJd0N4blpRMGk4Vm56cDQ1ZHVxa1dXVmdJd09UQmk1YXNEQXFzcFZNbWszMWpUczd6czdPL1JMN1hjdCsrT3R5K3N5WnA1L3F1akk3amJSYlYvWFEwU1BHMXdQN0o3VzhTQjQwZU5EQVFjYXBGb0hqaDQ4ZU9XeHlaaWNZbDZoQ2d4L1dkc201ZmN0QnBlVDB1Yk1GSGZ6Q2RNS2x5NWU2UENjNkt0cE9wS1JuUUxtVTFOYldabHkrbUhueDRwMjdkOXVOVldPeVdDUFNoOCtZT2kweW90VzZLVUVRbS8vNjA2eGhzaW5EMHROTnBlVFFzU05Qekp0dmI5MXdUVEVyNXNUbGNKUXE1YVVybDFwaVExaE0xb0QrL1ZzK1FsSDB3L2ZlMzdweng5RmpSOXNtVEhjRWs4VWFOMmFzTWNNZ09pb3FKWGxJeTJ0KzZ5VW5DQVE0VkVuSnBjdVhyOTI0ZnYzRzlmS0tpdFo1MGc4SkRnb2VPMnIwMkRGalJXMjZPbW8wbXMrLy91cnMrYk9kWEdMTWlGRWJOLzF1TEJFcWtVaE9uVGs5NFpIeElOeW5CSU5KUVRNRVFWeGQzWGhPdkw4Mi90SHV5U3dXNjhsNTg1K2NOMThxbGNwa01xS0QvOE4vTE9zTktJWjVlM2x4T0J6andaRGdrSTk2WlJFRGh5RG5aczRKeThOQVRMbi80SUhwVzYxVzgvblhYNUl4R0JZU09tUGFkS3VIVXlJbEJFRzg5K0g3SFgwYTRCK1FtcEl5WXRqd2pncFZscFNXZnZ6cEp4MmwvQmxoczlrenA4LzhkY1BEQmNoTmYyMGVPWHlFWFhXZk0wWGVPcDFjNU9yYStmbW56NXorNW44L0dOK09Iam55bFJlWFVlS1pIYk5zNll0S3BiTHpjNDZlT0g3dXdqblRJd3NYTEl6dWFrR1I3MHpuVEsyOG91TFlpZU1BRGVyMWVwSUdrd2NuMjUyVXRNWEp5U2srTGo2cFgvOGhnNVA5L1R2c3dFZ1F4TjlIRDYvLythZDJWbVRiWThxa1NkdDM3akRHbURjME5HemZ2V3ZoL0NmQU9BMGFtYXhWakl5cnFMTjhvc3FxeXUvWC8yZ01YZU53T0xNZm0wV2hjL1pLZHpwczNieHp5K3hJVkVURW9JRURxZkVJMGo0VVNvbElKSXFPaW82TmlrNklqNCtLak9xeXZFcGxWZFhYMzMrYmN6T24rNWZnT2ZGZWVHN0paMTkrYmp5eWJjZTJvVU5TNkcwSDJ4SDFKaW5oQ0lLRWRyemZWRkJZc0hMMSs2WnBPTTdPZ3ZXLy9tTGRkYjI5dkpjdWZzNjZzUkNLY0hOemk0M3BRaVhWYW5WUmNaSHBFUjhmWCtOcVFFVmxwVlFxTVg2RVlZem9xS2lXMTFxZDFxd2VaVkJnRUovZnhTeXNPK0dSblVDSmxLQW91dVgzemNZTjNTN1Jhclc3OXV6K2M5dFc4OEt1S09yTTUzZGVIbW5zNkRGbnpwKzcrbTk5YloxTzk5L1Axdno0M1E5MitKaFRZNUkwZ1dHTWtQWXFaV2kwMmwyN2QvMjViWXV1OWNKS1kyTkRodVZwR2kzUVc1SUQwaTVwcVVQYlpqeVlzV3ZQN3ZXLy9teHlBUDFvMWVxUWY5dVBtQlVaNEhLNTMzMzVkY3RySE1mbkxseGcyakI0U0hMeTRrWFBBUEc4STZpS2R1Mm1qaEFFY2ZMMHFZV0xuOW53eCs5bU9zTG5PNi8rejN0Si9RZDBhZVQxWmErNENCNG15SlpYbEgvNnhWb2N0NStlbGdpQ0lFcVYwalQveXQvZm4ydXlSSW9naUV3bTI3Rm4xOEpuRm0zY3ZNbE1SeUM5RUsxV3UvZmdmdE1qY2JHeElkMXJZNFJoMkpoUnJkSldEaDA1TEdzZE13MGMycUpkY1J5L2tKbngxL2F0UlVWRmJUOGQwSC9BYTh0ZThmWHhPZE9Ob0c4UEQ0OFBWNjErK3ovTHRmOVd4ODI0bVBudHVoOWVzNmM2aklXRlJhYnRrWkwrM2ZjVmk4WFpONjZmejdpUWxYMU4yN3E2YjRCL3dJcTNsMXMwN1N3cExmMW96WDliY29KYllES1o4MmJQSWVjN2hBYTI3ZGh1bHZzN2U2WUZpMldUSno2NmQvOCs0MitVWEM3L2VjT3ZiN3p5R2tnWFcwT0RsR2gxdWpObnoyemJ1YU84b3J6dHB5STMwWFBQUER0bTFHaUxiTWJIeFMxLzgrMlAxbnhpL0hNOWRQZ1FrOEY4Y2NuemJadFIwVUxPN1ZaTmF0SlNoaUlJY3VUWTBhKysrNmJkVG1NdUxpNnhNYkYvSHptRUlJaWIwUFh4eDJaMTNxTVR4L0U5Qi9adDJQUzcxbVRGMnNWRitQNktsWWw5KzRLNUI0aXR1SDNuOXBZZDIweVBERW9hbUpxUzBuMExQdDdlTTZmUDNMcDlxL0hJMGVQSEJpY05URTlMQitabGEyd3FKVFcxTlFjUEh6cDYvSmhFSW1uN3FiT3o4K3laczZaUG5XYmRNc2V3dFBUWFgzN2xteCsrTTBiRTdqKzR2MW5jL082YmI5dERmZk5yMlE4ckR3bUZ3dmo0ZUFSQlZDcVZxWTY0dTNzTVNocVlQblJvYzNQekQrdlhIVHR4elBqUjBSUEhsenk3ZU1TdzRlM1czOCs1bWZQanI3K1loUkVueENlc2VQc2RUNDhlMVllc04xQldYdjdCSjYxNnMvTjR2SmVXdm1DcG5YbVB6ejZmY2I2eXNyTGxMVUVRbjMzMWhZZUhaMHgwTkRCZlRiQ0ZsQ2lWeW95TG1TZlBuTTY1bWRQdUVvYTd1OGUwS1ZNblQ1allaVTBUck5OR0ZoTWVHUzhTaVQ1YTg0bjYzMVNkOHhmTzE5YldybHorcnE5UDF6M05xS08ydHRZMFQrVFI4Uk1aR0lZZ2lMT3pjLy9FZnNIQklaSGg0YkV4TWFhVkkrSmlZdGQ4c2RiWWJxcWhzZUcvbjYzWnRYZlB3aWNXREI0NHlIamE5WndiVzdadk05djI0dkY0aXhZc25EWmxLdXo3NFhBVUZCWXVmMitGV0N3MkhzRXdiTVhieTYyb0t1TGs1UFRScXRVdnZmYXFNYVJBclZhLy9aL2xINjFhVFVYdGRBcWxSQ2FYWjJWbFpWeStlT1hxbGZialJGQzBiM3pDcEVmR0R4ODJ2S090WW5YcmdheXU0dUtUQnczK2V1M25xejc2MEZobCtrSGVnK2VYdmZqT0cyK2xEckZnZmdpV0l5ZU9HMmNmSEE3SFdEcGszSml4SGJWTkN3Z0krUDZyYjNidTNyVjU2MS9HLzcwSGVROVdyRm9aR2hvNmZmSlVyVlo3OE1paGtwSVMwMUVZaG8wZE0vYnBCUXZkWVI2d0EzTHN4UEh2MXYzUTZvOEZSWmN1WGpKa3NKV2w1QU1EQWxldCtNLzdIMzFndEtsU3FkNTU3ejlQTDN6cThSbVBnZjJtb1VSS2FtdHJQLy9tcTl0MzdoZ003YmYvOGZYeEhURjh4UGl4NC96NmROWVlUYS9YUDhocjFRWFNyVTJJZlZzaXdpTitYYmYraC9VL25qaDFvdVdJUXFFNGZ2SUVYVktpVXFuMkh6eGdmRHRwd2lUWHJ1SmNXMkF3R0hNZW56MWkrUEQxdi95U2NUSFRtSDlRVkZUMDViZGZ0ejE1ZVBxd0orYk9Dd3dJQk9VNWpUUTFOKy90c0Rhd09iZHVtL2RVUG5ieXhPMjdkN296bHMxbUw1ZzczekxuS0tDMnJ1NS82Mys4ZVBtaTZVRUdnL25HSzYrUzdORTVjRURTMnY5K3V2S0RWY1lkSElOZS84dHZ2MTdOeW5wNTZZdEJRY0FxbGxJaUpZM05UZTFHbWdYNEJ3eE5IVG84TFQwaXZQMlFlVk4wZXQyNm4zOFNtM1NaUlJBa3pDVGJ0UlA0ZlA0N2I3eVpscHI2N2YrK054WlZwb3R0dXg3RzQzcDdlUzlhOEtSRnc0VXV3a2tUSmtpa2tzNmFrS1BveFBFVEpveDdCRlJ4UGRxUlNNUmJ0Mi9yK3J3T09IZitYTmNuSVFpQ0lNN096dlJLaVVRaTJiRm45LzZEKzgwYTZMbTV1YjN6eGxzREJ5U1J2MFJjYk94M1gzNzl5ZHJQVEV2LzNMeDE4N21YWHBqd3lQZzVzMmI1ZUhkUkJyUTdVTDVXNHVURTY5ZTM3K0NCZ3dZbERleThjT25LMWF0d2drQVFCRVVRblY1ZldGUm90anFMWVZpS0pUT0xvU21wU2YwSDdObTNkL3R1c3YxUXJVWWlsZTdZOWUvVlVmU05WMTd0c28rNlZxc3RLeThyS0N4OFVKQi8vLzc5b3VLaWRvdG10NElnRGg3NisrQ2h2N2xjYmtSNFJFUjRlR2h3U0ZCZ29KK2ZuMm5FRGNTdUtDNHBPWGo0MFBHVEo0eExlMGJTMDlKZmZXbVowRVVJNmxvQi9nSGZmL1hOWDF1M2JObXgzZmlzWUREby96Nzg5NUZqUjlMVDBpYytNcjUvWWo4eWp6eVVTQW1IelU1SkhwS1FrSkFZbnhBZUZ0N04zbzVYcjJWMUhsZjJ5Tmh4bHBZQzQzSzU4K2JNZlhUaXBNNiswcWxFcVZRYTQ4MFdQL1gwQUpPSU81MU9KNVpJR2hzYkd4c2JhdXZxcW10cnE2cXJLaW9xcW10cjhJNjFReWdVOW8xUENBc0x5ODh2eUxsMVU2Rm9GUXFzVnF0djM3bHRlck44dnJPWGw1ZW5oNGZJelUwb2RIVnhjUkh3K1dsRDAxd0VBdEQzQ3JHQUU2ZE9mdmJsRjIyVDVzUER3cDlaK05RZ2s1VjFVRENaeklVTG5odzlhdFRHelgrY3YzRGV1SGhuTUJqT25qdDc5dHpaRWNOSHJIem5YZXZ0QS9LekZXR2hZY0RUMitOaTQ1WXVYbUxkV0JjWEY2dmJLWUppeHJRWnMyYzkzdkphcjlmUG5QdTRRcUhzcVB5Q0tVd21NeWdvT0RJaUlpNDZKalk2SmlBZ3dQalZnZU40VVhIUm5idDNjeC9jenkvSXI2aXNKTnBvc1VJaEx5NldGN2RPNVFnUEM3ZHpLWEZ4RWM2Y1B0TUdGK0p3NkNsd28xYXJ6WDc2TWRFeGowMmZNU3d0bmRKOU4zOC8vL2VXcnlpWU5YdkhubDBYTWpKYXVpKzFvRktaVDQ0c2dyWm8xMjZEQmdjRmpSODdidXJrS2ZZUUhtSUZLSW8rT2UrSkorWTlmQ0FuRUVTaGFMOS9QWlBGOHZYMjhmUHpDd3dJQ0FrS0RnNEtEZzRLNnVqR01Rd0xEd3NQRHd1ZmhreEZFRVN0VnBlV2xaV1dsWlpWbEZkVlZWVlZWOWZWMTBtbHN1NElscjNoTGhMMWtoUkVvVkE0UEgzWW94TW0yakpWS2p3c2JNVmI3MGlXUEgvOHhJbmpwMDRXbHhSM1BhWXI3RWhLZnYvbE45TzNPRTR3TUV3b0ZIWWU1V25uc05tczFTdFhEVTFKTlQySUlraDBkTFNMd01WRklIQjFkUk9KM0R4RTdsNmVubDVlM2g3dTdsYUg1M0s1M0tqSVNMT0tsbXFOcHFHaG9ibTVXU3h1Rmtza1VybGNMcGU1Q29FOWhKUEVyMDhmblVrc2xvZDcrNzNXZWg0aWtlanh4MmFsSmcrSmpZbTE3aWZ1NCtsbG1oRnFhWGQzQkVHRUxzSlpNeCtiTmZPeHF1cnF6TXVYbE1yMnY5NjZDZHB1MURZRUFvRlloRjNrcDBBZ0VFY0hTZ2tFQWdFQWxCSUlCQUlBS0NVUUNBUUFVRW9nRUFnQW9KUkFJQkFBUUNtQlFDQUFnRklDZ1VBQUFLVUVBb0VBQUVvSkJBSUJBSlFTQ0FRQ0FDZ2xFQWdFQUZCS0lCQUlBS0NVUUNBUUFQd2ZSdTJqN3FNWWxiZ0FBQUFBU1VWT1JLNUNZSUk9IiBoZWlnaHQ9IjIxOCIgcHJlc2VydmVBc3BlY3RSYXRpbz0ieE1pZFlNaWQgbWVldCIvPjwvZz48L2c+PC9zdmc+" alt="CCPS" style={{ height: 44, objectFit: "contain" }} />
          <div style={{ fontSize: 18, fontWeight: 700 }}>廣告監控儀表板</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: "var(--text3)" }}>風格</span>
          <select value={theme} onChange={e => setTheme(e.target.value)}
            style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 13 }}>
            {Object.entries(THEMES).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
          </select>
        </div>
      </header>

      {/* ── Nav Tabs ── */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border)", background: "var(--card)", padding: "0 28px" }}>
        {[
          { id: "settings", icon: "⚙️", label: "設定" },
          { id: "report", icon: "📊", label: "報告預覽" },
          { id: "export", icon: "📥", label: "匯出" },
        ].map(tab => (
          <div key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ padding: "12px 20px", fontSize: 14, fontWeight: 500, cursor: "pointer", borderBottom: activeTab === tab.id ? "2px solid var(--accent)" : "2px solid transparent", color: activeTab === tab.id ? "var(--accent)" : "var(--text3)", transition: "all .15s", userSelect: "none" }}>
            {tab.icon} {tab.label}
          </div>
        ))}
      </div>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "24px 20px 60px" }}>

        {/* ══════ SETTINGS TAB ══════ */}
        {activeTab === "settings" && (
          <div>
            {/* Schedule */}
            <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: 24, marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>⏰ 排程設定</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {SCHEDULE_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => setSchedule(opt.value)}
                    style={{ padding: "8px 18px", borderRadius: 20, border: schedule === opt.value ? "2px solid var(--accent)" : "1px solid var(--border)", background: schedule === opt.value ? "var(--accentLight)" : "transparent", color: schedule === opt.value ? "var(--accent)" : "var(--text2)", fontWeight: 600, fontSize: 13, cursor: "pointer", transition: "all .15s" }}>
                    {opt.label}
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 12, fontSize: 13, color: "var(--text3)" }}>
                {schedule === "manual" ? "僅手動執行，不會自動排程" : `將在${SCHEDULE_OPTIONS.find(o => o.value === schedule)?.label || ""}早上 9:00 (台灣時間) 自動執行`}
              </div>
            </div>

            {/* Execution scope */}
            <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: 24, marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>🎯 執行範圍</div>
              <div style={{ display: "flex", gap: 16 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}>
                  <input type="checkbox" checked={runFb} onChange={e => setRunFb(e.target.checked)} style={{ width: 18, height: 18, accentColor: "var(--accent)" }} />
                  📢 Facebook 廣告檔案庫
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}>
                  <input type="checkbox" checked={runYt} onChange={e => setRunYt(e.target.checked)} style={{ width: 18, height: 18, accentColor: "var(--red)" }} />
                  🎬 YouTube 新影片
                </label>
              </div>
            </div>

            {/* FB Keywords */}
            {runFb && (
              <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: 24, marginBottom: 16 }}>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>📢 Facebook 關鍵字設定</div>
                <KeywordManager keywords={fbKeywords} setKeywords={setFbKeywords} label="搜尋關鍵字" />
                <KeywordManager keywords={fbExcludes} setKeywords={setFbExcludes} label="排除關鍵字（包含這些詞的廣告會被過濾）" />

                {/* Region picker */}
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>投放地區</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                    {fbRegions.map(code => {
                      const region = AVAILABLE_REGIONS.find(r => r.code === code);
                      return region ? (
                        <span key={code} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 16, background: "var(--accentLight)", color: "var(--accent)", fontSize: 13, fontWeight: 500 }}>
                          {region.flag} {region.name}
                          {fbRegions.length > 1 && (
                            <span onClick={() => setFbRegions(fbRegions.filter(r => r !== code))} style={{ cursor: "pointer", opacity: 0.6, fontSize: 16, lineHeight: 1 }}>×</span>
                          )}
                        </span>
                      ) : null;
                    })}
                    <button onClick={() => setShowRegionPicker(!showRegionPicker)}
                      style={{ padding: "5px 14px", borderRadius: 16, border: "1px dashed var(--border)", background: "transparent", color: "var(--text2)", fontSize: 13, cursor: "pointer", fontWeight: 500 }}>
                      + 新增地區
                    </button>
                  </div>
                  {showRegionPicker && (
                    <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, padding: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {AVAILABLE_REGIONS.filter(r => !fbRegions.includes(r.code)).map(region => (
                        <button key={region.code}
                          onClick={() => { setFbRegions([...fbRegions, region.code]); setShowRegionPicker(false); }}
                          style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", fontSize: 13, cursor: "pointer", transition: "all .15s" }}>
                          {region.flag} {region.name}
                        </button>
                      ))}
                      {AVAILABLE_REGIONS.filter(r => !fbRegions.includes(r.code)).length === 0 && (
                        <span style={{ fontSize: 13, color: "var(--text3)" }}>所有地區皆已新增</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* YT Keywords */}
            {runYt && (
              <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: 24, marginBottom: 16 }}>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>🎬 YouTube 關鍵字設定</div>
                <KeywordManager keywords={ytKeywords} setKeywords={setYtKeywords} label="搜尋關鍵字" />
                <KeywordManager keywords={ytExcludes} setKeywords={setYtExcludes} label="排除關鍵字（標題含這些詞的影片會被過濾）" />

                {/* Advanced toggle */}
                <div style={{ marginTop: 16 }}>
                  <button onClick={() => setYtShowAdvanced(!ytShowAdvanced)}
                    style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--border)", background: ytShowAdvanced ? "var(--accentLight)" : "transparent", color: ytShowAdvanced ? "var(--accent)" : "var(--text2)", fontSize: 13, cursor: "pointer", fontWeight: 600, transition: "all .15s" }}>
                    {ytShowAdvanced ? "▼" : "▶"} 進階篩選設定
                  </button>
                </div>

                {ytShowAdvanced && (
                  <div style={{ marginTop: 14, padding: 16, background: "var(--bg)", borderRadius: 10, border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 16 }}>

                    {/* Date range */}
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>📅 搜尋時間範圍</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {YT_DATE_RANGE_OPTIONS.map(opt => (
                          <button key={opt.value} onClick={() => setYtDateRange(opt.value)}
                            style={{ padding: "6px 16px", borderRadius: 8, border: ytDateRange === opt.value ? "2px solid var(--accent)" : "1px solid var(--border)", background: ytDateRange === opt.value ? "var(--accentLight)" : "var(--card)", color: ytDateRange === opt.value ? "var(--accent)" : "var(--text2)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Sort order */}
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>📊 排序方式</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {YT_ORDER_OPTIONS.map(opt => (
                          <button key={opt.value} onClick={() => setYtOrder(opt.value)}
                            style={{ padding: "6px 16px", borderRadius: 8, border: ytOrder === opt.value ? "2px solid var(--accent)" : "1px solid var(--border)", background: ytOrder === opt.value ? "var(--accentLight)" : "var(--card)", color: ytOrder === opt.value ? "var(--accent)" : "var(--text2)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Duration filter */}
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>⏱ 影片長度</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {YT_DURATION_OPTIONS.map(opt => (
                          <button key={opt.value} onClick={() => setYtDuration(opt.value)}
                            style={{ padding: "6px 16px", borderRadius: 8, border: ytDuration === opt.value ? "2px solid var(--accent)" : "1px solid var(--border)", background: ytDuration === opt.value ? "var(--accentLight)" : "var(--card)", color: ytDuration === opt.value ? "var(--accent)" : "var(--text2)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Min views */}
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>👁 最低觀看數</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <input type="range" min="0" max="10000" step="500" value={ytMinViews}
                          onChange={e => setYtMinViews(Number(e.target.value))}
                          style={{ flex: 1, accentColor: "var(--accent)" }} />
                        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", minWidth: 60, textAlign: "right" }}>
                          {ytMinViews === 0 ? "不限" : ytMinViews.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Summary */}
                    <div style={{ padding: 10, borderRadius: 8, background: "var(--accentLight)", fontSize: 12, color: "var(--accent)", lineHeight: 1.6 }}>
                      目前設定：搜尋 {YT_DATE_RANGE_OPTIONS.find(o => o.value === ytDateRange)?.label} 的影片，依 {YT_ORDER_OPTIONS.find(o => o.value === ytOrder)?.label} 排序，長度 {YT_DURATION_OPTIONS.find(o => o.value === ytDuration)?.label}
                      {ytMinViews > 0 ? `，至少 ${ytMinViews.toLocaleString()} 次觀看` : ""}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Run button */}
            <button onClick={runScan} disabled={isRunning || (!runFb && !runYt)}
              style={{ width: "100%", padding: "14px 0", borderRadius: 12, border: "none", background: isRunning ? "var(--text3)" : "var(--accent)", color: "#fff", fontSize: 16, fontWeight: 700, cursor: isRunning ? "default" : "pointer", transition: "all .2s", opacity: (!runFb && !runYt) ? 0.4 : 1 }}>
              {isRunning ? "執行中..." : "▶ 立即執行掃描"}
            </button>

            {isRunning && (
              <div style={{ marginTop: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text2)", marginBottom: 6 }}>
                  <span>{progressText}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: "var(--border)", overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 3, background: "var(--accent)", width: `${progress}%`, transition: "width 0.4s ease" }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════ REPORT TAB ══════ */}
        {activeTab === "report" && (
          <div>
            {!fbData && !ytData ? (
              <div style={{ textAlign: "center", padding: "80px 20px", background: "var(--card)", borderRadius: 12, border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>尚無報告</div>
                <div style={{ color: "var(--text2)", fontSize: 14, marginBottom: 20 }}>前往「設定」頁面執行掃描以生成報告</div>
                <button onClick={() => setActiveTab("settings")} style={{ padding: "10px 24px", borderRadius: 10, background: "var(--accent)", color: "#fff", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>前往設定</button>
              </div>
            ) : (
              <div>
                {/* Summary stats */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 20 }}>
                  {fbData && (
                    <>
                      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: 18, textAlign: "center" }}>
                        <div style={{ fontSize: 28, fontWeight: 700, color: "var(--accent)" }}>{fbData.total}</div>
                        <div style={{ fontSize: 12, color: "var(--text2)" }}>FB 廣告</div>
                      </div>
                      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: 18, textAlign: "center" }}>
                        <div style={{ fontSize: 28, fontWeight: 700, color: "var(--green)" }}>
                          {Object.keys(fbData.ads.reduce((a, ad) => { a[ad.page_name] = 1; return a; }, {})).length}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text2)" }}>粉專數</div>
                      </div>
                    </>
                  )}
                  {ytData && (
                    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: 18, textAlign: "center" }}>
                      <div style={{ fontSize: 28, fontWeight: 700, color: "var(--red)" }}>{ytData.total}</div>
                      <div style={{ fontSize: 12, color: "var(--text2)" }}>YT 新影片</div>
                    </div>
                  )}
                </div>

                <ReportPreview fbData={fbData} ytData={ytData} activeReportTab={activeReportTab} setActiveReportTab={setActiveReportTab} theme={theme} />
              </div>
            )}
          </div>
        )}

        {/* ══════ EXPORT TAB ══════ */}
        {activeTab === "export" && (
          <div>
            {!fbData && !ytData ? (
              <div style={{ textAlign: "center", padding: "80px 20px", background: "var(--card)", borderRadius: 12, border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📥</div>
                <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>尚無報告可匯出</div>
                <div style={{ color: "var(--text2)", fontSize: 14 }}>請先執行掃描生成報告</div>
              </div>
            ) : (
              <div>
                {/* Theme selector */}
                <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: 24, marginBottom: 16 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>🎨 報告風格</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
                    {Object.entries(THEMES).map(([k, v]) => (
                      <div key={k} onClick={() => setExportTheme(k)}
                        style={{ padding: 16, borderRadius: 10, border: exportTheme === k ? "2px solid var(--accent)" : "1px solid var(--border)", cursor: "pointer", textAlign: "center", transition: "all .15s", background: exportTheme === k ? "var(--accentLight)" : "transparent" }}>
                        <div style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: 8 }}>
                          <div style={{ width: 20, height: 20, borderRadius: "50%", background: v.bg, border: "1px solid #ccc" }} />
                          <div style={{ width: 20, height: 20, borderRadius: "50%", background: v.accent }} />
                          <div style={{ width: 20, height: 20, borderRadius: "50%", background: v.card, border: "1px solid #ccc" }} />
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{v.name}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Export buttons */}
                <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: 24 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>📥 下載報告</div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <button onClick={() => handleExport("html")}
                      style={{ flex: 1, minWidth: 180, padding: "16px 24px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--bg)", cursor: "pointer", textAlign: "left" }}>
                      <div style={{ fontSize: 24, marginBottom: 6 }}>🌐</div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>HTML 格式</div>
                      <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>用瀏覽器開啟，互動式分頁</div>
                    </button>
                    <button onClick={() => handleExport("pdf")}
                      style={{ flex: 1, minWidth: 180, padding: "16px 24px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--bg)", cursor: "pointer", textAlign: "left" }}>
                      <div style={{ fontSize: 24, marginBottom: 6 }}>📄</div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>PDF 格式</div>
                      <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>適合列印或分享給同事</div>
                    </button>
                  </div>
                  <div style={{ marginTop: 16, padding: 14, borderRadius: 8, background: "var(--accentLight)", fontSize: 13, color: "var(--accent)" }}>
                    💡 將以「{THEMES[exportTheme].name}」風格匯出，包含 {fbData ? "FB 廣告" : ""}{fbData && ytData ? " + " : ""}{ytData ? "YouTube 影片" : ""} 資料
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </main>

      <footer style={{ textAlign: "center", padding: "20px", fontSize: 12, color: "var(--text3)", borderTop: "1px solid var(--border)" }}>
        CCPS 廣告監控系統 · 家慶佳業 · FB 投放地區：{fbRegions.map(c => AVAILABLE_REGIONS.find(r => r.code === c)?.name).join("、")} · YT：{YT_DATE_RANGE_OPTIONS.find(o => o.value === ytDateRange)?.label}
      </footer>
    </div>
  );
}
