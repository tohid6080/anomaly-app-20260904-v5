import React, { useState, useEffect, useCallback, useMemo } from "react";
import BackLink from "../shared/BackLink.jsx";
import { Award, Plus, RefreshCw } from "lucide-react";
import { styles, THEME } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import {
  loadEffectiveCategories, loadEvalConfig, loadEvalPeriods, createEvalPeriod, nextPeriodRange,
  getOrCreateEvalRecord, loadEvalRecordsForPeriod, loadEvalRecordDetail, loadEvalHistoryForContractor,
  loadOwnFinalEvaluations, calculateEvalRecord, submitHseReview, approveByEmployer, returnForCorrection,
  tierOf, loadCustomFieldValuesForRecord, saveCustomFieldValue, loadDistinctContractorCompanies,
} from "./contractorEvalApi.js";

const STATUS_LABEL_KEY = {
  draft: "evalStatusDraft", calculated: "evalStatusCalculated", hse_review: "evalStatusHseReview",
  employer_review: "evalStatusEmployerReview", returned: "evalStatusReturned", final: "evalStatusFinal",
};

function localeOf(lang) { return lang === "en" ? "en-US" : lang === "de" ? "de-DE" : "fa-IR"; }
function fmtNum(n, lang) { return n == null ? "—" : Math.round(n).toLocaleString(localeOf(lang)); }

function ScoreGauge({ score, tier }) {
  const r = 70, c = 2 * Math.PI * r;
  const offset = c - (Math.max(0, Math.min(100, score || 0)) / 100) * c;
  return (
    <div style={{ position: "relative", width: 164, height: 164, margin: "0 auto" }}>
      <svg viewBox="0 0 164 164" width={164} height={164} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={82} cy={82} r={r} fill="none" stroke={THEME.surface2} strokeWidth={13} />
        <circle cx={82} cy={82} r={r} fill="none" stroke={tier?.color || THEME.teal} strokeWidth={13} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 30, fontWeight: 800, color: tier?.color || THEME.text, fontFamily: "monospace" }}>{score == null ? "--" : Math.round(score)}</div>
        {tier && <div style={{ fontSize: 11, fontWeight: 700, color: tier.color, background: `${tier.color}22`, borderRadius: 999, padding: "3px 10px", marginTop: 4 }}>{tier.label}</div>}
      </div>
    </div>
  );
}

function BarChart({ items, height = 150 }) {
  if (!items.length) return <div style={{ fontSize: 12, color: THEME.text3, padding: 16 }}>—</div>;
  const barW = Math.min(90, Math.floor(480 / items.length) - 20);
  const gap = Math.max(16, Math.floor((520 - items.length * barW) / (items.length + 1)));
  const maxH = height - 44, baseY = height - 26;
  return (
    <svg viewBox={`0 0 ${Math.max(300, items.length * (barW + gap) + gap)} ${height}`} width="100%" height={height}>
      <line x1={10} y1={baseY} x2={Math.max(300, items.length * (barW + gap) + gap) - 10} y2={baseY} stroke={THEME.borderSoft} />
      {items.map((it, i) => {
        const h = (Math.max(0, Math.min(100, it.value || 0)) / 100) * maxH;
        const x = gap + i * (barW + gap), y = baseY - h;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={h} rx={7} fill={it.color} opacity={it.dim ? 0.5 : 1} stroke={it.highlight ? "#fff" : "none"} strokeWidth={it.highlight ? 2 : 0} />
            <text x={x + barW / 2} y={y - 8} textAnchor="middle" fontSize={12} fontWeight={700} fill={THEME.text}>{it.value == null ? "—" : Math.round(it.value)}</text>
            <text x={x + barW / 2} y={baseY + 16} textAnchor="middle" fontSize={10} fill={THEME.text3}>{it.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function ContractorEvalDashboard({ wide, role, isSupervisor, currentUser, readOnly, onBack }) {
  const { t, dir, lang } = useLanguage();
  const isContractor = role === "CONTRACTOR";
  const canAct = !readOnly && !isContractor;

  const [contractors, setContractors] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [config, setConfig] = useState(null);
  const [categories, setCategories] = useState([]);
  const [contractorId, setContractorId] = useState("");
  const [periodId, setPeriodId] = useState("");
  const [record, setRecord] = useState(null);
  const [detail, setDetail] = useState(null);
  const [history, setHistory] = useState([]);
  const [compareItems, setCompareItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [openCat, setOpenCat] = useState("");
  const [customValues, setCustomValues] = useState({});

  const boot = useCallback(async () => {
    if (isContractor) {
      const rows = await loadOwnFinalEvaluations(currentUser?.id);
      setHistory(rows);
      if (rows[0]) {
        const d = await loadEvalRecordDetail(rows[0].id);
        setDetail(d); setRecord(d.record);
      }
      const cats = await loadEffectiveCategories();
      setCategories(cats);
      setLoading(false);
      return;
    }
    const [cs, ps, cfg, cats] = await Promise.all([
      loadDistinctContractorCompanies(), loadEvalPeriods(), loadEvalConfig(), loadEffectiveCategories(),
    ]);
    setContractors(cs); setPeriods(ps); setConfig(cfg); setCategories(cats);
    if (cs[0]) setContractorId(cs[0].id);
    if (ps[0]) setPeriodId(ps[0].id);
    setLoading(false);
  }, [isContractor, currentUser]);

  useEffect(() => { boot(); }, [boot]);

  const loadForSelection = useCallback(async () => {
    if (isContractor || !contractorId || !periodId) return;
    setBusy(true);
    const rec = await getOrCreateEvalRecord(periodId, contractorId, currentUser?.name);
    setRecord(rec);
    if (rec) {
      const [d, cvRows] = await Promise.all([loadEvalRecordDetail(rec.id), loadCustomFieldValuesForRecord(rec.id)]);
      setDetail(d);
      const cvMap = {};
      for (const r of cvRows) cvMap[r.field_key] = { value: r.value, note: r.note };
      setCustomValues(cvMap);
    } else { setDetail(null); setCustomValues({}); }
    const hist = await loadEvalHistoryForContractor(contractorId, 6);
    setHistory(hist);
    const rows = await loadEvalRecordsForPeriod(periodId);
    setCompareItems(rows.map((r) => ({
      id: r.contractor_id, label: (r.contractors?.name || "").split(" ").slice(-2).join(" "),
      value: r.total_score, color: tierOf(r.total_score || 0, config).color, highlight: r.contractor_id === contractorId,
    })));
    setBusy(false);
  }, [isContractor, contractorId, periodId, currentUser, config]);

  useEffect(() => { loadForSelection(); }, [loadForSelection]);

  const tier = useMemo(() => (record?.total_score != null ? tierOf(record.total_score, config) : null), [record, config]);

  const handleCreatePeriod = async () => {
    if (!config) return;
    const range = nextPeriodRange(config.cadence);
    setBusy(true);
    await createEvalPeriod({ title: `${t(`evalCadence${config.cadence[0].toUpperCase()}${config.cadence.slice(1)}`)} ${range.start}`, cadence: config.cadence, periodStart: range.start, periodEnd: range.end }, currentUser?.name);
    const ps = await loadEvalPeriods();
    setPeriods(ps);
    if (ps[0]) setPeriodId(ps[0].id);
    setBusy(false);
  };

  const runAction = async (fn) => {
    setBusy(true);
    await fn();
    await loadForSelection();
    setNote("");
    setBusy(false);
  };

  if (loading) return <div style={{ padding: 24, textAlign: "center", color: THEME.text3 }}>{t("commonLoading")}</div>;

  const trendItems = history.map((h) => ({
    label: h.contractor_eval_periods?.title?.slice(0, 8) || "—",
    value: h.total_score, color: tierOf(h.total_score || 0, config).color, highlight: h.id === record?.id,
  }));

  return (
    <div style={wide ? { direction: dir } : { maxWidth: 720, margin: "0 auto", padding: 24, direction: dir }}>
      {!wide && onBack && <BackLink onClick={onBack}>{t("backToMenu")}</BackLink>}
      {!wide && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <Award size={20} color={THEME.teal} />
          <h2 style={{ margin: 0, fontSize: 19, color: THEME.heading, fontWeight: 700 }}>{t("moduleContractorHseEvaluation")}</h2>
        </div>
      )}

      {!isContractor && (
        <div style={styles.cardWide}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div>
              <label style={styles.label}>{t("evalPickContractor")}</label>
              <select style={styles.input} value={contractorId} onChange={(e) => setContractorId(e.target.value)}>
                {contractors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={styles.label}>{t("evalPickPeriod")}</label>
              <select style={styles.input} value={periodId} onChange={(e) => setPeriodId(e.target.value)}>
                {periods.map((p) => <option key={p.id} value={p.id}>{p.title || p.period_start}</option>)}
              </select>
            </div>
            {canAct && (
              <button type="button" style={{ ...styles.smallButton, display: "flex", alignItems: "center", gap: 6 }} onClick={handleCreatePeriod} disabled={busy}>
                <Plus size={14} /> {t("evalNewPeriod")}
              </button>
            )}
          </div>
        </div>
      )}

      {isContractor && history.length === 0 && (
        <div style={styles.cardWide}><p style={{ color: THEME.text3, fontSize: 13 }}>{t("evalNoFinalYet")}</p></div>
      )}

      {record && (
        <>
          <div style={styles.cardWide}>
            <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 20, alignItems: "center" }}>
              <ScoreGauge score={record.total_score} tier={tier} />
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Row label={t("evalStatusLabel")} value={t(STATUS_LABEL_KEY[record.status] || record.status)} />
                <Row label={t("evalOpenModules")} value={`${detail?.categoryScores?.filter((c) => c.is_applicable).length ?? 0} / ${categories.filter((c) => c.active).length}`} />
                {record.hse_review_note && <Row label={t("evalHseNoteLabel")} value={record.hse_review_note} />}
                {record.employer_note && <Row label={t("evalEmployerNoteLabel")} value={record.employer_note} />}

                {canAct && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                    {(record.status === "draft" || record.status === "returned") && (
                      <button type="button" style={{ ...styles.smallButton, background: THEME.teal }} disabled={busy} onClick={() => runAction(() => calculateEvalRecord(record.id, currentUser?.name))}>
                        <RefreshCw size={13} style={{ verticalAlign: "-2px", marginInlineEnd: 4 }} />{t("evalActionCalculate")}
                      </button>
                    )}
                    {record.status === "calculated" && isSupervisor && (
                      <button type="button" style={styles.smallButton} disabled={busy} onClick={() => runAction(() => submitHseReview(record.id, note, currentUser?.name))}>{t("evalActionSubmitHseReview")}</button>
                    )}
                    {record.status === "employer_review" && (
                      <>
                        <button type="button" style={{ ...styles.smallButton, background: THEME.ok }} disabled={busy} onClick={() => runAction(() => approveByEmployer(record.id, note, currentUser?.name))}>{t("evalActionApprove")}</button>
                        <button type="button" style={{ ...styles.smallButton, background: THEME.danger }} disabled={busy} onClick={() => runAction(() => returnForCorrection(record.id, note, currentUser?.name))}>{t("evalActionReturn")}</button>
                      </>
                    )}
                  </div>
                )}
                {canAct && record.status !== "final" && record.status !== "draft" && (
                  <input style={{ ...styles.input, marginTop: 6 }} placeholder={t("evalNotePlaceholder")} value={note} onChange={(e) => setNote(e.target.value)} />
                )}
              </div>
            </div>
          </div>

          <div style={styles.cardWide}>
            <h3 style={{ margin: "0 0 10px", fontSize: 14, color: THEME.heading }}>{t("evalCategoryBreakdownTitle")}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
              {categories.map((c) => {
                const cs = detail?.categoryScores?.find((x) => x.category_key === c.key);
                const active = cs?.is_applicable;
                const raw = cs?.raw_score;
                const color = active ? tierOf(raw || 0, config).color : THEME.text3;
                return (
                  <div key={c.key} style={{ background: THEME.surface2, borderRadius: 10, padding: "10px 12px", cursor: "pointer", opacity: active ? 1 : 0.55 }} onClick={() => setOpenCat(openCat === c.key ? "" : c.key)}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>
                      <span>{c.label[lang] || c.label.fa}</span>
                      <span style={{ color }}>{active ? fmtNum(raw, lang) : "—"}</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 999, background: THEME.surface, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${active ? raw : 0}%`, background: color, borderRadius: 999 }} />
                    </div>
                    {openCat === c.key && (
                      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                        {active ? c.indicators.map((ind) => {
                          const ir = detail?.indicatorResults?.find((x) => x.category_key === c.key && x.indicator_key === ind.key);
                          return (
                            <div key={ind.key} style={{ fontSize: 11, display: "flex", justifyContent: "space-between", gap: 6 }}>
                              <span style={{ color: THEME.text2 }}>{ind.label[lang] || ind.label.fa}</span>
                              <span style={{ fontFamily: "monospace" }}>
                                {ir?.actual_value ?? "—"} / {ir?.target_value ?? "—"} → {ir?.achievement_pct != null ? Math.round(ir.achievement_pct) : "—"}%
                              </span>
                            </div>
                          );
                        }) : <span style={{ fontSize: 11, color: THEME.text3 }}>{t(`evalNaReason_${cs?.na_reason || "noContractorData"}`)}</span>}
                        {canAct && record.status !== "final" && c.indicators.filter((ind) => ind.custom).length > 0 && (
                          <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4, paddingTop: 8, borderTop: `1px dashed ${THEME.borderSoft}` }}>
                            {c.indicators.filter((ind) => ind.custom).map((ind) => (
                              <CustomFieldEditor
                                key={ind.key} indicator={ind} lang={lang} t={t}
                                saved={customValues[ind.key]}
                                onSave={async (value, valNote) => {
                                  await saveCustomFieldValue(record.id, ind.key, value, valNote);
                                  setCustomValues((prev) => ({ ...prev, [ind.key]: { value: String(value), note: valNote } }));
                                }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {!isContractor && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
              <div style={styles.cardWide}>
                <h3 style={{ margin: "0 0 6px", fontSize: 13, color: THEME.heading }}>{t("evalCompareChartTitle")}</h3>
                <BarChart items={compareItems} />
              </div>
              <div style={styles.cardWide}>
                <h3 style={{ margin: "0 0 6px", fontSize: 13, color: THEME.heading }}>{t("evalTrendChartTitle")}</h3>
                <BarChart items={trendItems} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CustomFieldEditor({ indicator, saved, onSave, lang, t }) {
  const [value, setValue] = useState(saved?.value ?? "");
  const [note, setNote] = useState(saved?.note ?? "");
  const [savedFlash, setSavedFlash] = useState(false);
  const isOther = indicator.customType === "other";

  const handleSave = async () => {
    if (isOther && !note.trim()) return; // برای «سایر» توضیح الزامی است
    await onSave(Number(value) || 0, note);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
  };

  return (
    <div style={{ fontSize: 11.5 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ color: THEME.text2, fontWeight: 600 }}>{indicator.label[lang] || indicator.label.fa}</span>
        <span style={{ fontSize: 10, color: THEME.teal }}>{t(isOther ? "evalFieldTypeOther" : "evalCustomFieldCoeffPh")}</span>
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input type="number" min={0} max={100} value={value} onChange={(e) => setValue(e.target.value)}
          style={{ ...styles.input, width: 70, marginBottom: 0, padding: "6px 8px" }} dir="ltr" placeholder="0-100" />
        {isOther && (
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("evalNotePlaceholder")}
            style={{ ...styles.input, flex: 1, marginBottom: 0, padding: "6px 8px" }} />
        )}
        <button type="button" style={{ ...styles.smallButton, padding: "6px 12px", fontSize: 11 }} onClick={handleSave}>
          {savedFlash ? t("commonSavedDone") : t("saSaveChanges")}
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, borderBottom: `1px dashed ${THEME.borderSoft}`, paddingBottom: 6 }}>
      <span style={{ color: THEME.text3 }}>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
