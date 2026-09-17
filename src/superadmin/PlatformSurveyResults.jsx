import React, { useEffect, useMemo, useState } from "react";
import { Users, Star } from "lucide-react";
import { THEME, styles } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { loadPlatformSurveyResponses } from "./superAdminApi.js";
import { toJalaliDateTime } from "../personnel/jalaliDate.jsx";

const ROLE_LABEL_KEYS = { EMPLOYER: "roleLabelEmployer", HSE_SUPERVISOR: "roleLabelHseSupervisor", CONTRACTOR: "roleLabelContractor" };

export default function PlatformSurveyResults({ survey, onBack }) {
  const { t, dir } = useLanguage();
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    loadPlatformSurveyResponses(survey.id).then((rows) => { setResponses(rows); setLoading(false); });
  }, [survey.id]);

  const filtered = useMemo(() => {
    return responses.filter((r) => {
      if (roleFilter && r.respondentRole !== roleFilter) return false;
      if (fromDate && new Date(r.submittedAt) < new Date(fromDate)) return false;
      if (toDate && new Date(r.submittedAt) > new Date(`${toDate}T23:59:59`)) return false;
      return true;
    });
  }, [responses, roleFilter, fromDate, toDate]);

  const questions = [...(survey.questions || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
  const total = filtered.length;

  return (
    <div dir={dir}>
      <div style={styles.backLink} onClick={onBack}>{t("commonBack")}</div>

      <h3 style={{ fontSize: 15, fontWeight: 800, color: THEME.heading, margin: "0 0 4px" }}>{survey.title}</h3>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: THEME.text2, marginBottom: 16 }}>
        <Users size={14} /> {t("psResponseCount", { count: total })}
      </div>

      {survey.kind !== "public" && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          <select style={styles.filterSelect} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} dir={dir}>
            <option value="">{t("psFilterAllRoles")}</option>
            {["EMPLOYER", "HSE_SUPERVISOR", "CONTRACTOR"].map((r) => <option key={r} value={r}>{t(ROLE_LABEL_KEYS[r])}</option>)}
          </select>
          <input type="date" style={styles.filterSelect} value={fromDate} onChange={(e) => setFromDate(e.target.value)} dir="ltr" />
          <input type="date" style={styles.filterSelect} value={toDate} onChange={(e) => setToDate(e.target.value)} dir="ltr" />
        </div>
      )}

      {loading ? (
        <p style={{ fontSize: 12.5, color: THEME.text3 }}>{t("commonLoading")}</p>
      ) : total === 0 ? (
        <p style={{ fontSize: 12.5, color: THEME.text3 }}>{t("psNoResponses")}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {questions.map((q) => (
            <QuestionResult key={q.id} question={q} responses={filtered} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}

function QuestionResult({ question, responses, t }) {
  const answered = responses.filter((r) => {
    const v = r.answers?.[question.id];
    return v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0);
  });

  return (
    <div style={{ ...styles.card, width: "100%", margin: 0, padding: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: THEME.heading, marginBottom: 10 }}>{question.label}</div>
      {question.type === "text" ? (
        answered.length === 0 ? <p style={{ fontSize: 11.5, color: THEME.text3 }}>{t("psNoAnswersYet")}</p> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {answered.map((r) => (
              <div key={r.id} style={{ padding: "8px 10px", background: THEME.bg, borderRadius: 8, fontSize: 12, color: THEME.text2, lineHeight: 1.8 }}>
                {r.answers[question.id]}
                <div style={{ fontSize: 10, color: THEME.text3, marginTop: 4 }}>{toJalaliDateTime(r.submittedAt)}</div>
              </div>
            ))}
          </div>
        )
      ) : question.type === "rating" ? (
        <RatingResult answered={answered} question={question} t={t} />
      ) : (
        <OptionsResult answered={answered} question={question} t={t} />
      )}
    </div>
  );
}

function RatingResult({ answered, question, t }) {
  if (answered.length === 0) return <p style={{ fontSize: 11.5, color: THEME.text3 }}>{t("psNoAnswersYet")}</p>;
  const sum = answered.reduce((s, r) => s + (Number(r.answers[question.id]) || 0), 0);
  const avg = sum / answered.length;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <div style={{ display: "flex", gap: 2 }}>
        {[1, 2, 3, 4, 5].map((n) => <Star key={n} size={16} color={THEME.warn} fill={avg >= n - 0.5 ? THEME.warn : "none"} />)}
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, color: THEME.heading }}>{avg.toFixed(1)} / 5</span>
      <span style={{ fontSize: 11, color: THEME.text3 }}>{t("psResponseCount", { count: answered.length })}</span>
    </div>
  );
}

function OptionsResult({ answered, question, t }) {
  const options = Array.isArray(question.options) && question.options.length > 0
    ? question.options
    : question.type === "yes_no" ? ["yes", "no"] : [];
  const total = answered.length;
  if (total === 0) return <p style={{ fontSize: 11.5, color: THEME.text3 }}>{t("psNoAnswersYet")}</p>;

  const counts = options.map((opt) => {
    const count = answered.filter((r) => {
      const v = r.answers[question.id];
      return Array.isArray(v) ? v.includes(opt) : v === opt;
    }).length;
    return { opt, count, pct: Math.round((count / total) * 100) };
  });

  const optLabel = (opt) => (question.type === "yes_no" ? (opt === "yes" ? t("psYes") : t("psNo")) : opt);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {counts.map(({ opt, count, pct }) => (
        <div key={opt}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: THEME.text2, marginBottom: 3 }}>
            <span>{optLabel(opt)}</span>
            <span>{t("psOptionStat", { count, pct })}</span>
          </div>
          <div style={{ height: 7, borderRadius: 4, background: THEME.bg, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: THEME.teal, borderRadius: 4 }} />
          </div>
        </div>
      ))}
    </div>
  );
}
