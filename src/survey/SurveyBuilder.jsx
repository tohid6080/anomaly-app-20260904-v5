import React, { useMemo, useState } from "react";
import {
  Plus, Trash2, Copy, ChevronUp, ChevronDown, Save, Eye, EyeOff, Settings2,
  Type, AlignLeft, CircleDot, ListChecks, Hash, Calendar, Star, SlidersHorizontal, Heading, ToggleLeft, GripVertical,
} from "lucide-react";
import { THEME, styles } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { QUESTION_TYPES, CHOICE_TYPES, SCORABLE_TYPES, newQuestion, newOption, examHasScorable } from "./surveyModel.js";
import { saveSurvey } from "./surveyApi.js";
import SurveyRuntime from "./SurveyRuntime.jsx";

const ICONS = { Type, AlignLeft, CircleDot, ListChecks, ChevronDown, ToggleLeft, Star, SlidersHorizontal, Hash, Calendar, Heading };
const clone = (v) => JSON.parse(JSON.stringify(v ?? null));

export default function SurveyBuilder({ survey, onBack, onSaved, currentUser, wide }) {
  const { t, dir } = useLanguage();
  const mkInitial = () => ({
    title: survey.title || "", description: survey.description || "",
    questions: clone(survey.questions || []),
    settings: { anonymous: true, collectName: false, collectUnit: false, thankYouText: "", startAt: "", endAt: "", maxResponses: null, onePerDevice: true, ...(survey.settings || {}) },
  });
  const [draft, setDraft] = useState(mkInitial);
  const [base, setBase] = useState(mkInitial);
  const [selId, setSelId] = useState(survey.questions?.[0]?.id || null);
  const [preview, setPreview] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [pAnswers, setPAnswers] = useState({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(base), [draft, base]);

  const sel = draft.questions.find((q) => q.id === selId) || null;
  const isExam = draft.settings.mode === "exam";
  const toggleCorrect = (qid, oid, multi) => setQuestions((qs) => qs.map((q) => {
    if (q.id !== qid) return q;
    const cur = Array.isArray(q.config?.correct) ? q.config.correct : [];
    const next = multi ? (cur.includes(oid) ? cur.filter((x) => x !== oid) : [...cur, oid]) : [oid];
    return { ...q, config: { ...q.config, correct: next } };
  }));

  const setQuestions = (fn) => setDraft((d) => ({ ...d, questions: fn(d.questions) }));
  const patchQ = (id, patch) => setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  const patchCfg = (id, patch) => setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, config: { ...q.config, ...patch } } : q)));
  const addQ = (type) => {
    const q = newQuestion(type);
    setQuestions((qs) => [...qs, q]);
    setSelId(q.id);
    setPreview(false);
  };
  const removeQ = (id) => { setQuestions((qs) => qs.filter((q) => q.id !== id)); if (selId === id) setSelId(null); };
  const dupQ = (id) => setQuestions((qs) => {
    const i = qs.findIndex((q) => q.id === id);
    if (i < 0) return qs;
    const copy = { ...clone(qs[i]), id: newQuestion(qs[i].type).id };
    if (copy.config?.options) copy.config.options = copy.config.options.map((o) => ({ ...o, id: newOption().id }));
    const next = [...qs]; next.splice(i + 1, 0, copy); return next;
  });
  const moveQ = (id, dir_) => setQuestions((qs) => {
    const i = qs.findIndex((q) => q.id === id);
    const j = dir_ === "up" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= qs.length) return qs;
    const next = [...qs]; [next[i], next[j]] = [next[j], next[i]]; return next;
  });

  // option ops
  const addOpt = (qid) => patchCfg(qid, { options: [...(sel?.config?.options || []), newOption("")] });
  const setOpt = (qid, oid, label) => patchCfg(qid, { options: (sel?.config?.options || []).map((o) => (o.id === oid ? { ...o, label } : o)) });
  const delOpt = (qid, oid) => patchCfg(qid, { options: (sel?.config?.options || []).filter((o) => o.id !== oid) });

  const save = async () => {
    setBusy(true); setErr(""); setOk("");
    const res = await saveSurvey({ ...draft, id: survey.id });
    setBusy(false);
    if (res?.__error) { setErr(res.message); return; }
    setOk(t("svSaved"));
    setBase(clone(draft));
    onSaved && onSaved();
  };

  const typeLabel = (type) => t((QUESTION_TYPES.find((x) => x.type === type) || {}).labelKey || type);

  return (
    <div style={wide ? { direction: dir } : { maxWidth: 960, margin: "0 auto", padding: 20, direction: dir }}>
      {onBack && <div style={styles.backLink} onClick={onBack}>{t("commonBack")}</div>}

      {/* header */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
        <input style={{ ...styles.input, flex: "1 1 260px", fontSize: 15, fontWeight: 700 }} placeholder={t("svTitlePlaceholder")}
          value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} dir={dir} />
        <span style={{ fontSize: 10.5, fontWeight: 800, padding: "4px 10px", borderRadius: 999, background: THEME.surface2, color: THEME.text2 }}>
          {t("svStatus_" + (survey.status || "draft"))}
        </span>
        <button type="button" onClick={() => setPreview((v) => !v)} style={{ ...styles.smallButton, background: THEME.surface2, color: THEME.text, display: "inline-flex", alignItems: "center", gap: 5 }}>
          {preview ? <EyeOff size={13} /> : <Eye size={13} />} {preview ? t("svExitPreview") : t("svPreview")}
        </button>
        <button type="button" onClick={() => setShowSettings((v) => !v)} style={{ ...styles.smallButton, background: THEME.surface2, color: THEME.text, display: "inline-flex", alignItems: "center", gap: 5 }}>
          <Settings2 size={13} /> {t("svSettings")}
        </button>
        <button type="button" onClick={save} disabled={busy || !dirty} style={{ ...styles.smallButton, background: THEME.teal, opacity: busy || !dirty ? 0.55 : 1, display: "inline-flex", alignItems: "center", gap: 5 }}>
          <Save size={13} /> {t("svSave")}
        </button>
      </div>
      <textarea style={{ ...styles.input, minHeight: 48, resize: "vertical", marginBottom: 12 }} placeholder={t("svDescPlaceholder")}
        value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} dir={dir} />
      {err && <p style={styles.error}>{err}</p>}
      {ok && <p style={{ ...styles.error, color: THEME.ok }}>{ok}</p>}

      {showSettings && <SettingsPanel draft={draft} setDraft={setDraft} t={t} dir={dir} />}

      {preview ? (
        <div style={{ ...styles.cardWide }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: THEME.heading, margin: "0 0 4px" }}>{draft.title || t("svUntitled")}</h3>
          {draft.description && <p style={{ fontSize: 12.5, color: THEME.text2, margin: "0 0 14px", lineHeight: 1.9 }}>{draft.description}</p>}
          <SurveyRuntime questions={draft.questions} answers={pAnswers} onChange={(qid, v) => setPAnswers((a) => ({ ...a, [qid]: v }))} />
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: wide ? "minmax(0, 1fr) 320px" : "1fr", gap: 14, alignItems: "start" }}>
          {/* questions list */}
          <div style={{ ...styles.cardWide }}>
            {draft.questions.length === 0 && <p style={{ fontSize: 12.5, color: THEME.text3, textAlign: "center", padding: 18 }}>{t("svNoQuestions")}</p>}
            {draft.questions.map((q, i) => {
              const on = q.id === selId;
              return (
                <div key={q.id} onClick={() => setSelId(q.id)}
                  style={{ border: `1.5px solid ${on ? THEME.teal : THEME.border}`, background: on ? THEME.tealSoft : "transparent", borderRadius: 10, padding: "9px 11px", marginBottom: 8, cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <GripVertical size={13} color={THEME.text3} />
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: THEME.text, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {q.type === "section" ? "▸ " : `${countBefore(draft.questions, i)}. `}{q.title || t("svUntitledQuestion")}
                    </span>
                    <span style={{ fontSize: 9.5, fontWeight: 700, padding: "2px 7px", borderRadius: 999, background: THEME.surface2, color: THEME.text3 }}>{typeLabel(q.type)}</span>
                  </div>
                  <div style={{ display: "flex", gap: 4, marginTop: 6 }} onClick={(e) => e.stopPropagation()}>
                    <IconBtn onClick={() => moveQ(q.id, "up")} disabled={i === 0}><ChevronUp size={13} /></IconBtn>
                    <IconBtn onClick={() => moveQ(q.id, "down")} disabled={i === draft.questions.length - 1}><ChevronDown size={13} /></IconBtn>
                    <IconBtn onClick={() => dupQ(q.id)}><Copy size={12} /></IconBtn>
                    <IconBtn onClick={() => removeQ(q.id)} danger><Trash2 size={12} /></IconBtn>
                  </div>
                </div>
              );
            })}

            {/* palette */}
            <div style={{ borderTop: `1px solid ${THEME.border}`, marginTop: 10, paddingTop: 10 }}>
              <b style={{ fontSize: 11.5, color: THEME.text3 }}>{t("svAddQuestion")}</b>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                {QUESTION_TYPES.map((qt) => {
                  const Ic = ICONS[qt.icon] || Type;
                  return (
                    <button key={qt.type} type="button" onClick={() => addQ(qt.type)}
                      style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 10px", borderRadius: 8, border: `1px solid ${THEME.border}`, background: "transparent", color: THEME.text2, fontFamily: THEME.font, fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>
                      <Ic size={13} /> {t(qt.labelKey)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* inspector */}
          <div style={{ ...styles.cardWide }}>
            {!sel && <p style={{ fontSize: 12, color: THEME.text3, textAlign: "center", padding: 16 }}>{t("svSelectQuestion")}</p>}
            {sel && (
              <div>
                <b style={{ fontSize: 12, color: THEME.heading }}>{typeLabel(sel.type)}</b>
                <label style={styles.label}>{t("svQTitle")}</label>
                <input style={styles.input} value={sel.title} onChange={(e) => patchQ(sel.id, { title: e.target.value })} dir={dir} />
                <label style={styles.label}>{t("svQDesc")}</label>
                <textarea style={{ ...styles.input, minHeight: 44, resize: "vertical" }} value={sel.description || ""} onChange={(e) => patchQ(sel.id, { description: e.target.value })} dir={dir} />

                {sel.type !== "section" && (
                  <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: THEME.text2, margin: "10px 0" }}>
                    <input type="checkbox" checked={!!sel.required} onChange={(e) => patchQ(sel.id, { required: e.target.checked })} />
                    {t("svRequired")}
                  </label>
                )}

                {CHOICE_TYPES.includes(sel.type) && (
                  <div style={{ marginTop: 8 }}>
                    <label style={styles.label}>{t("svOptions")}</label>
                    {(sel.config?.options || []).map((o, oi) => (
                      <div key={o.id} style={{ display: "flex", gap: 6, marginBottom: 5 }}>
                        <input style={{ ...styles.input, flex: 1 }} value={o.label} placeholder={`${t("svOption")} ${oi + 1}`} onChange={(e) => setOpt(sel.id, o.id, e.target.value)} dir={dir} />
                        <IconBtn onClick={() => delOpt(sel.id, o.id)} danger disabled={(sel.config?.options || []).length <= 1}><Trash2 size={12} /></IconBtn>
                      </div>
                    ))}
                    <button type="button" onClick={() => addOpt(sel.id)} style={{ ...styles.smallButton, background: THEME.surface2, color: THEME.text, display: "inline-flex", alignItems: "center", gap: 5, marginTop: 4 }}>
                      <Plus size={12} /> {t("svAddOption")}
                    </button>
                  </div>
                )}

                {sel.type === "rating" && (
                  <div style={{ marginTop: 8 }}>
                    <label style={styles.label}>{t("svMaxStars")}</label>
                    <input type="number" min={2} max={10} style={styles.input} value={sel.config?.max ?? 5} onChange={(e) => patchCfg(sel.id, { max: Math.max(2, Math.min(10, Number(e.target.value) || 5)) })} dir="ltr" />
                  </div>
                )}

                {sel.type === "linear_scale" && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                    <div><label style={styles.label}>{t("svMin")}</label><input type="number" style={styles.input} value={sel.config?.min ?? 0} onChange={(e) => patchCfg(sel.id, { min: Number(e.target.value) || 0 })} dir="ltr" /></div>
                    <div><label style={styles.label}>{t("svMax")}</label><input type="number" style={styles.input} value={sel.config?.max ?? 10} onChange={(e) => patchCfg(sel.id, { max: Number(e.target.value) || 10 })} dir="ltr" /></div>
                    <div><label style={styles.label}>{t("svStep")}</label><input type="number" min={1} style={styles.input} value={sel.config?.step ?? 1} onChange={(e) => patchCfg(sel.id, { step: Math.max(1, Number(e.target.value) || 1) })} dir="ltr" /></div>
                    <div />
                    <div><label style={styles.label}>{t("svMinLabel")}</label><input style={styles.input} value={sel.config?.minLabel || ""} onChange={(e) => patchCfg(sel.id, { minLabel: e.target.value })} dir={dir} /></div>
                    <div><label style={styles.label}>{t("svMaxLabel")}</label><input style={styles.input} value={sel.config?.maxLabel || ""} onChange={(e) => patchCfg(sel.id, { maxLabel: e.target.value })} dir={dir} /></div>
                  </div>
                )}

                {sel.type === "number" && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                    <div><label style={styles.label}>{t("svMin")}</label><input type="number" style={styles.input} value={sel.config?.min ?? ""} onChange={(e) => patchCfg(sel.id, { min: e.target.value === "" ? null : Number(e.target.value) })} dir="ltr" /></div>
                    <div><label style={styles.label}>{t("svMax")}</label><input type="number" style={styles.input} value={sel.config?.max ?? ""} onChange={(e) => patchCfg(sel.id, { max: e.target.value === "" ? null : Number(e.target.value) })} dir="ltr" /></div>
                  </div>
                )}

                {(sel.type === "short_text" || sel.type === "long_text") && (
                  <div style={{ marginTop: 8 }}>
                    <label style={styles.label}>{t("svPlaceholder")}</label>
                    <input style={styles.input} value={sel.config?.placeholder || ""} onChange={(e) => patchCfg(sel.id, { placeholder: e.target.value })} dir={dir} />
                  </div>
                )}

                {isExam && SCORABLE_TYPES.includes(sel.type) && (
                  <div style={{ marginTop: 10, background: THEME.warnBg, border: `1px solid ${THEME.warn}44`, borderRadius: 9, padding: 10 }}>
                    <b style={{ fontSize: 11.5, color: THEME.warn }}>{t("svExamKey")}</b>
                    <div style={{ marginTop: 8 }}>
                      <label style={styles.label}>{t("svPoints")}</label>
                      <input type="number" min={0} step={0.5} style={{ ...styles.input, width: 100 }} value={sel.config?.points ?? 1}
                        onChange={(e) => patchCfg(sel.id, { points: Math.max(0, Number(e.target.value) || 0) })} dir="ltr" />
                    </div>
                    <label style={styles.label}>{t("svCorrectAnswer")}</label>
                    {sel.type === "yes_no" ? (
                      <div style={{ display: "flex", gap: 8 }}>
                        {[["yes", t("commonYes")], ["no", t("commonNo")]].map(([v, lbl]) => (
                          <label key={v} style={ckRow}>
                            <input type="radio" name={`correct-${sel.id}`} checked={(sel.config?.correct || [])[0] === v} onChange={() => toggleCorrect(sel.id, v, false)} /> {lbl}
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {(sel.config?.options || []).map((o, oi) => {
                          const multi = sel.type === "multi_choice";
                          const on = (sel.config?.correct || []).includes(o.id);
                          return (
                            <label key={o.id} style={ckRow}>
                              <input type={multi ? "checkbox" : "radio"} name={`correct-${sel.id}`} checked={on} onChange={() => toggleCorrect(sel.id, o.id, multi)} />
                              {o.label || `${t("svOption")} ${oi + 1}`}
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function countBefore(questions, i) {
  let n = 0;
  for (let k = 0; k <= i; k += 1) if (questions[k].type !== "section") n += 1;
  return n;
}

function IconBtn({ children, onClick, disabled, danger }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      style={{ border: `1px solid ${THEME.border}`, background: "transparent", borderRadius: 7, padding: "3px 6px", cursor: disabled ? "default" : "pointer", color: danger ? THEME.danger : THEME.text2, opacity: disabled ? 0.4 : 1, display: "inline-flex" }}>
      {children}
    </button>
  );
}

function SettingsPanel({ draft, setDraft, t, dir }) {
  const s = draft.settings;
  const set = (patch) => setDraft((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
  const isExam = s.mode === "exam";
  return (
    <div style={{ ...styles.cardWide, marginBottom: 14, background: THEME.surface2 }}>
      <b style={{ fontSize: 12.5, color: THEME.heading }}>{t("svSettings")}</b>

      <div style={{ marginTop: 10, marginBottom: 4 }}>
        <label style={styles.label}>{t("svMode")}</label>
        <div style={{ display: "inline-flex", background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 9, padding: 3, gap: 3 }}>
          {[["survey", t("svModeSurvey")], ["exam", t("svModeExam")]].map(([m, lbl]) => (
            <button key={m} type="button" onClick={() => set({ mode: m })}
              style={{ border: "none", borderRadius: 7, padding: "6px 16px", fontFamily: THEME.font, fontSize: 12, fontWeight: 700, cursor: "pointer",
                background: s.mode === m ? THEME.teal : "transparent", color: s.mode === m ? "#fff" : THEME.text2 }}>{lbl}</button>
          ))}
        </div>
        {isExam && !examHasScorable(draft.questions) && (
          <p style={{ ...styles.error, marginTop: 8, marginBottom: 0 }}>{t("svExamNoKeyWarn")}</p>
        )}
      </div>

      {isExam && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginTop: 8, marginBottom: 4 }}>
          <div><label style={styles.label}>{t("svPassScore")}</label><input type="number" min={0} max={100} style={styles.input} value={s.passScore ?? 60} onChange={(e) => set({ passScore: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })} dir="ltr" /></div>
          <div><label style={styles.label}>{t("svTimeLimit")}</label><input type="number" min={0} style={styles.input} value={s.timeLimitMin ?? ""} onChange={(e) => set({ timeLimitMin: e.target.value === "" ? null : Math.max(0, Number(e.target.value)) })} dir="ltr" /></div>
          <label style={{ ...ckRow, alignSelf: "end" }}><input type="checkbox" checked={s.showScoreToRespondent !== false} onChange={(e) => set({ showScoreToRespondent: e.target.checked })} /> {t("svShowScore")}</label>
          <label style={{ ...ckRow, alignSelf: "end" }}><input type="checkbox" checked={!!s.shuffleQuestions} onChange={(e) => set({ shuffleQuestions: e.target.checked })} /> {t("svShuffle")}</label>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginTop: 10 }}>
        <label style={ckRow}><input type="checkbox" checked={!!s.anonymous} onChange={(e) => set({ anonymous: e.target.checked })} /> {t("svAnonymous")}</label>
        {!s.anonymous && <label style={ckRow}><input type="checkbox" checked={!!s.collectName} onChange={(e) => set({ collectName: e.target.checked })} /> {t("svCollectName")}</label>}
        {!s.anonymous && <label style={ckRow}><input type="checkbox" checked={!!s.collectUnit} onChange={(e) => set({ collectUnit: e.target.checked })} /> {t("svCollectUnit")}</label>}
        <label style={ckRow}><input type="checkbox" checked={!!s.onePerDevice} onChange={(e) => set({ onePerDevice: e.target.checked })} /> {t("svOnePerDevice")}</label>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginTop: 10 }}>
        <div><label style={styles.label}>{t("svStartAt")}</label><input type="date" style={styles.input} value={s.startAt || ""} onChange={(e) => set({ startAt: e.target.value })} dir="ltr" /></div>
        <div><label style={styles.label}>{t("svEndAt")}</label><input type="date" style={styles.input} value={s.endAt || ""} onChange={(e) => set({ endAt: e.target.value })} dir="ltr" /></div>
        <div><label style={styles.label}>{t("svMaxResponses")}</label><input type="number" style={styles.input} value={s.maxResponses ?? ""} onChange={(e) => set({ maxResponses: e.target.value === "" ? null : Number(e.target.value) })} dir="ltr" /></div>
      </div>
      <label style={styles.label}>{t("svThankYouText")}</label>
      <textarea style={{ ...styles.input, minHeight: 44, resize: "vertical" }} value={s.thankYouText || ""} onChange={(e) => set({ thankYouText: e.target.value })} dir={dir} />
    </div>
  );
}
const ckRow = { display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: THEME.text2 };
