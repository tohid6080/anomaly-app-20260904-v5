import React, { useCallback, useEffect, useMemo, useState } from "react";
import { SlidersHorizontal, Save, History } from "lucide-react";
import { THEME, styles } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import ModuleSubHeader from "../shared/ModuleSubHeader.jsx";
import { loadAcceptanceCriteria, loadCriteriaHistory, saveAcceptanceCriteria } from "./liftingPlanApi.js";
import { DEFAULT_CRITERIA } from "./liftingCalcEngine.js";
import { toJalaliSafe } from "../personnel/jalaliDate.jsx";

/* ============================================================================ *
 * ویرایشِ نسخه‌دارِ «معیارهای پذیرشِ لیفتینگ» در سطحِ شرکت. هر ذخیره یک نسخه‌ی
 * جدید می‌سازد؛ نسخه‌ی فعال مبنای موتورِ محاسبه/ایمنی است. قالبِ پیش‌فرضِ
 * سیستمی دست‌نخورده می‌ماند.
 * ============================================================================ */

const NUM_FIELDS = [
  { key: "maxUtilizationPct", labelKey: "lcMaxUtil", unit: "٪" },
  { key: "warnUtilizationPct", labelKey: "lcWarnUtil", unit: "٪" },
  { key: "minPersonnelClearance_m", labelKey: "lcMinPersonnel", unit: "m" },
  { key: "groundBearingSafetyFactor", labelKey: "lcGroundSf", unit: "" },
  { key: "windLimit_ms", labelKey: "lcWindLimit", unit: "m/s" },
  { key: "slingAngleWarnFromVertical_deg", labelKey: "lcSlingAngleWarn", unit: "°" },
  { key: "hookToCgWarn_m", labelKey: "lcCgWarn", unit: "m" },
  { key: "hookToCgFail_m", labelKey: "lcCgFail", unit: "m" },
];

export default function LiftingCriteriaManager({ onBack, wide, currentUser }) {
  const { t, dir } = useLanguage();
  const actor = currentUser?.name || currentUser?.username || "";
  const card = wide ? styles.cardWide : styles.card;

  const [form, setForm] = useState({ ...DEFAULT_CRITERIA });
  const [baseline, setBaseline] = useState({ ...DEFAULT_CRITERIA });
  const [active, setActive] = useState(null);
  const [history, setHistory] = useState([]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const refresh = useCallback(async () => {
    const [a, h] = await Promise.all([loadAcceptanceCriteria().catch(() => null), loadCriteriaHistory().catch(() => [])]);
    setActive(a);
    setHistory(Array.isArray(h) ? h : []);
    const c = { ...DEFAULT_CRITERIA, ...(a?.criteria || {}) };
    setForm(c); setBaseline(c);
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(baseline) || note.trim() !== "", [form, baseline, note]);
  const setNum = (k, v) => setForm((p) => ({ ...p, [k]: v === "" ? "" : Number(v) }));
  const setBand = (i, key, v) => setForm((p) => ({
    ...p,
    powerLineClearance: (p.powerLineClearance || []).map((b, j) => (j === i ? { ...b, [key]: v === "" ? "" : Number(v) } : b)),
  }));
  const addBand = () => setForm((p) => ({ ...p, powerLineClearance: [...(p.powerLineClearance || []), { maxKv: 1000, clearance_m: 10 }] }));
  const delBand = (i) => setForm((p) => ({ ...p, powerLineClearance: (p.powerLineClearance || []).filter((_, j) => j !== i) }));
  const resetToSystem = () => setForm({ ...DEFAULT_CRITERIA });

  const save = async () => {
    setSaving(true); setErr(""); setOk("");
    const clean = { ...form };
    clean.powerLineClearance = (clean.powerLineClearance || [])
      .map((b) => ({ maxKv: +b.maxKv, clearance_m: +b.clearance_m }))
      .filter((b) => Number.isFinite(b.maxKv) && Number.isFinite(b.clearance_m))
      .sort((a, b) => a.maxKv - b.maxKv);
    NUM_FIELDS.forEach((f) => { clean[f.key] = +clean[f.key] || 0; });
    const res = await saveAcceptanceCriteria(clean, note.trim(), actor);
    setSaving(false);
    if (res?.__error) { setErr(res.message || t("commonErrorSave")); return; }
    setNote("");
    setOk(t("lcSavedV", { v: res.version }));
    await refresh();
  };

  const bands = form.powerLineClearance || [];

  return (
    <div style={{ direction: dir }}>
      <ModuleSubHeader icon={SlidersHorizontal} title={t("subLiftingCriteria")} note={t("lcNote")} onBack={onBack} backLabel={t("commonBackPlain")} />

      <div style={card}>
        <div style={{ fontSize: 11.5, color: THEME.text3, marginBottom: 12 }}>
          {active
            ? (active.isSystemDefault ? t("lcUsingSystem") : t("lcUsingCompanyV", { v: active.version }))
            : t("lcUsingSystem")}
        </div>

        <div style={{ fontSize: 12.5, fontWeight: 800, color: THEME.heading, margin: "0 0 8px" }}>{t("lcThresholds")}</div>
        <div style={styles.formGridWide}>
          {NUM_FIELDS.map((f) => (
            <div key={f.key}>
              <label style={{ ...styles.label, marginTop: 0 }}>{t(f.labelKey)}{f.unit ? ` (${f.unit})` : ""}</label>
              <input style={styles.input} type="number" step="any" value={form[f.key] ?? ""} onChange={(e) => setNum(f.key, e.target.value)} />
            </div>
          ))}
        </div>

        <div style={{ marginTop: 16, borderTop: `1px solid ${THEME.borderSoft}`, paddingTop: 12 }}>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: THEME.heading, marginBottom: 6 }}>{t("lcPowerBands")}</div>
          <p style={{ fontSize: 11, color: THEME.text3, margin: "0 0 8px", lineHeight: 1.7 }}>{t("lcPowerBandsHint")}</p>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead><tr>
              <th style={thS}>{t("lcUpToKv")} (kV)</th><th style={thS}>{t("lcClearance")} (m)</th><th style={{ ...thS, width: 40 }} />
            </tr></thead>
            <tbody>
              {bands.map((b, i) => (
                <tr key={i}>
                  <td style={tdS}><input style={cellInput} type="number" step="any" value={b.maxKv} onChange={(e) => setBand(i, "maxKv", e.target.value)} /></td>
                  <td style={tdS}><input style={cellInput} type="number" step="any" value={b.clearance_m} onChange={(e) => setBand(i, "clearance_m", e.target.value)} /></td>
                  <td style={tdS}><button type="button" onClick={() => delBand(i)} style={{ border: "none", background: "transparent", color: THEME.danger, cursor: "pointer" }}>×</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" onClick={addBand} style={{ ...styles.smallButton, background: THEME.surface2, color: THEME.text, marginTop: 8 }}>+ {t("lcAddBand")}</button>
        </div>

        <div style={{ marginTop: 16 }}>
          <label style={{ ...styles.label, marginTop: 0 }}>{t("lcVersionNote")}</label>
          <input style={styles.input} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("lcVersionNoteHint")} />
        </div>

        {err && <p style={styles.error}>{err}</p>}
        {ok && <p style={{ ...styles.error, color: THEME.ok }}>{ok}</p>}

        <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
          <button type="button" onClick={save} disabled={saving || !dirty}
            style={{ ...styles.smallButton, background: THEME.teal, opacity: saving || !dirty ? 0.6 : 1, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Save size={14} /> {saving ? t("commonSaving") : t("lcSaveNewVersion")}
          </button>
          <button type="button" onClick={resetToSystem} style={{ ...styles.smallButton, background: THEME.surface2, color: THEME.text }}>
            {t("lcResetSystem")}
          </button>
        </div>
      </div>

      <div style={{ ...card, paddingTop: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <History size={15} color={THEME.tealDeep} />
          <span style={{ fontSize: 13, fontWeight: 800, color: THEME.heading }}>{t("lcHistory")} ({history.length})</span>
        </div>
        {history.length === 0
          ? <p style={{ fontSize: 12, color: THEME.text3, margin: 0 }}>{t("lcNoHistory")}</p>
          : history.map((h) => (
            <div key={h.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "7px 0", borderBottom: `1px solid ${THEME.borderSoft}`, fontSize: 12 }}>
              <span style={{ fontWeight: 700, color: THEME.text }}>
                {t("lpRevisionShort")} {h.version} {h.isActive && <span style={{ color: THEME.ok, fontSize: 10.5 }}>● {t("cmActiveHint")}</span>}
              </span>
              <span style={{ color: THEME.text2, flex: 1, minWidth: 0 }}>{h.note || "—"}</span>
              <span style={{ color: THEME.text3, whiteSpace: "nowrap" }}>{h.createdBy} · {toJalaliSafe(h.createdAt)}</span>
            </div>
          ))}
      </div>
    </div>
  );
}

const thS = { textAlign: "start", fontSize: 10.5, fontWeight: 800, color: THEME.text3, padding: "4px 6px", borderBottom: `1px solid ${THEME.borderSoft}` };
const tdS = { padding: "3px 6px" };
const cellInput = { width: "100%", padding: "6px 8px", borderRadius: 7, border: `1.5px solid ${THEME.border}`, background: THEME.surface, color: THEME.text, fontSize: 12.5, fontFamily: THEME.font, outline: "none" };
