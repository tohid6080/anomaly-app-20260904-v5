import React, { useEffect, useState } from "react";
import { Plus, Trash2, Pencil, BarChart3, Play, Pause } from "lucide-react";
import { THEME, styles } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { loadPlatformSurveys, updatePlatformSurvey, deletePlatformSurvey } from "./superAdminApi.js";
import PlatformSurveyBuilder from "./PlatformSurveyBuilder.jsx";
import PlatformSurveyResults from "./PlatformSurveyResults.jsx";

/**
 * صفحه‌ی مدیریتِ «نظرسنجی‌های پلتفرم» در SuperAdmin — سه تبِ کاملاً
 * تفکیک‌شده (طبقِ خواستِ صریحِ کاربر) برایِ سه kind: بازدیدکنندگانِ سایت
 * (public)، کاربرانِ سامانه (welcome) و رویدادمحور (event). فهرست/ایجاد/
 * ویرایش/فعال‌سازی/بستن/حذف اینجا، سازندهٔ سؤال در PlatformSurveyBuilder،
 * نتایج در PlatformSurveyResults.
 */
const TABS = [
  { key: "public", labelKey: "psTabPublic" },
  { key: "welcome", labelKey: "psTabWelcome" },
  { key: "event", labelKey: "psTabEvent" },
];

const STATUS_LABEL_KEYS = { draft: "psStatusDraft", active: "psStatusActive", closed: "psStatusClosed" };
const STATUS_COLOR = { draft: THEME.text3, active: THEME.ok, closed: THEME.danger };

export default function PlatformSurveysPage({ currentAdmin }) {
  const { t, dir } = useLanguage();
  const [tab, setTab] = useState("public");
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // "new" | survey | null
  const [resultsFor, setResultsFor] = useState(null); // survey | null

  const load = () => {
    setLoading(true);
    loadPlatformSurveys(tab).then((rows) => { setSurveys(rows); setLoading(false); });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const handleDelete = async (s) => {
    if (!confirm(t("commonConfirmDeleteGeneric"))) return;
    const result = await deletePlatformSurvey(s.id);
    if (result?.__error) { alert(result.message); return; }
    load();
  };

  const handleToggleStatus = async (s) => {
    const nextStatus = s.status === "active" ? "closed" : "active";
    const result = await updatePlatformSurvey(s.id, { status: nextStatus });
    if (result?.__error) { alert(result.message); return; }
    load();
  };

  if (editing) {
    return (
      <PlatformSurveyBuilder
        kind={tab}
        survey={editing === "new" ? null : editing}
        currentAdmin={currentAdmin}
        onSaved={() => { setEditing(null); load(); }}
        onCancel={() => setEditing(null)}
      />
    );
  }

  if (resultsFor) {
    return <PlatformSurveyResults survey={resultsFor} onBack={() => setResultsFor(null)} />;
  }

  return (
    <div dir={dir}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 6 }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: THEME.heading, margin: 0 }}>{t("psPageTitle")}</h3>
        <button type="button" style={{ ...styles.smallButton, display: "flex", alignItems: "center", gap: 6 }} onClick={() => setEditing("new")}>
          <Plus size={14} /> {t("psNewSurvey")}
        </button>
      </div>

      <div style={{ display: "flex", gap: 6, margin: "14px 0", borderBottom: `1px solid ${THEME.border}`, paddingBottom: 8, flexWrap: "wrap" }}>
        {TABS.map((tb) => (
          <button
            key={tb.key} type="button" onClick={() => setTab(tb.key)}
            style={{ ...styles.smallButton, background: tab === tb.key ? THEME.teal : THEME.navyMid, opacity: tab === tb.key ? 1 : 0.75 }}
          >
            {t(tb.labelKey)}
          </button>
        ))}
      </div>

      <p style={{ fontSize: 11.5, color: THEME.text3, marginBottom: 14, lineHeight: 1.8 }}>{t(`psTabDesc_${tab}`)}</p>

      {loading ? (
        <p style={{ fontSize: 12.5, color: THEME.text3 }}>{t("commonLoading")}</p>
      ) : surveys.length === 0 ? (
        <p style={{ fontSize: 12.5, color: THEME.text3 }}>{t("psNoSurveys")}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {surveys.map((s) => (
            <div key={s.id} style={{ ...styles.card, width: "100%", margin: 0, padding: 14, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: THEME.heading }}>{s.title}</span>
                  <span style={{ fontSize: 10.5, padding: "2px 9px", borderRadius: 999, background: STATUS_COLOR[s.status] + "22", color: STATUS_COLOR[s.status], fontWeight: 700 }}>
                    {t(STATUS_LABEL_KEYS[s.status] || s.status)}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: THEME.text3 }}>{t("psQuestionCount", { count: s.questions.length })}</div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button type="button" style={{ ...styles.smallButton, background: THEME.navyMid, display: "flex", alignItems: "center", gap: 5 }} onClick={() => setResultsFor(s)}>
                  <BarChart3 size={13} /> {t("psViewResults")}
                </button>
                <button type="button" style={{ ...styles.smallButton, background: THEME.navyMid, display: "flex", alignItems: "center", gap: 5 }} onClick={() => setEditing(s)}>
                  <Pencil size={13} /> {t("commonEdit")}
                </button>
                <button
                  type="button"
                  style={{ ...styles.smallButton, background: s.status === "active" ? THEME.warn : THEME.ok, display: "flex", alignItems: "center", gap: 5 }}
                  onClick={() => handleToggleStatus(s)}
                >
                  {s.status === "active" ? <Pause size={13} /> : <Play size={13} />}
                  {s.status === "active" ? t("psCloseSurvey") : t("psActivateSurvey")}
                </button>
                <button type="button" style={{ ...styles.smallButton, background: THEME.danger, display: "flex", alignItems: "center", gap: 5 }} onClick={() => handleDelete(s)}>
                  <Trash2 size={13} /> {t("commonDelete")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
