import React, { useEffect, useState } from "react";
import { Plus, Copy, QrCode, Lock, Unlock, Trash2, Pencil, BarChart3, ClipboardList, Send } from "lucide-react";
import { THEME, styles } from "../shared.js";
import { toJalaliSafe } from "../personnel/jalaliDate.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import {
  loadSurveys, createSurvey, duplicateSurvey, deleteSurvey, setSurveyStatus,
  buildSurveyLink, surveyQrUrl,
} from "./surveyApi.js";
import SurveyBuilder from "./SurveyBuilder.jsx";
import SurveyResults from "./SurveyResults.jsx";
import SurveyDistribute from "./SurveyDistribute.jsx";
import { SURVEY_TEMPLATES, buildFromTemplate } from "./surveyTemplates.js";

export default function SurveyDashboard({ currentUser, role, onBack, wide, readOnly }) {
  const { t, dir } = useLanguage();
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list");        // list | build | results
  const [active, setActive] = useState(null);       // selected survey
  const [linkFor, setLinkFor] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = async () => { setLoading(true); setSurveys(await loadSurveys()); setLoading(false); };
  useEffect(() => { load(); }, []);

  const openBuild = (s) => { setActive(s); setView("build"); };
  const openResults = (s) => { setActive(s); setView("results"); };
  const openDistribute = (s) => { setActive(s); setView("distribute"); };

  const handleNew = async (templateId) => {
    setBusy(true); setErr(""); setShowNew(false);
    const payload = templateId ? buildFromTemplate(templateId) : { title: "" };
    const res = await createSurvey(payload || { title: "" }, currentUser?.name);
    setBusy(false);
    if (res?.__error) { setErr(res.message); return; }
    await load();
    openBuild(res);
  };

  const toggleStatus = async (s) => {
    const next = s.status === "active" ? "closed" : "active";
    if (next === "active" && (!s.questions || s.questions.length === 0)) { setErr(t("svErrNeedQuestions")); return; }
    const res = await setSurveyStatus(s.id, next);
    if (res?.__error) { setErr(res.message); return; }
    await load();
  };

  const handleDuplicate = async (s) => {
    const res = await duplicateSurvey(s.id, currentUser?.name);
    if (res?.__error) { setErr(res.message); return; }
    await load();
  };

  const handleDelete = async (s) => {
    if (!window.confirm(t("svConfirmDelete", { title: s.title || t("svUntitled") }))) return;
    const res = await deleteSurvey(s.id);
    if (res?.__error) { setErr(res.message); return; }
    await load();
  };

  const copyLink = (token) => { navigator.clipboard?.writeText(buildSurveyLink(token)); alert(t("svLinkCopied")); };

  if (view === "build" && active) {
    return <SurveyBuilder survey={surveys.find((s) => s.id === active.id) || active} currentUser={currentUser} wide={wide}
      onBack={() => { setView("list"); load(); }} onSaved={load} />;
  }
  if (view === "results" && active) {
    return <SurveyResults survey={surveys.find((s) => s.id === active.id) || active} wide={wide} onBack={() => { setView("list"); load(); }} onChanged={load} />;
  }
  if (view === "distribute" && active) {
    return <SurveyDistribute survey={surveys.find((s) => s.id === active.id) || active} wide={wide} onBack={() => { setView("list"); load(); }} onSaved={load} />;
  }

  return (
    <div style={wide ? { direction: dir } : { maxWidth: 900, margin: "0 auto", padding: 24, direction: dir }}>
      {onBack && <div style={styles.backLink} onClick={onBack}>{t("commonBack")}</div>}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <ClipboardList size={17} color={THEME.tealDeep} />
        <h3 style={{ margin: 0, color: THEME.heading, fontSize: 15, fontWeight: 800 }}>{t("moduleHseSurvey")}</h3>
      </div>
      <p style={{ color: THEME.text3, fontSize: 12, margin: "2px 0 14px", lineHeight: 1.8 }}>{t("svIntro")}</p>
      {err && <p style={styles.error}>{err}</p>}

      {!readOnly && (
        <button type="button" onClick={() => setShowNew((v) => !v)} disabled={busy} style={{ ...styles.smallButton, display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
          <Plus size={13} /> {t("svNewSurvey")}
        </button>
      )}

      {showNew && !readOnly && (
        <div style={{ ...styles.cardWide, marginBottom: 16 }}>
          <b style={{ fontSize: 12.5, color: THEME.heading }}>{t("svNewFrom")}</b>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8, marginTop: 10 }}>
            <button type="button" onClick={() => handleNew(null)} style={tplCard(THEME)}>
              <span style={{ fontWeight: 800, fontSize: 12.5, color: THEME.heading }}>{t("svBlankSurvey")}</span>
              <span style={{ fontSize: 10.5, color: THEME.text3 }}>{t("svBlankSurveyHint")}</span>
            </button>
            {SURVEY_TEMPLATES.map((tp) => (
              <button key={tp.id} type="button" onClick={() => handleNew(tp.id)} style={tplCard(THEME)}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 8.5, fontWeight: 800, padding: "1px 6px", borderRadius: 999, background: tp.kind === "exam" ? THEME.warnBg : THEME.tealSoft, color: tp.kind === "exam" ? THEME.warn : THEME.tealDeep }}>
                    {tp.kind === "exam" ? t("svModeExam") : t("svModeSurvey")}
                  </span>
                  <span style={{ fontWeight: 800, fontSize: 12.5, color: THEME.heading }}>{tp.name.fa}</span>
                </span>
                <span style={{ fontSize: 10, color: THEME.text3 }}>{t("svTemplateReady", { n: tp.build().questions.length })}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {linkFor && (
        <div style={{ background: THEME.okBg, border: `1px solid ${THEME.ok}`, borderRadius: 10, padding: 16, marginBottom: 16, textAlign: "center" }}>
          <p style={{ fontSize: 12.5, color: THEME.ok, fontWeight: 700, marginBottom: 10 }}>{t("svLinkQrNote")}</p>
          <img src={surveyQrUrl(linkFor)} alt="QR" style={{ borderRadius: 8, background: "#fff", padding: 8, marginBottom: 10 }} />
          <div style={{ display: "flex", gap: 8, justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
            <code style={{ fontSize: 11, background: THEME.surface, padding: "6px 10px", borderRadius: 6, wordBreak: "break-all", direction: "ltr" }}>{buildSurveyLink(linkFor)}</code>
            <button type="button" style={{ ...styles.smallButton, display: "inline-flex", alignItems: "center", gap: 5 }} onClick={() => copyLink(linkFor)}><Copy size={12} /> {t("svCopyLink")}</button>
          </div>
          <button type="button" style={{ ...styles.smallButton, background: THEME.text3, marginTop: 10 }} onClick={() => setLinkFor(null)}>{t("commonClose")}</button>
        </div>
      )}

      {loading && <p style={{ color: THEME.text3, textAlign: "center", padding: 20 }}>{t("commonLoading")}</p>}
      {!loading && surveys.length === 0 && <p style={{ color: THEME.text3, textAlign: "center", padding: 20 }}>{t("svNoSurveys")}</p>}

      {surveys.map((s) => (
        <div key={s.id} style={{ ...styles.card, width: "auto", marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, color: THEME.heading, fontSize: 13 }}>{s.title || t("svUntitled")}</div>
              <div style={{ fontSize: 11, color: THEME.text3, marginTop: 3 }}>
                {t("svRowMeta", { n: (s.questions || []).length, r: s.responseCount, date: toJalaliSafe(s.updatedAt || s.createdAt) })}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: 10, padding: "3px 9px", borderRadius: 999, fontWeight: 800,
                background: s.settings?.mode === "exam" ? THEME.warnBg : THEME.tealSoft,
                color: s.settings?.mode === "exam" ? THEME.warn : THEME.tealDeep }}>
                {s.settings?.mode === "exam" ? t("svModeExam") : t("svModeSurvey")}
              </span>
              <span style={{ fontSize: 10.5, padding: "3px 10px", borderRadius: 999, fontWeight: 700,
                background: s.status === "active" ? THEME.okBg : s.status === "closed" ? THEME.surface2 : THEME.warnBg,
                color: s.status === "active" ? THEME.ok : s.status === "closed" ? THEME.text3 : THEME.warn }}>
                {t("svStatus_" + s.status)}
              </span>
              {!readOnly && <button type="button" style={iconBtn(THEME.navyMid)} onClick={() => openBuild(s)}><Pencil size={11} /> {t("svEdit")}</button>}
              <button type="button" style={iconBtn(THEME.navyMid)} onClick={() => openResults(s)}><BarChart3 size={11} /> {t("svResults")}</button>
              {s.status !== "draft" && <button type="button" style={iconBtn(THEME.tealDeep)} onClick={() => setLinkFor(s.publicToken)}><QrCode size={11} /> {t("svLink")}</button>}
              {!readOnly && s.status === "active" && <button type="button" style={iconBtn(THEME.navyMid)} onClick={() => openDistribute(s)}><Send size={11} /> {t("svDistribute")}</button>}
              {!readOnly && (
                <button type="button" style={iconBtn(s.status === "active" ? THEME.danger : THEME.ok)} onClick={() => toggleStatus(s)}>
                  {s.status === "active" ? <Lock size={11} /> : <Unlock size={11} />} {s.status === "active" ? t("svClose") : t("svActivate")}
                </button>
              )}
              {!readOnly && <button type="button" style={iconBtn(THEME.surface2, THEME.text2)} onClick={() => handleDuplicate(s)}><Copy size={11} /></button>}
              {!readOnly && <button type="button" style={iconBtn(THEME.surface2, THEME.danger)} onClick={() => handleDelete(s)}><Trash2 size={11} /></button>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

const iconBtn = (bg, fg) => ({
  ...styles.smallButton, fontSize: 11, background: bg, color: fg || "#fff",
  display: "inline-flex", alignItems: "center", gap: 4,
});
const tplCard = (THEME) => ({
  display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start", textAlign: "start",
  border: `1px solid ${THEME.border}`, background: "transparent", borderRadius: 10, padding: "10px 12px",
  cursor: "pointer", fontFamily: THEME.font,
});
