import React, { useEffect, useMemo, useState } from "react";
import BackLink from "../shared/BackLink.jsx";
import { Users, Star } from "lucide-react";
import { THEME, styles } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { loadPlatformSurveyResponses } from "./superAdminApi.js";
import { toJalaliDateTime, JalaliDateInput } from "../personnel/jalaliDate.jsx";

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
      <BackLink onClick={onBack}>{t("commonBack")}</BackLink>

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
          <JalaliDateInput value={fromDate} onChange={setFromDate} allowEmpty />
          <JalaliDateInput value={toDate} onChange={setToDate} allowEmpty />
        </div>
      )}

      {loading ? (
        <p style={{ fontSize: 12.5, color: THEME.text3 }}>{t("commonLoading")}</p>
      ) : total === 0 ? (
        <p style={{ fontSize: 12.5, color: THEME.text3 }}>{t("psNoResponses")}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {questions.map((q, idx) => (
            <QuestionResult key={q.id} question={q} index={idx} responses={filtered} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}

function QuestionResult({ question, index, responses, t }) {
  const answered = responses.filter((r) => {
    const v = r.answers?.[question.id];
    return v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0);
  });

  return (
    <div style={{ ...styles.card, width: "100%", margin: 0, padding: 0, overflow: "hidden" }}>
      {/* نوارِ سرتیترِ هر سؤال — عددِ ردیف + رنگِ متمایزِ خودش، تا حتی وقتی
          چند کارتِ سؤال پشتِ‌هم می‌آیند، معلوم باشد هر درصدی مالِ کدام سؤال است */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: THEME.tealSoft, borderBottom: `1px solid ${THEME.borderStrong}` }}>
        <span style={{
          width: 22, height: 22, borderRadius: "50%", background: THEME.teal, color: "#06231f", fontSize: 11.5, fontWeight: 800,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          {index + 1}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: THEME.teal }}>{question.label}</div>
          <div style={{ fontSize: 10.5, color: THEME.text3, marginTop: 1 }}>{t("psAnsweredCount", { count: answered.length })}</div>
        </div>
      </div>
      <div style={{ padding: 14 }}>
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
      <span style={{ fontSize: 16, fontWeight: 800, color: THEME.teal }}>{avg.toFixed(1)} / 5</span>
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4, gap: 8 }}>
            <span style={{ fontSize: 12, color: THEME.text2, fontWeight: 600 }}>{optLabel(opt)}</span>
            <span style={{ display: "flex", alignItems: "baseline", gap: 5, flexShrink: 0 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: THEME.teal }}>{t("psPercentValue", { pct })}</span>
              <span style={{ fontSize: 10, color: THEME.text3 }}>{t("psOptionCount", { count })}</span>
            </span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: THEME.bg, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: THEME.teal, borderRadius: 4 }} />
          </div>
        </div>
      ))}
    </div>
  );
}
