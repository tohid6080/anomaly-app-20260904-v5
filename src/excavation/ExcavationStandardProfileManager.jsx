import React, { useCallback, useEffect, useMemo, useState } from "react";
import { SlidersHorizontal, Save, History } from "lucide-react";
import { THEME, styles } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import ModuleSubHeader from "../shared/ModuleSubHeader.jsx";
import InfoHint from "../shared/InfoHint.jsx";
import { loadStandardProfile, loadStandardProfileHistory, saveStandardProfile } from "./excavationApi.js";
import { DEFAULT_PROFILE, SOIL_TYPES } from "./excavationCalcEngine.js";
import { toJalaliSafe } from "../personnel/jalaliDate.jsx";

/* ============================================================================ *
 * ویرایشِ نسخه‌دارِ «Standard Profile»ِ شیبِ گودبرداری در سطحِ شرکت — دقیقاً
 * هم‌الگوی LiftingCriteriaManager.jsx. هر ذخیره یک نسخه‌ی جدید می‌سازد؛
 * نسخه‌ی فعال مبنای محاسبه‌گر است. قالبِ پیش‌فرضِ سیستمی (OSHA Table B-1)
 * دست‌نخورده می‌ماند.
 * ============================================================================ */

const SOIL_HINT_KEYS = {
  stable_rock: "excHintSlopeStableRock",
  type_a: "excHintSlopeTypeA",
  type_b: "excHintSlopeTypeB",
  type_c: "excHintSlopeTypeC",
};
const SOIL_LABEL_KEYS = {
  stable_rock: "excSoilStableRock",
  type_a: "excSoilTypeA",
  type_b: "excSoilTypeB",
  type_c: "excSoilTypeC",
};

export default function ExcavationStandardProfileManager({ onBack, wide, currentUser }) {
  const { t, dir } = useLanguage();
  const actor = currentUser?.name || currentUser?.username || "";
  const card = wide ? styles.cardWide : styles.card;

  const [form, setForm] = useState(() => JSON.parse(JSON.stringify(DEFAULT_PROFILE)));
  const [baseline, setBaseline] = useState(() => JSON.parse(JSON.stringify(DEFAULT_PROFILE)));
  const [active, setActive] = useState(null);
  const [history, setHistory] = useState([]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const refresh = useCallback(async () => {
    const [a, h] = await Promise.all([loadStandardProfile().catch(() => null), loadStandardProfileHistory().catch(() => [])]);
    setActive(a);
    setHistory(Array.isArray(h) ? h : []);
    const p = {
      ...DEFAULT_PROFILE, ...(a?.profile || {}),
      slopes: { ...DEFAULT_PROFILE.slopes, ...(a?.profile?.slopes || {}) },
    };
    setForm(p); setBaseline(p);
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(baseline) || note.trim() !== "", [form, baseline, note]);
  const setSlopeH = (soil, v) => setForm((p) => ({ ...p, slopes: { ...p.slopes, [soil]: { ...p.slopes[soil], hRatio: v === "" ? "" : Number(v) } } }));
  const setNum = (k, v) => setForm((p) => ({ ...p, [k]: v === "" ? "" : Number(v) }));
  const resetToSystem = () => setForm(JSON.parse(JSON.stringify(DEFAULT_PROFILE)));

  const save = async () => {
    setSaving(true); setErr(""); setOk("");
    const clean = { ...form, slopes: {} };
    SOIL_TYPES.forEach((s) => { clean.slopes[s] = { hRatio: +form.slopes[s]?.hRatio || 0 }; });
    clean.peRequiredDepthM = +clean.peRequiredDepthM || DEFAULT_PROFILE.peRequiredDepthM;
    clean.minEdgeLoadSetbackM = +clean.minEdgeLoadSetbackM || 0;
    clean.treatWaterAsOneClassWeaker = !!clean.treatWaterAsOneClassWeaker;
    const res = await saveStandardProfile(clean, note.trim(), actor);
    setSaving(false);
    if (res?.__error) { setErr(res.message || t("commonErrorSave")); return; }
    setNote("");
    setOk(t("lcSavedV", { v: res.version }));
    await refresh();
  };

  return (
    <div style={{ direction: dir }}>
      <ModuleSubHeader icon={SlidersHorizontal} title={t("excStandardProfileTitle")} note={t("excStandardProfileNote")} onBack={onBack} backLabel={t("commonBackPlain")} />

      <div style={card}>
        <div style={{ fontSize: 11.5, color: THEME.text3, marginBottom: 12 }}>
          {active
            ? (active.isSystemDefault ? t("lcUsingSystem") : t("lcUsingCompanyV", { v: active.version }))
            : t("lcUsingSystem")}
        </div>

        <div style={{ fontSize: 12.5, fontWeight: 800, color: THEME.heading, margin: "0 0 8px" }}>
          {t("excSlopeTableTitle")} <InfoHint text={t("excHintSlopeTable")} />
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, marginBottom: 16 }}>
          <thead>
            <tr>
              <th style={thS}>{t("excColSoilType")}</th>
              <th style={thS}>{t("excColHRatio")}</th>
              <th style={thS}>{t("excColAngle")}</th>
            </tr>
          </thead>
          <tbody>
            {SOIL_TYPES.map((s) => {
              const hRatio = form.slopes?.[s]?.hRatio ?? 0;
              const angle = hRatio > 0 ? (Math.atan(1 / hRatio) * 180) / Math.PI : 90;
              return (
                <tr key={s}>
                  <td style={tdS}>{t(SOIL_LABEL_KEYS[s])} <InfoHint text={t(SOIL_HINT_KEYS[s])} /></td>
                  <td style={tdS}><input style={cellInput} type="number" step="any" min="0" value={hRatio} onChange={(e) => setSlopeH(s, e.target.value)} /></td>
                  <td style={{ ...tdS, color: THEME.text3 }}>{Number.isFinite(angle) ? `${angle.toFixed(0)}°` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div style={styles.formGridWide}>
          <div>
            <label style={{ ...styles.label, marginTop: 0 }}>{t("excFieldPeDepth")} (m) <InfoHint text={t("excHintPeDepth")} /></label>
            <input style={styles.input} type="number" step="any" value={form.peRequiredDepthM ?? ""} onChange={(e) => setNum("peRequiredDepthM", e.target.value)} />
          </div>
          <div>
            <label style={{ ...styles.label, marginTop: 0 }}>{t("excFieldEdgeSetback")} (m) <InfoHint text={t("excHintEdgeSetback")} /></label>
            <input style={styles.input} type="number" step="any" value={form.minEdgeLoadSetbackM ?? ""} onChange={(e) => setNum("minEdgeLoadSetbackM", e.target.value)} />
          </div>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: THEME.text2, marginTop: 14, cursor: "pointer" }}>
          <input type="checkbox" checked={!!form.treatWaterAsOneClassWeaker} onChange={(e) => setForm((p) => ({ ...p, treatWaterAsOneClassWeaker: e.target.checked }))} />
          {t("excFieldWaterDowngrade")} <InfoHint text={t("excHintWaterDowngrade")} />
        </label>

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
        <p style={{ fontSize: 10.5, color: THEME.text3, marginTop: 10, lineHeight: 1.7 }}>{t("excStandardProfileRef")}</p>
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
const tdS = { padding: "6px 6px" };
const cellInput = { width: "100%", padding: "6px 8px", borderRadius: 7, border: `1.5px solid ${THEME.border}`, background: THEME.surface, color: THEME.text, fontSize: 12.5, fontFamily: THEME.font, outline: "none" };
