import React, { useState, useEffect } from "react";
import { X, Trash2 } from "lucide-react";
import { THEME, styles } from "../shared.js";
import { CRITICALITY_LEVELS, BARRIER_STATUS, EFFECTIVENESS_STATUS } from "./bowtieApi.js";
import { JalaliDateInput } from "../personnel/jalaliDate.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";

export default function NodeInspectorPanel({ type, node, readOnly, onClose, onSave, onDelete }) {
  const { t, dir } = useLanguage();
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (type === "barrier") {
      setForm({
        label: node.label, owner: node.owner, criticality: node.criticality,
        status: node.status, effectivenessStatus: node.effectivenessStatus, verificationDate: node.verificationDate, isCriticalControl: node.isCriticalControl,
      });
    } else if (type === "threat" || type === "consequence" || type === "escalationFactor") {
      setForm({ label: node.label });
    } else if (type === "escalationControl") {
      setForm({ label: node.label, owner: node.owner, status: node.status });
    }
  }, [node, type]);

  const titleFor = {
    threat: t("bowtieNodeThreat"), consequence: t("bowtieNodeConsequence"), barrier: t("bowtieNodeBarrier"),
    topEvent: t("bowtieNodeTopEvent"), escalationFactor: t("bowtieNodeEscalationFactor"),
    escalationControl: t("bowtieNodeEscalationControl"),
  }[type];

  const handleSave = async () => {
    if (type !== "topEvent" && !form.label?.trim()) { alert(t("errTitleRequired")); return; }
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div
      style={{
        position: "absolute", inset: 0, background: "rgba(10,20,30,0.35)", display: "flex",
        alignItems: "flex-end", justifyContent: "center", zIndex: 10,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%", maxWidth: 460, background: THEME.surface, borderRadius: "16px 16px 0 0",
          padding: "18px 20px 22px", boxShadow: "0 -8px 30px rgba(0,0,0,0.2)", maxHeight: "70%", overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 15.5, color: THEME.navy, fontWeight: 700 }}>{titleFor}</h3>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
            <X size={18} color={THEME.text3} />
          </button>
        </div>

        {type === "topEvent" ? (
          <div style={{ fontSize: 13, color: THEME.text2, lineHeight: 1.9 }}>
            <div><b style={{ color: THEME.text }}>{t("bowtieTitleLabel")}</b> {node.title}</div>
            <div><b style={{ color: THEME.text }}>{t("bowtieHazardLabel")}</b> {node.hazard}</div>
            <div><b style={{ color: THEME.text }}>{t("bowtieTopEventLabel")}</b> {node.topEvent}</div>
            <p style={{ color: THEME.text3, fontSize: 11.5, marginTop: 10 }}>
              {t("bowtieEditFromDashboardNote")}
            </p>
          </div>
        ) : (
          <>
            <label style={styles.label}>{t("commonTitle")}</label>
            <input style={styles.input} value={form.label || ""} onChange={(e) => setForm({ ...form, label: e.target.value })} dir={dir} disabled={readOnly} />

            {type === "barrier" && (
              <>
                <label style={styles.label}>{t("bowtieOwnerLabel")}</label>
                <input style={styles.input} value={form.owner || ""} onChange={(e) => setForm({ ...form, owner: e.target.value })} dir={dir} disabled={readOnly} />

                <div style={styles.formGrid}>
                  <div>
                    <label style={styles.label}>{t("bowtieCriticalityLabel")}</label>
                    <select style={styles.input} value={form.criticality || "medium"} onChange={(e) => setForm({ ...form, criticality: e.target.value })} dir={dir} disabled={readOnly}>
                      {CRITICALITY_LEVELS.map((c) => <option key={c.value} value={c.value}>{t(c.labelKey)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={styles.label}>{t("commonStatus")}</label>
                    <select style={styles.input} value={form.status || "green"} onChange={(e) => setForm({ ...form, status: e.target.value })} dir={dir} disabled={readOnly}>
                      {BARRIER_STATUS.map((s) => <option key={s.value} value={s.value}>{t(s.labelKey)}</option>)}
                    </select>
                  </div>
                </div>

                <label style={styles.label}>{t("bowtieLastVerificationDate")}</label>
                <JalaliDateInput value={form.verificationDate || ""} onChange={(v) => setForm({ ...form, verificationDate: v })} allowEmpty disabled={readOnly} />

                <label style={styles.label}>{t("bowtieEffectivenessStatusLabel")}</label>
                <select style={styles.input} value={form.effectivenessStatus || "not_assessed"} onChange={(e) => setForm({ ...form, effectivenessStatus: e.target.value })} dir={dir} disabled={readOnly}>
                  {EFFECTIVENESS_STATUS.map((s) => <option key={s.value} value={s.value}>{s.emoji} {t(s.labelKey)}</option>)}
                </select>

                <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16, fontSize: 13, color: THEME.text2, cursor: readOnly ? "default" : "pointer" }}>
                  <input type="checkbox" checked={!!form.isCriticalControl} onChange={(e) => setForm({ ...form, isCriticalControl: e.target.checked })} disabled={readOnly} />
                  {t("bowtieCriticalControl")}
                </label>
              </>
            )}

            {type === "escalationControl" && (
              <>
                <label style={styles.label}>{t("bowtieOwnerLabel")}</label>
                <input style={styles.input} value={form.owner || ""} onChange={(e) => setForm({ ...form, owner: e.target.value })} dir={dir} disabled={readOnly} />

                <label style={styles.label}>{t("commonStatus")}</label>
                <select style={styles.input} value={form.status || "green"} onChange={(e) => setForm({ ...form, status: e.target.value })} dir={dir} disabled={readOnly}>
                  {BARRIER_STATUS.map((s) => <option key={s.value} value={s.value}>{t(s.labelKey)}</option>)}
                </select>
              </>
            )}

            {!readOnly && (
              <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
                <button type="button" style={styles.button} onClick={handleSave} disabled={saving}>
                  {saving ? t("saSavingEllipsis") : t("commonSave")}
                </button>
                {onDelete && (
                  <button type="button" style={{ ...styles.smallButton, background: THEME.danger, display: "flex", alignItems: "center", gap: 6 }} onClick={onDelete}>
                    <Trash2 size={13} /> {t("commonDelete")}
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
