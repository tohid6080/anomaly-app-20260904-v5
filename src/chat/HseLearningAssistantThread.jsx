import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Send, Target } from "lucide-react";
import { styles, THEME } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { loadRecentAnomalyBrief } from "./hseLearningApi.js";
import { loadSurveys, buildSurveyLink } from "../survey/surveyApi.js";
import { pickRecommendedTopic, matchSurveyForTopic, answerQuestion } from "./hseLearningEngine.js";
import { TOPICS_BY_KEY } from "./hseLearningContent.js";

function nowLabel() {
  return new Date().toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" });
}

/**
 * «دستیار آموزشی HSE» — نسخهٔ اول، مبتنی بر قوانینِ محلی (نه یک مدلِ
 * زبانیِ واقعی؛ این تصمیمِ صریحِ کاربر برای شروع بود). گفتگو در حافظهٔ
 * همین کامپوننت می‌ماند و جایی ذخیره نمی‌شود — این یک مربیِ محاسبه‌شونده
 * است، نه یک مکالمهٔ واقعیِ چت که باید تاریخچه داشته باشد.
 *
 * موضوعِ آموزشیِ پیشنهادی از روی متنِ آزادِ آنومالی‌های واقعیِ اخیر تشخیص
 * داده می‌شود (بدون هیچ جدول یا ستونِ جدید در دیتابیس). دکمهٔ «شرکت در
 * آزمون» فقط وقتی نمایش داده می‌شود که یک آزمونِ فعالِ واقعی با عنوانِ
 * مرتبط در ماژولِ «نظرسنجی و آزمون HSE» پیدا شود — هیچ نمره یا وضعیتِ
 * شخصی‌ای جعل نمی‌شود، چون آن ماژول پاسخ‌ها را با لینکِ عمومی (نه هویتِ
 * حساب) ذخیره می‌کند.
 */
export default function HseLearningAssistantThread({ currentUser, onBack }) {
  const { t, dir } = useLanguage();
  const isContractor = currentUser?.role === "CONTRACTOR";
  const [loading, setLoading] = useState(true);
  const [recommendedSurvey, setRecommendedSurvey] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [anomalies, surveys] = await Promise.all([
        loadRecentAnomalyBrief(isContractor && currentUser?.name ? { contractorName: currentUser.name } : {}).catch(() => []),
        loadSurveys().catch(() => []),
      ]);
      if (!alive) return;
      const { topic, matchCount } = pickRecommendedTopic(anomalies);
      const survey = matchSurveyForTopic(topic, surveys);
      setRecommendedSurvey(survey);
      setMessages([buildGreetingMessage(t, currentUser, isContractor, topic, matchCount, survey)]);
      setLoading(false);
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.username]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleAsk = (question) => {
    const q = (question || "").trim();
    if (!q) return;
    const mine = { who: "mine", text: q, time: nowLabel() };
    const { text: ruleText } = answerQuestion(q);
    const reply = { who: "ai", text: ruleText || t("hlaFallbackReply"), time: nowLabel() };
    setMessages((prev) => [...prev, mine, reply]);
    setInput("");
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 720, margin: "0 auto", padding: 24, textAlign: "center", color: THEME.text3 }}>
        {t("commonLoading")}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 24, display: "flex", flexDirection: "column", height: "calc(100vh - 48px)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={styles.backLink} onClick={onBack}>{t("commonBack")}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: "auto" }}>
          <div style={{ width: 26, height: 26, borderRadius: 8, background: `linear-gradient(140deg, ${THEME.teal}, #7c6cf0)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Sparkles size={13} color="#fff" />
          </div>
          <span style={{ fontWeight: 700, color: THEME.heading, fontSize: 14.5 }}>{t("hlaTitle")}</span>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", background: THEME.bg, borderRadius: 10, padding: 14, marginBottom: 10 }}>
        {messages.map((m, i) => (
          <MessageBubble key={i} m={m} t={t} onOpenExam={(survey) => window.open(buildSurveyLink(survey.publicToken), "_blank", "noopener")} onAsk={handleAsk} />
        ))}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
        {Object.values(TOPICS_BY_KEY).filter((tp) => tp.key !== "general").map((tp) => (
          <button
            key={tp.key} type="button" onClick={() => handleAsk(tp.sampleQuestion)}
            style={{ background: THEME.tealSoft, color: THEME.tealDeep, border: `1px solid ${THEME.teal}`, borderRadius: 999, padding: "5px 11px", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: THEME.font }}
          >
            {tp.sampleQuestion}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          style={{ ...styles.input, flex: 1 }} placeholder={t("hlaComposerPlaceholder")} value={input}
          onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAsk(input)} dir={dir}
        />
        <button type="button" style={{ ...styles.smallButton, padding: "9px 14px" }} onClick={() => handleAsk(input)} disabled={!input.trim()}>
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}

function buildGreetingMessage(t, currentUser, isContractor, topic, matchCount, survey) {
  const name = currentUser?.name || "";
  let text;
  if (matchCount > 0) {
    text = t(isContractor ? "hlaGreetingPersonal" : "hlaGreetingCompany", { name, count: matchCount, topic: topic.label });
  } else {
    text = t(isContractor ? "hlaGreetingPersonalNone" : "hlaGreetingCompanyNone", { name });
  }
  return { who: "ai", text, time: nowLabel(), lesson: topic, survey };
}

function MessageBubble({ m, t, onOpenExam, onAsk }) {
  const isMine = m.who === "mine";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start", marginBottom: 12 }}>
      {!isMine && <span style={{ fontSize: 10.5, color: THEME.text3, marginBottom: 2, display: "flex", alignItems: "center", gap: 4 }}><Sparkles size={11} color={THEME.teal} /> {t("hlaAiSenderTag")}</span>}
      <div style={{
        maxWidth: "85%", background: isMine ? THEME.teal : "#fff", color: isMine ? "#fff" : THEME.text, borderRadius: 12,
        padding: "10px 13px", border: isMine ? "none" : `1px solid ${THEME.border}`,
        borderInlineStart: isMine ? undefined : `3px solid ${THEME.teal}`,
      }}>
        {m.text && <div style={{ fontSize: 13, lineHeight: 1.85, whiteSpace: "pre-wrap" }}>{m.text}</div>}

        {m.lesson && (
          <div style={{ marginTop: 9, background: "rgba(20,184,166,0.06)", border: `1px solid ${THEME.border}`, borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <b style={{ fontSize: 12.5, color: THEME.heading }}>📘 {m.lesson.lessonTitle}</b>
              <span style={{ fontSize: 10, color: THEME.text3 }}>{m.lesson.readTimeLabel}</span>
            </div>
            {m.lesson.steps.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: i < m.lesson.steps.length - 1 ? 7 : 0 }}>
                <span style={{ flex: "none", width: 18, height: 18, borderRadius: "50%", background: THEME.tealSoft, color: THEME.tealDeep, fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</span>
                <p style={{ margin: 0, fontSize: 12, color: THEME.text2, lineHeight: 1.8 }}>{s}</p>
              </div>
            ))}

            {m.lesson.relatedTopicKeys?.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 9 }}>
                {m.lesson.relatedTopicKeys.map((key) => {
                  const rt = TOPICS_BY_KEY[key];
                  if (!rt) return null;
                  return (
                    <span key={key} onClick={() => onAsk(rt.sampleQuestion)} style={{ fontSize: 10.5, color: THEME.text3, border: `1px solid ${THEME.border}`, borderRadius: 999, padding: "3px 9px", cursor: "pointer" }}>
                      {rt.label}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {m.lesson && (
          m.survey ? (
            <button
              type="button" onClick={() => onOpenExam(m.survey)}
              style={{ marginTop: 9, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: `linear-gradient(120deg, ${THEME.teal}, #7c6cf0)`, color: "#fff", border: "none", borderRadius: 9, padding: "9px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: THEME.font }}
            >
              <Target size={13} /> {t("hlaCtaBtn", { title: m.survey.title })}
            </button>
          ) : (
            <p style={{ marginTop: 9, fontSize: 11, color: THEME.text3 }}>{t("hlaNoExamYet")}</p>
          )
        )}
      </div>
      <span style={{ fontSize: 9.5, color: THEME.text3, marginTop: 3 }}>{m.time}</span>
    </div>
  );
}
