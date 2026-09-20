import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Wifi, WifiOff, RefreshCw, Info, X, Download, AlertTriangle, RotateCcw } from "lucide-react";
import { THEME, styles, APP_NAME, APP_VERSION, APP_VERSION_CODE, usePersistedState } from "./shared.js";
import { useLanguage } from "./i18n/LanguageContext.jsx";
import { numLocale } from "./i18n/translations.js";
import { useAppearance } from "./shared/AppearanceContext.jsx";
import { isoToJalaliDisplay } from "./personnel/jalaliDate.jsx";
import { subscribeNetworkStatus, startNetworkMonitor } from "./offline/networkStatus.js";
import { startAutoSync, subscribeSyncStatus, retryItemNow, processQueue } from "./offline/syncEngine.js";
import { getQueue } from "./offline/offlineDb.js";
import { loadLatestPublishedRelease, isNewerThanCurrent } from "./superadmin/appReleaseApi.js";
import { resolveLatestApkUrl, openApkDownload } from "./appDownload.js";

// نگاشتِ کلیدِ ماژولِ صفِ آفلاین (از MODULE_TABLE_MAP در syncEngine.js) به
// کلیدِ i18n نامِ همان ماژول که جای دیگری در سامانه هم استفاده می‌شود —
// برای نمایشِ خوانا در فهرستِ صفِ هم‌گام‌سازی، بدون تعریفِ دوبارهٔ نام‌ها.
const QUEUE_MODULE_LABEL_KEYS = {
  personnel: "modulePersonnelAccess", personnelDocuments: "modulePersonnelAccess",
  anomalies: "moduleAnomalyReport", anomalyPhotos: "moduleAnomalyReport",
  bowties: "subBowtie",
  machinery: "moduleMachinery", machineryDocuments: "moduleMachinery",
  scaffoldTags: "moduleScaffold", scaffoldPhotos: "moduleScaffold",
  hseSurvey: "moduleHseSurvey",
  permitToWork: "modulePermitToWork", permitTemplates: "modulePermitToWork", permitRenewals: "modulePermitToWork", permitSigners: "modulePermitToWork",
  pssrs: "modulePssr", pssrTeamMembers: "modulePssr", pssrMeetings: "modulePssr", pssrChecklistResponses: "modulePssr", pssrActionItems: "modulePssr", pssrActionHistory: "modulePssr", pssrNotifications: "modulePssr",
  liftingPlans: "moduleQuickTools", liftingPlanRevisions: "moduleQuickTools", liftingPlanAudit: "moduleQuickTools", liftingCraneModels: "moduleQuickTools", liftingRiggingItems: "moduleQuickTools", liftingAcceptanceCriteria: "moduleQuickTools",
  excavationAssessments: "moduleQuickTools", excavationAudit: "moduleQuickTools", excavationStandardProfiles: "moduleQuickTools",
  energyAssessments: "moduleQuickTools", energyAudit: "moduleQuickTools",
  fleetFuelAssessments: "moduleQuickTools", fleetFuelAudit: "moduleQuickTools",
  correctiveActions: "subCorrectiveActionsList",
};
const QUEUE_ACTION_LABEL_KEYS = { insert: "onlineIndActionInsert", update: "onlineIndActionUpdate", delete: "onlineIndActionDelete" };

function formatRelativeTime(t, iso, lang) {
  if (!iso) return t("onlineIndLastSyncNever");
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  const loc = numLocale(lang);
  if (minutes < 1) return t("onlineIndTimeJustNow");
  if (minutes < 60) return t("onlineIndTimeMinutesAgo", { n: minutes.toLocaleString(loc) });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("onlineIndTimeHoursAgo", { n: hours.toLocaleString(loc) });
  return t("onlineIndTimeDaysAgo", { n: Math.floor(hours / 24).toLocaleString(loc) });
}

// وضعیت آنلاین/آفلاین + شمارنده‌ی عملیات معلق + بوت‌استرپِ حلقه‌ی
// همگام‌سازی — دقیقاً همان کاری که OnlineIndicator می‌کرد. حالا داخلِ
// دکمه‌ی «درباره IHMS» در هدر زندگی می‌کند (طبق خواسته: جایگاه/نحوه‌ی
// نمایش عوض شود ولی قابلیت آنلاین/آفلاین کاملاً حفظ شود).
// همچنین جزئیاتِ صفِ هم‌گام‌سازی (هر آیتم + خطا + تلاشِ مجددِ تکی) و زمانِ
// آخرین هم‌گام‌سازیِ موفق را نگه می‌دارد تا در پنلِ «درباره IHMS» دیده شوند.
function useOnlineStatus() {
  const [status, setStatus] = useState({ online: typeof navigator !== "undefined" ? navigator.onLine : true });
  const [queueItems, setQueueItems] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = usePersistedState("ihms_last_sync_at", null);

  useEffect(() => {
    startNetworkMonitor();
    startAutoSync();
    const unsubNet = subscribeNetworkStatus(setStatus);
    const refreshQueue = async () => {
      const q = await getQueue();
      setQueueItems(q);
    };
    refreshQueue();
    const unsubSync = subscribeSyncStatus((summary) => {
      setSyncing(summary.phase === "syncing");
      if (summary.phase === "idle" && summary.done > 0) setLastSyncAt(new Date().toISOString());
      refreshQueue();
    });
    const interval = setInterval(refreshQueue, 10000);
    return () => { unsubNet(); unsubSync(); clearInterval(interval); };
  }, []);

  const pendingCount = queueItems.filter((i) => i.status !== "syncing").length;
  return { status, queueItems, pendingCount, syncing, lastSyncAt };
}

// دکمه‌ی هدر: آیکونِ Wifi/WifiOff (سبز/قرمز) = وضعیت آنلاین، برچسب
// «درباره IHMS»، شمارنده‌ی عملیات معلق، و یک نقطه‌ی قرمز اگر نسخه‌ی جدیدی
// منتشر شده باشد. کلیک → پنل مشخصات نرم‌افزار.
export function HeaderAboutButton() {
  const { t } = useLanguage();
  const { status, queueItems, pendingCount, syncing, lastSyncAt } = useOnlineStatus();
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
      {open && (
        <AboutIhmsModal
          onClose={() => setOpen(false)}
          latestRelease={latestRelease}
          online={status.online}
          queueItems={queueItems}
          syncing={syncing}
          lastSyncAt={lastSyncAt}
        />
      )}
    </>
  );
}

// پنلِ «درباره IHMS» — مشخصات نرم‌افزار + وضعیت به‌روزرسانی (نسخه‌ی
// نصب‌شده، آخرین نسخه‌ی منتشرشده، Release Notes، دکمه‌ی دانلود).
export function AboutIhmsModal({ onClose, latestRelease, online, queueItems = [], syncing = false, lastSyncAt = null }) {
  const { t, dir, lang } = useLanguage();
  const appearance = useAppearance();
  const [release, setRelease] = useState(latestRelease || null);
  const [checking, setChecking] = useState(latestRelease === undefined || latestRelease === null);
  // لینکِ دانلودِ مستقیمِ APK — از Assetِ Releaseِ GitHub گرفته می‌شود.
  const [apkUrl, setApkUrl] = useState("");
  const [retryingId, setRetryingId] = useState(null);
  const [retryingAll, setRetryingAll] = useState(false);

  const pendingItems = queueItems.filter((i) => i.status !== "syncing");
  const problemItems = queueItems.filter((i) => i.status === "failed" || i.status === "conflict");

  const handleRetryOne = async (queueId) => {
    setRetryingId(queueId);
    try { await retryItemNow(queueId); } finally { setRetryingId(null); }
  };
  const handleRetryAll = async () => {
    setRetryingAll(true);
    try { await processQueue(); } finally { setRetryingAll(false); }
  };

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

  // «آخرین به‌روزرسانی» باید تاریخِ واقعیِ انتشارِ آخرین نسخه باشد
  // (release.publishedAt)، نه «امروز» — قبلاً همیشه تاریخِ روز را نشان
  // می‌داد (چون new Date() بدونِ وابستگی به release محاسبه می‌شد)، مستقل
  // از این‌که واقعاً چیزی امروز منتشر شده باشد یا نه؛ کاربر را گمراه
  // می‌کرد که «امروز منتشر شد» درحالی‌که فقط تاریخِ سیستم بود.
  const lastUpdateDisplay = release?.publishedAt
    ? (lang !== "fa"
        ? new Date(release.publishedAt).toLocaleDateString(numLocale(lang), { year: "numeric", month: "long", day: "numeric" })
        : isoToJalaliDisplay(release.publishedAt.slice(0, 10)))
    : "—";

  const buildDisplay = typeof __BUILD_TIME__ !== "undefined"
    ? (lang !== "fa"
        ? new Date(__BUILD_TIME__).toLocaleString(numLocale(lang), { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
        : `${isoToJalaliDisplay(__BUILD_TIME__.slice(0, 10))} - ${new Date(__BUILD_TIME__).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`)
    : "—";

  const Row = ({ label, value, ltr }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${THEME.border}`, gap: 12 }}>
      <span style={{ fontSize: 12, color: THEME.text3, fontWeight: 600, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: THEME.text, fontWeight: 600, direction: ltr ? "ltr" : dir, textAlign: dir === "rtl" ? "left" : "right" }}>{value}</span>
    </div>
  );

  // با createPortal مستقیم روی document.body رندر می‌شود (نه در جایِ
  // فراخوانی‌اش، داخلِ هدرِ چسبان). چون هدر backdropFilter دارد (GLASS_BLUR
  // در styles.topBar)، هر توضیحِ position:fixed داخلِ آن، به‌جایِ کلِ
  // viewport، محدود به کادرِ کوچکِ هدر می‌ماند — دقیقاً همان چیزی که باعث
  // می‌شد این پنل پشتِ کارت‌های صفحه‌ی «خانه» بیفتد (چون اصلاً تا آنجا
  // ادامه پیدا نمی‌کرد، نه اینکه واقعاً «پشتِ» چیزی رندر شود).
  return createPortal(
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 4000, background: "rgba(6,17,26,0.55)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", overflowY: "auto", direction: dir, fontFamily: THEME.font }}
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
        <h2 style={{ margin: 0, fontSize: 19, direction: "ltr", color: THEME.heading, fontWeight: 700 }}>{appearance?.systemName || APP_NAME}</h2>
        <p style={{ color: THEME.text3, fontSize: 12.5, marginTop: 4, marginBottom: 18, fontWeight: 500 }}>{t("aboutFullTitleValue")}</p>

        {/* وضعیت به‌روزرسانی */}
        <div style={{
          borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 12.5, fontWeight: 700,
          background: updateAvailable ? THEME.warnBg : THEME.okBg,
          color: updateAvailable ? THEME.warn : THEME.ok,
        }}>
          {checking ? t("commonLoading") : updateAvailable
            ? t("aboutNewVersionAvailable")
            : t("aboutUpToDate")}
        </div>

        {/* وضعیت هم‌گام‌سازی: زمانِ آخرین موفقیت + فهرستِ صفِ فعلی با تلاشِ
            مجددِ تکی/همگانی — تا کاربر دقیقاً بداند چه چیزی هنوز ارسال نشده. */}
        <div style={{
          borderRadius: 10, padding: "10px 14px", marginBottom: 14, textAlign: dir === "rtl" ? "right" : "left",
          background: problemItems.length ? THEME.dangerBg : pendingItems.length ? THEME.warnBg : THEME.okBg,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: pendingItems.length ? 8 : 0 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: problemItems.length ? THEME.danger : pendingItems.length ? THEME.warn : THEME.ok, display: "flex", alignItems: "center", gap: 6 }}>
              {syncing
                ? <RefreshCw size={13} style={{ animation: "ihms-spin 1s linear infinite" }} />
                : problemItems.length ? <AlertTriangle size={13} /> : null}
              {pendingItems.length === 0 ? t("onlineIndQueueEmpty") : t("onlineIndQueueCount", { n: pendingItems.length.toLocaleString(numLocale(lang)) })}
            </span>
            {problemItems.length > 0 && (
              <button
                type="button"
                onClick={handleRetryAll}
                disabled={retryingAll || !online}
                style={{
                  display: "flex", alignItems: "center", gap: 4, background: "transparent", border: `1px solid ${THEME.danger}`,
                  color: THEME.danger, borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 700,
                  cursor: retryingAll || !online ? "default" : "pointer", opacity: retryingAll || !online ? 0.5 : 1, fontFamily: THEME.font,
                }}
              >
                <RotateCcw size={11} /> {t("onlineIndRetryAll")}
              </button>
            )}
          </div>

          <div style={{ fontSize: 11, color: THEME.text3, marginBottom: pendingItems.length ? 8 : 0 }}>
            {t("onlineIndLastSyncLabel")}: {formatRelativeTime(t, lastSyncAt, lang)}
          </div>

          {pendingItems.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 190, overflowY: "auto" }}>
              {pendingItems.map((item) => {
                const moduleKey = QUEUE_MODULE_LABEL_KEYS[item.module];
                const moduleLabel = moduleKey ? t(moduleKey) : item.module;
                const actionKey = QUEUE_ACTION_LABEL_KEYS[item.action];
                const isProblem = item.status === "failed" || item.status === "conflict";
                return (
                  <div key={item.queueId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, background: "rgba(255,255,255,0.5)", borderRadius: 8, padding: "6px 9px" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: THEME.heading, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {moduleLabel} — {actionKey ? t(actionKey) : item.action}
                      </div>
                      <div style={{ fontSize: 10.5, color: isProblem ? THEME.danger : THEME.text3 }}>
                        {isProblem ? (item.lastError || t(item.status === "conflict" ? "syncBadgeConflict" : "syncBadgeFailed")) : t("syncBadgePending")}
                      </div>
                    </div>
                    {isProblem && (
                      <button
                        type="button"
                        onClick={() => handleRetryOne(item.queueId)}
                        disabled={retryingId === item.queueId || !online}
                        style={{
                          flexShrink: 0, background: THEME.danger, color: "#fff", border: "none", borderRadius: 7,
                          padding: "4px 9px", fontSize: 10.5, fontWeight: 700, cursor: retryingId === item.queueId || !online ? "default" : "pointer",
                          opacity: retryingId === item.queueId || !online ? 0.6 : 1, fontFamily: THEME.font,
                        }}
                      >
                        {retryingId === item.queueId ? t("onlineIndRetrying") : t("onlineIndRetryOne")}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ textAlign: dir === "rtl" ? "right" : "left" }}>
          <Row label={t("aboutCurrentVersion")} value={`${APP_VERSION} (build ${APP_VERSION_CODE})`} ltr />
          <Row
            label={t("aboutLatestVersion")}
            value={release ? `${release.version} (build ${release.versionCode})` : (checking ? "…" : "—")}
            ltr
          />
          <Row label={t("aboutLastUpdate")} value={lastUpdateDisplay} />
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
    </div>,
    document.body
  );
}
