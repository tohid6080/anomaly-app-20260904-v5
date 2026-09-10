import React, { useEffect, useMemo, useState } from "react";
import { Download, Printer, RefreshCw, Trash2 } from "lucide-react";
import { THEME, styles } from "../shared.js";
import { toJalaliSafe } from "../personnel/jalaliDate.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { loadSurveyResponses, deleteSurveyResponse } from "./surveyApi.js";
import { summarizeQuestion, isAnswerable, CHOICE_TYPES, SCORABLE_TYPES } from "./surveyModel.js";

const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

function isCorrect(q, a) {
  const correct = Array.isArray(q.config?.correct) ? q.config.correct : [];
  if (correct.length === 0) return null;
  if (q.type === "multi_choice") {
    const got = Array.isArray(a) ? a : [];
    return got.length === correct.length && correct.every((c) => got.includes(c));
  }
  return a != null && a === correct[0];
}

export default function SurveyResults({ survey, onBack, wide }) {
  const { t, dir, lang } = useLanguage();
  const [responses, setResponses] = useState(null);
  const isExam = survey.settings?.mode === "exam";
  const [tab, setTab] = useState(isExam ? "scores" : "summary"); // summary | responses | scores

  const load = async () => setResponses(await loadSurveyResponses(survey.id));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [survey.id]);

  const questions = survey.questions || [];
  const answerable = questions.filter(isAnswerable);

  const optLabel = (q, id) => (q.config?.options || []).find((o) => o.id === id)?.label || id;

  const removeResponse = async (id) => {
    if (!window.confirm(t("svConfirmDeleteResponse"))) return;
    const res = await deleteSurveyResponse(id);
    if (!res?.__error) load();
  };

  const examStats = useMemo(() => {
    if (!responses || !isExam) return null;
    const scored = responses.filter((r) => r.percent != null);
    if (scored.length === 0) return { count: 0 };
    const pcts = scored.map((r) => r.percent);
    return {
      count: scored.length,
      avg: Math.round(pcts.reduce((a, b) => a + b, 0) / scored.length),
      passRate: Math.round((scored.filter((r) => r.passed).length / scored.length) * 100),
      high: Math.max(...pcts),
      low: Math.min(...pcts),
    };
  }, [responses, isExam]);

  const csv = useMemo(() => {
    if (!responses) return "";
    const head = ["#", t("svColSubmittedAt"),
      ...(isExam ? [t("svColName"), t("svColPercent"), t("svColResult")] : []),
      ...answerable.map((q) => (q.title || q.id))];
    const cell = (v) => {
      const s = v == null ? "" : Array.isArray(v) ? v.join(" | ") : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = responses.map((r, i) => [
      i + 1, toJalaliSafe(r.submittedAt),
      ...(isExam ? [
        r.respondentMeta?.name || "",
        r.percent != null ? r.percent + "%" : "",
        r.passed == null ? "" : r.passed ? t("svExamPassed") : t("svExamFailed"),
      ] : []),
      ...answerable.map((q) => {
        const a = r.answers[q.id];
        if (CHOICE_TYPES.includes(q.type)) return (Array.isArray(a) ? a : a ? [a] : []).map((id) => optLabel(q, id)).join(" | ");
        if (q.type === "yes_no") return a === "yes" ? t("commonYes") : a === "no" ? t("commonNo") : "";
        return a ?? "";
      }),
    ].map(cell).join(","));
    return [head.map(cell).join(","), ...lines].join("\n");
  }, [responses, answerable, lang]);

  const downloadCsv = () => {
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `survey-${survey.id}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div style={wide ? { direction: dir } : { maxWidth: 900, margin: "0 auto", padding: 24, direction: dir }}>
      {onBack && <div style={styles.backLink} onClick={onBack}>{t("commonBack")}</div>}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <h3 style={{ margin: 0, color: THEME.heading, fontSize: 15, fontWeight: 800 }}>{survey.title || t("svUntitled")}</h3>
        <span style={{ fontSize: 12, color: THEME.text3 }}>· {t("svResponsesN", { n: responses ? responses.length : survey.responseCount })}</span>
        <div style={{ marginInlineStart: "auto", display: "flex", gap: 6 }}>
          <button type="button" onClick={load} style={{ ...styles.smallButton, background: THEME.surface2, color: THEME.text, display: "inline-flex", alignItems: "center", gap: 5 }}><RefreshCw size={12} /> {t("svRefresh")}</button>
          <button type="button" onClick={downloadCsv} disabled={!responses?.length} style={{ ...styles.smallButton, background: THEME.surface2, color: THEME.text, opacity: responses?.length ? 1 : 0.5, display: "inline-flex", alignItems: "center", gap: 5 }}><Download size={12} /> CSV</button>
          <button type="button" onClick={() => window.print()} style={{ ...styles.smallButton, background: THEME.surface2, color: THEME.text, display: "inline-flex", alignItems: "center", gap: 5 }}><Printer size={12} /> {t("svPrint")}</button>
        </div>
      </div>

      <div style={{ display: "inline-flex", background: THEME.surface2, border: `1px solid ${THEME.border}`, borderRadius: 9, padding: 3, gap: 3, marginBottom: 14 }}>
        {[...(isExam ? [["scores", t("svTabScores")]] : []), ["summary", t("svTabSummary")], ["responses", t("svTabResponses")]].map(([k, lbl]) => (
          <button key={k} type="button" onClick={() => setTab(k)}
            style={{ border: "none", borderRadius: 7, padding: "6px 14px", fontFamily: THEME.font, fontSize: 12, fontWeight: 700, cursor: "pointer",
              background: tab === k ? THEME.teal : "transparent", color: tab === k ? "#fff" : THEME.text2 }}>{lbl}</button>
        ))}
      </div>

      {responses === null && <p style={{ color: THEME.text3, textAlign: "center", padding: 20 }}>{t("commonLoading")}</p>}
      {responses && responses.length === 0 && <p style={{ color: THEME.text3, textAlign: "center", padding: 20 }}>{t("svNoResponses")}</p>}

      {responses && responses.length > 0 && tab === "scores" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginBottom: 14 }}>
            <Kpi label={t("svKpiPassRate")} value={examStats?.count ? examStats.passRate + "%" : "—"} tone={examStats && examStats.passRate >= (survey.settings?.passScore || 60) ? THEME.ok : THEME.warn} />
            <Kpi label={t("svKpiAvg")} value={examStats?.count ? examStats.avg + "%" : "—"} />
            <Kpi label={t("svKpiHigh")} value={examStats?.count ? examStats.high + "%" : "—"} />
            <Kpi label={t("svKpiLow")} value={examStats?.count ? examStats.low + "%" : "—"} />
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
              <thead><tr>
                <th style={thS}>#</th>{survey.settings?.collectName && <th style={thS}>{t("svColName")}</th>}
                <th style={thS}>{t("svColSubmittedAt")}</th><th style={thS}>{t("svColPercent")}</th><th style={thS}>{t("svColResult")}</th>
              </tr></thead>
              <tbody>
                {responses.map((r, i) => (
                  <tr key={r.id}>
                    <td style={tdS}>{i + 1}</td>
                    {survey.settings?.collectName && <td style={tdS}>{r.respondentMeta?.name || "—"}</td>}
                    <td style={tdS}>{toJalaliSafe(r.submittedAt)}</td>
                    <td style={{ ...tdS, fontFamily: MONO, fontWeight: 700, color: r.passed ? THEME.ok : THEME.danger }}>{r.percent != null ? r.percent + "%" : "—"}</td>
                    <td style={tdS}>
                      {r.passed == null ? "—" : (
                        <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 999, background: r.passed ? THEME.okBg : THEME.dangerBg, color: r.passed ? THEME.ok : THEME.danger }}>
                          {r.passed ? t("svExamPassed") : t("svExamFailed")}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h4 style={{ fontSize: 12.5, fontWeight: 800, color: THEME.heading, margin: "18px 0 8px" }}>{t("svPerQuestionCorrect")}</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {answerable.filter((q) => SCORABLE_TYPES.includes(q.type) && (q.config?.correct || []).length > 0).map((q, qi) => {
              const graded = responses.filter((r) => r.answers[q.id] != null);
              const right = graded.filter((r) => isCorrect(q, r.answers[q.id])).length;
              const pct = graded.length ? Math.round((right / graded.length) * 100) : 0;
              return <Bar key={q.id} label={`${qi + 1}. ${q.title || q.id}`} count={right} pct={pct} />;
            })}
          </div>
        </div>
      )}

      {responses && responses.length > 0 && tab === "summary" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {answerable.map((q, qi) => {
            const s = summarizeQuestion(q, responses);
            return (
              <div key={q.id} style={{ ...styles.card, width: "auto" }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: THEME.heading, marginBottom: 8 }}>
                  <span style={{ color: THEME.text3, fontFamily: MONO, marginInlineEnd: 6 }}>{qi + 1}.</span>{q.title || q.id}
                </div>
                {s.kind === "choice" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {(q.config?.options || []).map((o) => {
                      const c = s.counts[o.id] || 0;
                      const pct = s.total ? Math.round((c / s.total) * 100) : 0;
                      return <Bar key={o.id} label={o.label || "—"} count={c} pct={pct} />;
                    })}
                  </div>
                )}
                {s.kind === "yesno" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <Bar label={t("commonYes")} count={s.yes} pct={s.total ? Math.round((s.yes / s.total) * 100) : 0} />
                    <Bar label={t("commonNo")} count={s.no} pct={s.total ? Math.round((s.no / s.total) * 100) : 0} />
                  </div>
                )}
                {s.kind === "numeric" && (
                  <div style={{ fontSize: 12, color: THEME.text2 }}>
                    {t("svAvg")}: <b style={{ color: THEME.heading, fontFamily: MONO }}>{s.avg != null ? s.avg.toFixed(2) : "—"}</b>
                    <span style={{ color: THEME.text3, marginInlineStart: 10 }}>{t("svRangeMinMax", { min: s.min ?? "—", max: s.max ?? "—", n: s.count })}</span>
                  </div>
                )}
                {s.kind === "text" && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {s.values.length === 0 && <span style={{ fontSize: 11.5, color: THEME.text3 }}>—</span>}
                    {s.values.map((v, i) => <span key={i} style={{ fontSize: 11.5, background: THEME.surface2, border: `1px solid ${THEME.border}`, borderRadius: 6, padding: "3px 8px", color: THEME.text2 }}>{String(v)}</span>)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {responses && responses.length > 0 && tab === "responses" && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
            <thead>
              <tr>
                <th style={thS}>#</th><th style={thS}>{t("svColSubmittedAt")}</th>
                {answerable.map((q, i) => <th key={q.id} style={thS}>{i + 1}</th>)}
                <th style={thS} />
              </tr>
            </thead>
            <tbody>
              {responses.map((r, i) => (
                <tr key={r.id}>
                  <td style={tdS}>{i + 1}</td>
                  <td style={tdS}>{toJalaliSafe(r.submittedAt)}</td>
                  {answerable.map((q) => {
                    const a = r.answers[q.id];
                    let text = "";
                    if (CHOICE_TYPES.includes(q.type)) text = (Array.isArray(a) ? a : a ? [a] : []).map((id) => optLabel(q, id)).join("، ");
                    else if (q.type === "yes_no") text = a === "yes" ? t("commonYes") : a === "no" ? t("commonNo") : "";
                    else text = a == null ? "" : String(a);
                    return <td key={q.id} style={tdS} title={text}>{text.length > 40 ? text.slice(0, 40) + "…" : text}</td>;
                  })}
                  <td style={tdS}><button type="button" onClick={() => removeResponse(r.id)} style={{ border: "none", background: "transparent", color: THEME.danger, cursor: "pointer" }}><Trash2 size={13} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, tone }) {
  return (
    <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 10, padding: "10px 12px" }}>
      <div style={{ fontSize: 10.5, color: THEME.text3, fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, fontFamily: MONO, color: tone || THEME.heading, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function Bar({ label, count, pct }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: THEME.text2, marginBottom: 2 }}>
        <span>{label}</span><span style={{ fontFamily: MONO }}>{count} · {pct}%</span>
      </div>
      <div style={{ height: 8, background: THEME.surface2, borderRadius: 999, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: THEME.teal }} />
      </div>
    </div>
  );
}

const thS = { textAlign: "start", fontSize: 10, fontWeight: 800, color: THEME.text3, padding: "5px 7px", borderBottom: `1px solid ${THEME.border}`, whiteSpace: "nowrap" };
const tdS = { padding: "5px 7px", borderBottom: `1px solid ${THEME.borderSoft}`, color: THEME.text2 };
