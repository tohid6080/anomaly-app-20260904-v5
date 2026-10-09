import React, { useState, useEffect } from "react";
import BackLink from "../shared/BackLink.jsx";
import { Plus, Trash2 } from "lucide-react";
import { styles, THEME } from "../shared.js";
import { loadFmeaAssessmentById, loadFmeaItems, addFmeaItem, deleteFmeaItem } from "./fmeaApi.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";

const SCORES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function emptyItem() {
  return { failureMode: "", effect: "", severity: 5, cause: "", occurrence: 5, currentControls: "", detection: 5, recommendedAction: "", responsible: "", dueDate: "" };
}

function rpnColor(rpn) {
  if (rpn == null) return THEME.text3;
  if (rpn >= 200) return THEME.danger;
  if (rpn >= 80) return THEME.warn;
  return THEME.ok;
}

export default function FmeaForm({ fmeaId, currentUser, readOnly, onBack }) {
  const { t, dir } = useLanguage();
  const [fmea, setFmea] = useState(undefined);
  const [items, setItems] = useState([]);
  const [draft, setDraft] = useState(emptyItem());
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    const [f, i] = await Promise.all([loadFmeaAssessmentById(fmeaId), loadFmeaItems(fmeaId)]);
    setFmea(f);
    setItems(i);
  };
  useEffect(() => { load(); }, [fmeaId]);

  if (fmea === undefined) return <p style={{ color: THEME.text3, textAlign: "center", padding: 40 }}>{t("commonLoading")}</p>;
  if (!fmea) return <p style={{ color: THEME.danger, textAlign: "center", padding: 40 }}>{t("fmeaNotFound")}</p>;

  const handleAddItem = async () => {
    if (!draft.failureMode.trim() || !draft.effect.trim()) { setError(t("fmeaErrItemRequired")); return; }
    setSaving(true);
    setError("");
    const result = await addFmeaItem(fmeaId, { ...draft, seq: items.length });
    setSaving(false);
    if (result?.__error) { setError(result.message); return; }
    setDraft(emptyItem());
    setShowAdd(false);
    await load();
  };

  const handleDeleteItem = async (id) => {
    if (!confirm(t("fmeaDeleteItemConfirm"))) return;
    await deleteFmeaItem(id);
    await load();
  };

  const numSelect = (label, value, onChange) => (
    <div>
      <label style={styles.label}>{label}</label>
      <select style={styles.input} value={value} onChange={(e) => onChange(Number(e.target.value))} dir={dir}>
        {SCORES.map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
    </div>
  );

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: 24, direction: dir }}>
      <BackLink onClick={onBack}>{t("commonBackPlain")}</BackLink>
      <h2 style={{ fontSize: 18, color: THEME.heading, fontWeight: 800, margin: "0 0 4px" }}>{fmea.title}</h2>
      <p style={{ color: THEME.text3, fontSize: 12.5, marginBottom: 18 }}>{fmea.processOrComponent} {fmea.contractorName ? `— ${fmea.contractorName}` : ""}</p>

      {items.length > 0 && (
        <div style={{ overflowX: "auto", marginBottom: 16 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, background: THEME.surface, borderRadius: 10, overflow: "hidden" }}>
            <thead>
              <tr style={{ borderBottom: `1.5px solid ${THEME.border}`, color: THEME.text3 }}>
                <th style={{ textAlign: "start", padding: "8px" }}>{t("fmeaFieldFailureMode")}</th>
                <th style={{ textAlign: "start", padding: "8px" }}>{t("fmeaFieldEffect")}</th>
                <th style={{ textAlign: "center", padding: "8px" }}>S</th>
                <th style={{ textAlign: "center", padding: "8px" }}>O</th>
                <th style={{ textAlign: "center", padding: "8px" }}>D</th>
                <th style={{ textAlign: "center", padding: "8px" }}>RPN</th>
                <th style={{ textAlign: "start", padding: "8px" }}>{t("fmeaFieldRecommendedAction")}</th>
                <th style={{ padding: "8px" }} />
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} style={{ borderBottom: `1px solid ${THEME.border}` }}>
                  <td style={{ padding: "8px", fontWeight: 600 }}>{it.failureMode}</td>
                  <td style={{ padding: "8px" }}>{it.effect}</td>
                  <td style={{ padding: "8px", textAlign: "center" }}>{it.severity}</td>
                  <td style={{ padding: "8px", textAlign: "center" }}>{it.occurrence}</td>
                  <td style={{ padding: "8px", textAlign: "center" }}>{it.detection}</td>
                  <td style={{ padding: "8px", textAlign: "center", fontWeight: 700, color: rpnColor(it.rpn) }}>{it.rpn}</td>
                  <td style={{ padding: "8px" }}>{it.recommendedAction}</td>
                  <td style={{ padding: "8px" }}>
                    {!readOnly && (
                      <button type="button" onClick={() => handleDeleteItem(it.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                        <Trash2 size={13} color={THEME.danger} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {items.length === 0 && <p style={{ color: THEME.text3, textAlign: "center", padding: 20 }}>{t("fmeaNoItemsYet")}</p>}

      {!readOnly && !showAdd && (
        <button type="button" style={{ ...styles.button, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }} onClick={() => setShowAdd(true)}>
          <Plus size={15} /> {t("fmeaAddItemBtn")}
        </button>
      )}

      {!readOnly && showAdd && (
        <div style={{ ...styles.card, width: "auto" }}>
          <div style={styles.formGrid}>
            <input style={styles.input} placeholder={t("fmeaFieldFailureMode")} value={draft.failureMode} onChange={(e) => setDraft({ ...draft, failureMode: e.target.value })} dir={dir} />
            <input style={styles.input} placeholder={t("fmeaFieldEffect")} value={draft.effect} onChange={(e) => setDraft({ ...draft, effect: e.target.value })} dir={dir} />
            <input style={styles.input} placeholder={t("fmeaFieldCause")} value={draft.cause} onChange={(e) => setDraft({ ...draft, cause: e.target.value })} dir={dir} />
            <input style={styles.input} placeholder={t("fmeaFieldCurrentControls")} value={draft.currentControls} onChange={(e) => setDraft({ ...draft, currentControls: e.target.value })} dir={dir} />
          </div>
          <div style={{ ...styles.formGrid, gridTemplateColumns: "repeat(3, 1fr)" }}>
            {numSelect(t("fmeaFieldSeverity"), draft.severity, (v) => setDraft({ ...draft, severity: v }))}
            {numSelect(t("fmeaFieldOccurrence"), draft.occurrence, (v) => setDraft({ ...draft, occurrence: v }))}
            {numSelect(t("fmeaFieldDetection"), draft.detection, (v) => setDraft({ ...draft, detection: v }))}
          </div>
          <p style={{ fontSize: 12, color: THEME.text3, margin: "4px 0 10px" }}>{t("fmeaRpnPreview", { rpn: draft.severity * draft.occurrence * draft.detection })}</p>
          <div style={styles.formGrid}>
            <input style={styles.input} placeholder={t("fmeaFieldRecommendedAction")} value={draft.recommendedAction} onChange={(e) => setDraft({ ...draft, recommendedAction: e.target.value })} dir={dir} />
            <input style={styles.input} placeholder={t("fmeaFieldResponsible")} value={draft.responsible} onChange={(e) => setDraft({ ...draft, responsible: e.target.value })} dir={dir} />
          </div>
          {error && <p style={styles.error}>{error}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" style={styles.button} onClick={handleAddItem} disabled={saving}>{saving ? t("saSubmittingEllipsis") : t("commonSave")}</button>
            <button type="button" style={{ ...styles.button, background: THEME.text3 }} onClick={() => { setShowAdd(false); setDraft(emptyItem()); }}>{t("commonCancel")}</button>
          </div>
        </div>
      )}
    </div>
  );
}
