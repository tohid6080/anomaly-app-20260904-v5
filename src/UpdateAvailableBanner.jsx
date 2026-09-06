import React, { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { Download, X, ArrowUpCircle } from "lucide-react";
import { THEME } from "./shared.js";
import { useLanguage } from "./i18n/LanguageContext.jsx";
import { loadLatestPublishedRelease, isNewerThanCurrent } from "./superadmin/appReleaseApi.js";
import { resolveLatestApkUrl, openApkDownload } from "./appDownload.js";

// بررسی خودکارِ نسخه در اپ موبایل (فقط native — روی وب هیچ چیزی رندر
// نمی‌شود). اگر آخرین نسخه‌ی «منتشرشده» در جدول app_releases از نسخه‌ی
// نصب‌شده جدیدتر باشد، یک نوار «نسخه جدید موجود است» با دکمه‌ی دانلود
// نمایش داده می‌شود. رد کردن (×) فقط برای همان version_code ذخیره می‌شود،
// پس با انتشار نسخه‌ی بعدی دوباره ظاهر می‌شود.
const DISMISS_KEY = "ihms_update_dismissed_code";

export default function UpdateAvailableBanner() {
  const { t } = useLanguage();
  const [release, setRelease] = useState(null);
  const [apkUrl, setApkUrl] = useState("");
  const [dismissedCode, setDismissedCode] = useState(() => {
    try { return Number(localStorage.getItem(DISMISS_KEY)) || 0; } catch { return 0; }
  });

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let alive = true;
    const check = () => loadLatestPublishedRelease().then((r) => {
      if (!alive) return;
      setRelease(r);
      if (r) resolveLatestApkUrl(r.effectiveDownloadUrl || "").then((u) => { if (alive) setApkUrl(u); });
    }).catch(() => {});
    check();
    // یک بررسی دوباره هر ۶ ساعت، در صورتی که اپ مدت طولانی باز بماند.
    const interval = setInterval(check, 6 * 60 * 60 * 1000);
    return () => { alive = false; clearInterval(interval); };
  }, []);

  if (!Capacitor.isNativePlatform()) return null;
  if (!isNewerThanCurrent(release)) return null;
  if (release.versionCode === dismissedCode) return null;

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(release.versionCode)); } catch { /* بی‌اهمیت */ }
    setDismissedCode(release.versionCode);
  };

  const url = apkUrl || release.effectiveDownloadUrl;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
      background: "#fef3c7", borderBottom: "1px solid #fde68a", color: "#92400e",
      padding: "10px 14px", fontSize: 12.5, fontWeight: 600,
    }}>
      <ArrowUpCircle size={16} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1, minWidth: 160 }}>{t("updateBannerNewVersion", { version: release.version })}</span>
      {url && (
        <button
          type="button" onClick={() => openApkDownload(url)}
          style={{ display: "inline-flex", alignItems: "center", gap: 5, background: THEME.teal, color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: THEME.font }}
        >
          <Download size={13} /> {t("updateBannerDownload")}
        </button>
      )}
      <button
        type="button" onClick={dismiss} title={t("updateBannerDismiss")}
        style={{ background: "none", border: "none", cursor: "pointer", color: "#92400e", display: "flex", flexShrink: 0 }}
      >
        <X size={15} />
      </button>
    </div>
  );
}
