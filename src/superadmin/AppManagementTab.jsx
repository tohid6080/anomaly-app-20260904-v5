import React, { useEffect, useState } from "react";
import { Eye, EyeOff, Home, LayoutGrid, Bell, Settings, BarChart3, MessageCircle, Archive, ShieldCheck, AlertTriangle, Users, Truck, Tag, TrendingUp, ShieldAlert, ClipboardList, FileSpreadsheet } from "lucide-react";
import { THEME, styles } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { loadLandingPageContent, saveLandingPageContent, loadMobileTabDefault, saveMobileTabDefault } from "../systemConfigApi.js";
import { LANDING_BUTTONS_DEFAULT } from "../LandingPage.jsx";

// همان فهرستِ کاندیدهایِ نوارِ پایینِ موبایل در App.jsx (mobileTabMeta) —
// اینجا مستقل تکرار شده تا باندلِ پنلِ سوپرادمین وابسته به کلِ App.jsx
// نشود؛ کلیدها/labelKeyها باید با mobileTabMeta هماهنگ بمانند.
const MOBILE_TAB_CANDIDATES = [
  { key: "menu", labelKey: "mobTabHome", icon: Home },
  { key: "operationalDashboard", labelKey: "mobTabOpsDash", icon: ClipboardList },
  { key: "modules", labelKey: "mobTabModules", icon: LayoutGrid },
  { key: "notifications", labelKey: "mobTabAlerts", icon: Bell },
  { key: "profile", labelKey: "mobTabSettings", icon: Settings },
  { key: "managementDashboard", labelKey: "mobTabMgmtDash", icon: BarChart3 },
  { key: "chat", labelKey: "moduleChat", icon: MessageCircle },
  { key: "archiveManagement", labelKey: "moduleArchive", icon: Archive },
  { key: "systemManagement", labelKey: "moduleSystemManagement", icon: Settings },
  { key: "anomalyReport", labelKey: "moduleAnomalyReport", icon: AlertTriangle },
  { key: "personnelAccess", labelKey: "modulePersonnelAccess", icon: Users },
  { key: "machineryManagement", labelKey: "moduleMachinery", icon: Truck },
  { key: "scaffoldManagement", labelKey: "moduleScaffold", icon: Tag },
  { key: "riskAssessment", labelKey: "moduleRiskAssessment", icon: ShieldCheck },
  { key: "proactiveIndicators", labelKey: "moduleProactiveIndicators", icon: TrendingUp },
  { key: "incidentManagement", labelKey: "moduleIncidentManagement", icon: ShieldAlert },
  { key: "hseSurvey", labelKey: "moduleHseSurvey", icon: ClipboardList },
  { key: "permitToWork", labelKey: "modulePermitToWork", icon: FileSpreadsheet },
];
const MOBILE_TAB_DEFAULT_FALLBACK = ["menu", "operationalDashboard", "modules", "notifications"];
const MOBILE_TAB_MAX = 5;
const MOBILE_TAB_MIN = 2;

/**
 * «مدیریت اپلیکیشن» — زیرماژولِ تازه و مستقل از «مدیریت صفحه اصلی سامانه».
 * دو چیزِ کاملاً متفاوت را کنترل می‌کند که هیچ‌کدام واقعاً «محتوای صفحه
 * فرود» نیستند، بلکه رفتارِ کلِ اپلیکیشن‌اند:
 *   ۱) نمایش/عدمِ نمایشِ دکمه‌ی «درخواست ارزیابی و پلن آزمایشی» — همان
 *      buttons.loginTrialRequest که قبلاً داخلِ تبِ «صفحه اصلی» بود؛ از
 *      همان system_settings (landing_page_content) می‌خواند/می‌نویسد تا
 *      چیزی در LandingPage.jsx/App.jsx نشکند — فقط محلِ ویرایشش عوض شده.
 *   ۲) چیدمانِ پیش‌فرضِ نوارِ پایینِ موبایل بعد از ورود — فقط «حالتِ اولیه»
 *      برایِ کاربرانی که هنوز شخصی‌سازی نکرده‌اند؛ همین که کاربر از
 *      «تنظیمات» خودش چیدمان را عوض کند، انتخابِ خودش همیشه اولویت دارد.
 */
export default function AppManagementTab({ currentAdmin }) {
  const { t, dir } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [trialBtnOn, setTrialBtnOn] = useState(true);
  const [fullLandingContent, setFullLandingContent] = useState(null);
  const [savingBtn, setSavingBtn] = useState(false);
  const [btnMsg, setBtnMsg] = useState("");

  const [tabDraft, setTabDraft] = useState(MOBILE_TAB_DEFAULT_FALLBACK);
  const [tabBaseline, setTabBaseline] = useState(MOBILE_TAB_DEFAULT_FALLBACK);
  const [savingTabs, setSavingTabs] = useState(false);
  const [tabMsg, setTabMsg] = useState("");

  useEffect(() => {
    (async () => {
      const [landing, tabDefault] = await Promise.all([loadLandingPageContent(), loadMobileTabDefault()]);
      const buttons = { ...LANDING_BUTTONS_DEFAULT, ...(landing?.buttons || {}) };
      setFullLandingContent({ ...(landing || {}), buttons });
      setTrialBtnOn(buttons.loginTrialRequest !== false);
      const validTabs = Array.isArray(tabDefault) ? tabDefault.filter((k) => MOBILE_TAB_CANDIDATES.some((c) => c.key === k)) : null;
      const initTabs = validTabs && validTabs.length >= MOBILE_TAB_MIN ? validTabs : MOBILE_TAB_DEFAULT_FALLBACK;
      setTabDraft(initTabs);
      setTabBaseline(initTabs);
      setLoading(false);
    })();
  }, []);

  const handleSaveTrialBtn = async (nextVal) => {
    setTrialBtnOn(nextVal);
    setSavingBtn(true); setBtnMsg("");
    const patched = { ...fullLandingContent, buttons: { ...fullLandingContent.buttons, loginTrialRequest: nextVal } };
    const res = await saveLandingPageContent(patched, currentAdmin?.fullName);
    setSavingBtn(false);
    if (res?.__error) { setBtnMsg(res.message); setTrialBtnOn(!nextVal); return; }
    setFullLandingContent(patched);
    setBtnMsg(t("commonSavedDone"));
    setTimeout(() => setBtnMsg(""), 2200);
  };

  const toggleTab = (key) => {
    setTabDraft((prev) => {
      if (prev.includes(key)) {
        if (prev.length <= MOBILE_TAB_MIN) return prev;
        return prev.filter((k) => k !== key);
      }
      if (prev.length >= MOBILE_TAB_MAX) return prev;
      return [...prev, key];
    });
  };

  const isTabsDirty = JSON.stringify(tabDraft) !== JSON.stringify(tabBaseline);
  const handleSaveTabs = async () => {
    setSavingTabs(true); setTabMsg("");
    const res = await saveMobileTabDefault(tabDraft, currentAdmin?.fullName);
    setSavingTabs(false);
    if (res?.__error) { setTabMsg(res.message); return; }
    setTabBaseline(tabDraft);
    setTabMsg(t("commonSavedDone"));
    setTimeout(() => setTabMsg(""), 2200);
  };

  if (loading) return <p style={{ fontSize: 12, color: THEME.text3, textAlign: "center", padding: 20 }}>{t("commonLoading")}</p>;

  return (
    <div style={{ direction: dir }}>
      <Section title={t("amSecTrialBtnTitle")}>
        <p style={{ fontSize: 11.5, color: THEME.text3, marginBottom: 12, lineHeight: 1.8 }}>{t("amSecTrialBtnDesc")}</p>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 2px" }}>
          <span style={{ flex: 1, fontSize: 12.5, color: THEME.text, fontWeight: 600 }}>{t("lpBtn_loginTrialRequest")}</span>
          <button type="button" disabled={savingBtn} onClick={() => handleSaveTrialBtn(!trialBtnOn)}
            style={{ display: "flex", alignItems: "center", gap: 5, background: trialBtnOn ? THEME.okBg : THEME.surface2, color: trialBtnOn ? THEME.ok : THEME.text3, border: "none", borderRadius: 999, padding: "6px 14px", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: THEME.font, opacity: savingBtn ? 0.6 : 1 }}>
            {trialBtnOn ? <Eye size={14} /> : <EyeOff size={14} />} {trialBtnOn ? t("saVisibleShown") : t("saHidden")}
          </button>
        </div>
        {btnMsg && <p style={{ fontSize: 11, color: btnMsg === t("commonSavedDone") ? THEME.ok : THEME.danger, marginTop: 6 }}>{btnMsg}</p>}
      </Section>

      <Section title={t("amSecMobileTabsTitle")}>
        <p style={{ fontSize: 11.5, color: THEME.text3, marginBottom: 12, lineHeight: 1.8 }}>{t("amSecMobileTabsDesc")}</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
          {MOBILE_TAB_CANDIDATES.map((c) => {
            const on = tabDraft.includes(c.key);
            return (
              <button key={c.key} type="button" onClick={() => toggleTab(c.key)}
                style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 9, cursor: "pointer",
                  border: `1.5px solid ${on ? THEME.teal : THEME.borderSoft}`, background: on ? THEME.tealSoft : THEME.surface2,
                  color: on ? THEME.teal : THEME.text2, fontFamily: THEME.font, fontSize: 12, fontWeight: on ? 700 : 500,
                }}>
                <c.icon size={15} /> {t(c.labelKey)}
              </button>
            );
          })}
        </div>
        <p style={{ fontSize: 10.5, color: THEME.text3, marginTop: 10 }}>{t("amMobileTabsCount", { n: tabDraft.length, min: MOBILE_TAB_MIN, max: MOBILE_TAB_MAX })}</p>
        {tabMsg && <p style={{ fontSize: 11, color: tabMsg === t("commonSavedDone") ? THEME.ok : THEME.danger, marginTop: 4 }}>{tabMsg}</p>}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
          <button type="button" onClick={handleSaveTabs} disabled={savingTabs || !isTabsDirty} style={{ ...styles.smallButton, background: THEME.teal, opacity: savingTabs || !isTabsDirty ? 0.55 : 1 }}>
            {savingTabs ? t("saSavingEllipsis") : t("saSaveChanges")}
          </button>
          {isTabsDirty && <span style={{ fontSize: 10.5, color: THEME.warn, fontWeight: 600 }}>●</span>}
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 10, padding: 14, marginBottom: 12 }}>
      <b style={{ fontSize: 12.5, color: THEME.heading, display: "block", marginBottom: 8 }}>{title}</b>
      {children}
    </div>
  );
}
