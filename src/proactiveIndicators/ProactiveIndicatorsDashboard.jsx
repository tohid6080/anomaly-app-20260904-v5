import React, { useState, useEffect } from "react";
import { ChevronRight, TrendingUp, ClipboardList, BookOpen, X } from "lucide-react";
import { styles, THEME } from "../shared.js";
import { toJalaliSafe } from "../personnel/jalaliDate.jsx";
import { loadActiveIndicators, loadAllAssessments, accidentPronenessLevel } from "./proactiveIndicatorsApi.js";
import { loadModuleConfig, isSeededModuleLabel } from "../systemConfigApi.js";
import { loadCorrectiveActionsForAssessments, STATUS_META } from "../correctiveActions/correctiveActionsApi.js";
import AccidentPronenessAssessmentForm from "./AccidentPronenessAssessmentForm.jsx";
import HseClimateCampaignManager from "./HseClimateCampaignManager.jsx";
import SbsSubmodule from "./SbsSubmodule.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";

// لایه‌ی تمام‌صفحه‌ی «راهنمای اجرایی» — فایل استاتیک public/hse_guide.html
// را داخل یک iframe نشان می‌دهد و همیشه یک دکمه‌ی × برای بستن دارد
// (روی موبایل، بازکردن با target=_blank راه خروج نداشت).
function HseGuideOverlay({ onClose }) {
  const { t } = useLanguage();
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 3000, background: "#fff", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: `1px solid ${THEME.border}`, background: THEME.surface, flexShrink: 0 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: THEME.navy }}>
          <BookOpen size={15} color={THEME.teal} /> {t("pidGuideTitle")}
        </span>
        <button
          type="button" onClick={onClose} title={t("pidGuideCloseTitle")}
          style={{ display: "flex", alignItems: "center", gap: 5, border: "none", cursor: "pointer", fontFamily: THEME.font, fontSize: 12, fontWeight: 700, color: "#fff", background: THEME.navy, padding: "7px 14px", borderRadius: 8 }}
        >
          <X size={15} /> {t("commonClose")}
        </button>
      </div>
      <iframe
        src={`${import.meta.env.BASE_URL}hse_guide.html`}
        title={t("pidGuideIframeTitle")}
        style={{ flex: 1, width: "100%", border: "none" }}
      />
    </div>
  );
}

/**
 * نقطه‌ی ورود ماژول — طراحی Dynamic: لیست شاخص‌ها از دیتابیس خوانده می‌شود
 * (نه هاردکد)، و فقط شاخص‌های فعال‌شده برای همین شرکت نشان داده می‌شوند
 * (company_proactive_settings). افزودن یک شاخص جدید در آینده فقط با درج
 * در دیتابیس + یک شاخه‌ی رندر مشابه اینجا لازم است.
 *
 * اگر focusPersonnelId داده شده باشد (از پرونده‌ی پرسنل)، مستقیم فرم
 * ارزیابی استعداد حادثه‌پذیری را برای همان پرسنل باز می‌کند.
 */
export default function ProactiveIndicatorsDashboard({ onBack, currentUser, role, readOnly, focusPersonnelId, focusJobTitle, focusPersonnelName }) {
  const { t, dir } = useLanguage();
  const [indicators, setIndicators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState(focusPersonnelId ? "form" : "list"); // list | results | form
  const [activeIndicatorKey, setActiveIndicatorKey] = useState(focusPersonnelId ? "accident_proneness" : null);
  // عنوان ماژول از همان منبع مشترکِ «پیکربندی سامانه» خوانده می‌شود تا
  // اگر SuperAdmin نام ماژول را عوض کند، این صفحه هم (در موبایل و دسکتاپ)
  // همان نام را نشان بدهد — نه یک رشته‌ی هاردکدشده.
  const [moduleTitle, setModuleTitle] = useState("");
  // راهنمای اجرایی به‌صورت یک لایه‌ی تمام‌صفحه‌ی داخل خودِ اپ باز می‌شود
  // (نه tab جدید با target=_blank) تا در موبایل هم همیشه یک راه خروج/بستن
  // با دکمه‌ی × داشته باشد.
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    loadActiveIndicators().then((rows) => { setIndicators(rows); setLoading(false); });
    loadModuleConfig().then((cfg) => {
      const label = cfg?.find((c) => c.moduleKey === "proactiveIndicators")?.displayLabel;
      if (label && !isSeededModuleLabel("proactiveIndicators", label)) setModuleTitle(label);
    }).catch(() => {});
  }, []);

  if (view === "form" && activeIndicatorKey === "accident_proneness") {
    return (
      <AccidentPronenessAssessmentForm
        personnelId={focusPersonnelId}
        jobTitle={focusJobTitle}
        personnelName={focusPersonnelName}
        currentUser={currentUser}
        onBack={() => { if (focusPersonnelId) { onBack(); } else { setView("results"); } }}
        onSaved={() => { if (focusPersonnelId) { onBack(); } else { setView("results"); } }}
      />
    );
  }

  if (view === "results" && activeIndicatorKey === "hse_climate") {
    return <HseClimateCampaignManager currentUser={currentUser} role={role} onBack={() => setView("list")} />;
  }

  if (view === "results" && activeIndicatorKey === "sbs") {
    return <SbsSubmodule currentUser={currentUser} role={role} readOnly={readOnly} onBack={() => setView("list")} />;
  }

  if (view === "results" && activeIndicatorKey) {
    return (
      <ResultsList
        indicatorKey={activeIndicatorKey}
        indicatorName={indicators.find((i) => i.key === activeIndicatorKey)?.name || ""}
        currentUser={currentUser}
        onBack={() => setView("list")}
      />
    );
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: 24, direction: dir }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div style={styles.backLink} onClick={onBack}>{t("commonBackToMenu")}</div>
        <button
          type="button" onClick={() => setShowGuide(true)}
          style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: THEME.teal, border: "none", cursor: "pointer", fontFamily: THEME.font, background: THEME.tealSoft, padding: "7px 14px", borderRadius: 8 }}
        >
          <BookOpen size={14} /> {t("pidGuideTitle")}
        </button>
      </div>
      {showGuide && <HseGuideOverlay onClose={() => setShowGuide(false)} />}
      <h3 style={{ marginBottom: 4, color: THEME.navy }}>{moduleTitle || t("pidModuleTitle")}</h3>
      <p style={{ color: THEME.text3, fontSize: 12.5, marginTop: 0, marginBottom: 16 }}>
        {t("pidModuleDesc")}
      </p>

      {loading && <p style={{ color: THEME.text3, textAlign: "center", padding: 20 }}>{t("commonLoading")}</p>}
      {!loading && indicators.length === 0 && (
        <p style={{ color: THEME.text3, textAlign: "center", padding: 20 }}>
          {t("pidNoIndicatorsActive")}
        </p>
      )}

      {indicators.map((ind) => (
        <div
          key={ind.key}
          onClick={() => { setActiveIndicatorKey(ind.key); setView("results"); }}
          style={{ ...styles.card, width: "auto", marginBottom: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <TrendingUp size={20} color={THEME.teal} />
            <div>
              <div style={{ fontWeight: 700, color: THEME.navy, fontSize: 14 }}>{ind.name}</div>
              {ind.description && <div style={{ fontSize: 11.5, color: THEME.text3, marginTop: 3 }}>{ind.description}</div>}
            </div>
          </div>
          <ChevronRight size={18} color={THEME.text3} style={{ transform: "rotate(180deg)" }} />
        </div>
      ))}
    </div>
  );
}

// ---------- نتایج استعداد حادثه‌پذیری — جدول شخص‌محور ----------
function ResultsList({ indicatorKey, indicatorName, currentUser, onBack }) {
  const { t, dir } = useLanguage();
  const [rows, setRows] = useState(null);
  const [caByAssessment, setCaByAssessment] = useState({});

  useEffect(() => {
    loadAllAssessments(indicatorKey).then((data) => {
      setRows(data);
      loadCorrectiveActionsForAssessments(data.map((r) => r.id)).then(setCaByAssessment);
    });
  }, [indicatorKey]);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 24, direction: dir }}>
      <div style={styles.backLink} onClick={onBack}>{t("commonBack")}</div>
      <h3 style={{ marginBottom: 4, color: THEME.navy, display: "flex", alignItems: "center", gap: 8 }}>
        <ClipboardList size={18} /> {t("pidResultsOf", { name: indicatorName })}
      </h3>
      <p style={{ color: THEME.text3, fontSize: 12, marginTop: 0, marginBottom: 16 }}>
        {t("pidNewAssessmentNote")}
      </p>

      {rows === null && <p style={{ color: THEME.text3, textAlign: "center", padding: 20 }}>{t("commonLoading")}</p>}
      {rows !== null && rows.length === 0 && <p style={{ color: THEME.text3, textAlign: "center", padding: 20 }}>{t("pidNoAssessmentsYet")}</p>}

      {rows && rows.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr style={{ borderBottom: `1.5px solid ${THEME.border}`, color: THEME.text3 }}>
                <th style={{ textAlign: dir === "rtl" ? "right" : "left", padding: "8px" }}>{t("pidColCompany")}</th>
                <th style={{ textAlign: dir === "rtl" ? "right" : "left", padding: "8px" }}>{t("pidColPersonnel")}</th>
                <th style={{ textAlign: "center", padding: "8px" }}>{t("pidColJob")}</th>
                <th style={{ textAlign: "center", padding: "8px" }}>{t("commonDate")}</th>
                <th style={{ textAlign: "center", padding: "8px" }}>{t("pidColAssessor")}</th>
                <th style={{ textAlign: "center", padding: "8px" }}>{t("pidColFinalScore")}</th>
                <th style={{ textAlign: "center", padding: "8px" }}>{t("pidColLevel")}</th>
                <th style={{ textAlign: "center", padding: "8px" }}>{t("pidColApprovalStatus")}</th>
                <th style={{ textAlign: "center", padding: "8px" }}>{t("pidColCorrectiveAction")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ borderBottom: `1px solid ${THEME.border}` }}>
                  <td style={{ padding: "8px", fontWeight: 600 }}>{currentUser?.companyName || "—"}</td>
                  <td style={{ padding: "8px", fontWeight: 600 }}>{r.personnelName}</td>
                  <td style={{ padding: "8px", textAlign: "center" }}>{r.jobTitle}</td>
                  <td style={{ padding: "8px", textAlign: "center" }}>{toJalaliSafe(r.assessmentDate)}</td>
                  <td style={{ padding: "8px", textAlign: "center" }}>{r.assessorName}</td>
                  <td style={{ padding: "8px", textAlign: "center", fontWeight: 700, color: THEME.navy }}>{r.finalScore}</td>
                  <td style={{ padding: "8px", textAlign: "center" }}>
                    {indicatorKey === "accident_proneness" && r.finalScore != null ? (() => {
                      const lv = accidentPronenessLevel(r.finalScore);
                      return <span style={{ fontSize: 10.5, padding: "3px 10px", borderRadius: 999, background: lv.bg, color: lv.color, fontWeight: 700 }}>{lv.level}</span>;
                    })() : "—"}
                  </td>
                  <td style={{ padding: "8px", textAlign: "center" }}>
                    <span style={{ fontSize: 10.5, padding: "3px 10px", borderRadius: 999, background: r.status === "completed" ? "#dcfce7" : "#fef3c7", color: r.status === "completed" ? "#166534" : "#b45309", fontWeight: 600 }}>
                      {r.status === "completed" ? t("pidStatusCompletedSent") : (r.status || "—")}
                    </span>
                  </td>
                  <td style={{ padding: "8px", textAlign: "center" }}>
                    {caByAssessment[r.id] ? (
                      <span style={{ fontSize: 10.5, padding: "3px 10px", borderRadius: 999, background: STATUS_META[caByAssessment[r.id].status]?.bg || "#eef1f5", color: STATUS_META[caByAssessment[r.id].status]?.color || THEME.text3, fontWeight: 600 }}>
                        {caByAssessment[r.id].actionNumber} — {STATUS_META[caByAssessment[r.id].status]?.label || caByAssessment[r.id].status}
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: THEME.text3 }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------- نتایج HSE Climate اکنون کاملاً از طریق HseClimateCampaignManager
// (لینک/QR ناشناس + نتیجه‌ی تجمیعی) مدیریت می‌شود — این تابع قدیمی مربوط
// به مدل قبلیِ خودارزیابی نام‌دار بود و دیگر استفاده نمی‌شود.
