import React, { useState, useEffect } from "react";
import { Wifi, WifiOff, RefreshCw, Info, X, Download } from "lucide-react";
import { THEME, styles, APP_NAME, APP_VERSION, APP_VERSION_CODE } from "./shared.js";
import { useLanguage } from "./i18n/LanguageContext.jsx";
import { useAppearance } from "./shared/AppearanceContext.jsx";
import { isoToJalaliDisplay } from "./personnel/jalaliDate.jsx";
import { subscribeNetworkStatus, startNetworkMonitor } from "./offline/networkStatus.js";
import { startAutoSync, subscribeSyncStatus } from "./offline/syncEngine.js";
import { getQueue } from "./offline/offlineDb.js";
import { loadLatestPublishedRelease, isNewerThanCurrent } from "./superadmin/appReleaseApi.js";
import { resolveLatestApkUrl, openApkDownload } from "./appDownload.js";

// وضعیت آنلاین/آفلاین + شمارنده‌ی عملیات معلق + بوت‌استرپِ حلقه‌ی
// همگام‌سازی — دقیقاً همان کاری که OnlineIndicator می‌کرد. حالا داخلِ
// دکمه‌ی «درباره IHMS» در هدر زندگی می‌کند (طبق خواسته: جایگاه/نحوه‌ی
// نمایش عوض شود ولی قابلیت آنلاین/آفلاین کاملاً حفظ شود).
function useOnlineStatus() {
  const [status, setStatus] = useState({ online: typeof navigator !== "undefined" ? navigator.onLine : true });
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    startNetworkMonitor();
    startAutoSync();
    const unsubNet = subscribeNetworkStatus(setStatus);
    const refreshCount = async () => {
      const q = await getQueue();
      setPendingCount(q.filter((i) => i.status !== "syncing").length);
    };
    refreshCount();
    const unsubSync = subscribeSyncStatus((summary) => {
      setSyncing(summary.phase === "syncing");
      refreshCount();
    });
    const interval = setInterval(refreshCount, 10000);
    return () => { unsubNet(); unsubSync(); clearInterval(interval); };
  }, []);

  return { status, pendingCount, syncing };
}

// دکمه‌ی هدر: آیکونِ Wifi/WifiOff (سبز/قرمز) = وضعیت آنلاین، برچسب
// «درباره IHMS»، شمارنده‌ی عملیات معلق، و یک نقطه‌ی قرمز اگر نسخه‌ی جدیدی
// منتشر شده باشد. کلیک → پنل مشخصات نرم‌افزار.
export function HeaderAboutButton() {
  const { t } = useLanguage();
  const { status, pendingCount, syncing } = useOnlineStatus();
  const [open, setOpen] = useState(false);
  const [latestRelease, setLatestRelease] = useState(null);

  useEffect(() => {
    let alive = true;
    loadLatestPublishedRelease().then((r) => { if (alive) setLatestRelease(r); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const updateAvailable = isNewerThanCurrent(latestRelease);
  const color = status.online ? "#34d399" : "#fca5a5";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={t("aboutMenuLabel")}
        style={{
          display: "flex", alignItems: "center", gap: 5, cursor: "pointer", fontFamily: THEME.font,
          background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.22)",
          borderRadius: 999, padding: "5px 10px", fontSize: 11, color: "#fff", fontWeight: 600, position: "relative",
        }}
      >
        {syncing ? (
          <RefreshCw size={12} style={{ animation: "ihms-spin 1s linear infinite" }} />
        ) : status.online ? (
          <Wifi size={12} color={color} />
        ) : (
          <WifiOff size={12} color={color} />
        )}
        <Info size={12} />
        <span>{t("aboutMenuLabel")}</span>
        {pendingCount > 0 && (
          <span style={{ background: "rgba(255,255,255,0.2)", borderRadius: 999, padding: "1px 6px", fontSize: 10 }}>{pendingCount}</span>
        )}
        {updateAvailable && (
          <span style={{ position: "absolute", top: -2, insetInlineEnd: -2, width: 9, height: 9, borderRadius: "50%", background: "#ef4444", border: "1.5px solid #fff" }} />
        )}
        <style>{`@keyframes ihms-spin { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }`}</style>
      </button>
      {open && <AboutIhmsModal onClose={() => setOpen(false)} latestRelease={latestRelease} online={status.online} />}
    </>
  );
}

// پنلِ «درباره IHMS» — مشخصات نرم‌افزار + وضعیت به‌روزرسانی (نسخه‌ی
// نصب‌شده، آخرین نسخه‌ی منتشرشده، Release Notes، دکمه‌ی دانلود).
export function AboutIhmsModal({ onClose, latestRelease, online }) {
  const { t, dir, lang } = useLanguage();
  const appearance = useAppearance();
  const [release, setRelease] = useState(latestRelease || null);
  const [checking, setChecking] = useState(latestRelease === undefined || latestRelease === null);
  // لینکِ دانلودِ مستقیمِ APK — از Assetِ Releaseِ GitHub گرفته می‌شود.
  const [apkUrl, setApkUrl] = useState("");

  useEffect(() => {
    let alive = true;
    const use = (r) => {
      if (!alive) return;
      setRelease(r); setChecking(false);
      resolveLatestApkUrl(r?.effectiveDownloadUrl || "").then((u) => { if (alive) setApkUrl(u); });
    };
    if (latestRelease) { use(latestRelease); return () => { alive = false; }; }
    setChecking(true);
    loadLatestPublishedRelease().then(use).catch(() => { if (alive) setChecking(false); });
    return () => { alive = false; };
  }, [latestRelease]);

  const updateAvailable = isNewerThanCurrent(release);

  const todayDisplay = lang === "en"
    ? new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : isoToJalaliDisplay(new Date().toISOString().slice(0, 10));

  const buildDisplay = typeof __BUILD_TIME__ !== "undefined"
    ? (lang === "en"
        ? new Date(__BUILD_TIME__).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
        : `${isoToJalaliDisplay(__BUILD_TIME__.slice(0, 10))} - ${new Date(__BUILD_TIME__).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`)
    : "—";

  const Row = ({ label, value, ltr }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${THEME.border}`, gap: 12 }}>
      <span style={{ fontSize: 12, color: THEME.text3, fontWeight: 600, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: THEME.text, fontWeight: 600, direction: ltr ? "ltr" : dir, textAlign: dir === "rtl" ? "left" : "right" }}>{value}</span>
    </div>
  );

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 4000, background: "rgba(6,17,26,0.55)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", overflowY: "auto", direction: dir }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ ...styles.card, width: "100%", maxWidth: 440, margin: 0, textAlign: "center", position: "relative", direction: dir }}>
        <button type="button" onClick={onClose} style={{ position: "absolute", top: 10, insetInlineEnd: 10, background: "none", border: "none", cursor: "pointer", color: THEME.text3 }}>
          <X size={18} />
        </button>

        <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
          {appearance?.logoUrl
            ? <img src={appearance.logoUrl} alt="" style={{ width: 76, height: 76, objectFit: "contain", borderRadius: 14 }} />
            : <div style={{ width: 76, height: 76, borderRadius: 16, background: THEME.navy, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 22 }}>IHMS</div>}
        </div>
        <h2 style={{ margin: 0, fontSize: 19, direction: "ltr", color: THEME.navy, fontWeight: 700 }}>{appearance?.systemName || APP_NAME}</h2>
        <p style={{ color: THEME.text3, fontSize: 12.5, marginTop: 4, marginBottom: 18, fontWeight: 500 }}>{t("aboutFullTitleValue")}</p>

        {/* وضعیت به‌روزرسانی */}
        <div style={{
          borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 12.5, fontWeight: 700,
          background: updateAvailable ? "#fef3c7" : "#dcfce7",
          color: updateAvailable ? "#92400e" : "#166534",
        }}>
          {checking ? t("commonLoading") : updateAvailable
            ? t("aboutNewVersionAvailable")
            : t("aboutUpToDate")}
        </div>

        <div style={{ textAlign: dir === "rtl" ? "right" : "left" }}>
          <Row label={t("aboutCurrentVersion")} value={`${APP_VERSION} (build ${APP_VERSION_CODE})`} ltr />
          <Row
            label={t("aboutLatestVersion")}
            value={release ? `${release.version} (build ${release.versionCode})` : (checking ? "…" : "—")}
            ltr
          />
          <Row label={t("aboutLastUpdate")} value={todayDisplay} />
          <Row label={t("aboutBuild")} value={buildDisplay} />
          <Row label={t("aboutDeveloper")} value="Tohid Mirasadi" ltr />
          <Row label={t("aboutLanguageLabel")} value={t("aboutLanguageValue")} />
        </div>

        {release?.releaseNotes && (
          <div style={{ textAlign: dir === "rtl" ? "right" : "left", marginTop: 14 }}>
            <div style={{ fontSize: 11.5, color: THEME.text3, fontWeight: 700, marginBottom: 4 }}>{t("aboutReleaseNotesLabel")}</div>
            <p style={{ fontSize: 12, color: THEME.text2, lineHeight: 1.9, margin: 0, whiteSpace: "pre-wrap" }}>{release.releaseNotes}</p>
          </div>
        )}

        {updateAvailable && (apkUrl || release?.effectiveDownloadUrl) && (
          <button
            type="button"
            onClick={() => openApkDownload(apkUrl || release.effectiveDownloadUrl)}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 16, background: THEME.teal, color: "#fff", border: "none", borderRadius: 9, padding: "9px 18px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: THEME.font }}
          >
            <Download size={14} /> {t("aboutDownloadUpdate")}
          </button>
        )}

        <p style={{ textAlign: "center", color: "#aaa", fontSize: 11, marginTop: 18 }}>{t("aboutCopyright")}</p>
      </div>
    </div>
  );
}
