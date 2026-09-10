import React, { useCallback, useEffect, useMemo, useState } from "react";
import { SlidersHorizontal, Save, History } from "lucide-react";
import { THEME, styles } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import ModuleSubHeader from "../shared/ModuleSubHeader.jsx";
import { toJalaliSafe } from "../personnel/jalaliDate.jsx";
import { loadEnergyTariff, loadEnergyTariffHistory, saveEnergyTariff } from "./energyApi.js";
import { DEFAULT_TARIFF } from "./energyCalcEngine.js";

/* ============================================================================ *
 * ویرایشِ نسخه‌دارِ «تعرفه‌ی برق و ضرایبِ محاسبه» در سطحِ شرکت. هر ذخیره یک
 * نسخه‌ی جدید می‌سازد؛ نسخه‌ی فعال مبنای هزینه‌ها و ضریبِ هم‌زمانی است.
 * قالبِ سیستمی (نرخ‌ها = ۰) دست‌نخورده می‌ماند.
 * ============================================================================ */

const FIELDS = [
  { key: "energyRatePerKwh", labelKey: "enTfEnergyRate", unit: "/kWh" },
  { key: "demandChargePerKw", labelKey: "enTfDemandCharge", unit: "/kW" },
  { key: "fixedMonthly", labelKey: "enTfFixedMonthly", unit: "" },
  { key: "taxPct", labelKey: "enTfTaxPct", unit: "٪" },
  { key: "diversityFactor", labelKey: "enTfDiversity", unit: "0–1" },
  { key: "hoursPerYear", labelKey: "enTfHoursPerYear", unit: "h" },
];

export default function EnergyTariffManager({ onBack, wide, currentUser }) {
  const { t, dir } = useLanguage();
  const actor = currentUser?.name || currentUser?.username || "";
  const card = wide ? styles.cardWide : styles.card;

  const [form, setForm] = useState({ ...DEFAULT_TARIFF });
  const [baseline, setBaseline] = useState({ ...DEFAULT_TARIFF });
  const [active, setActive] = useState(null);
  const [history, setHistory] = useState([]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const refresh = useCallback(async () => {
    const [a, h] = await Promise.all([loadEnergyTariff().catch(() => null), loadEnergyTariffHistory().catch(() => [])]);
    setActive(a);
    setHistory(Array.isArray(h) ? h : []);
    const c = { ...DEFAULT_TARIFF, ...(a?.tariff || {}) };
    setForm(c); setBaseline(c);
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(baseline) || note.trim() !== "", [form, baseline, note]);
  const setF = (k, v) => setForm((p) => ({ ...p, [k]: v === "" ? "" : Number(v) }));

  const save = async () => {
    setSaving(true); setErr(""); setOk("");
    const clean = { ...form, currency: form.currency || "IRR" };
    FIELDS.forEach((f) => { clean[f.key] = +clean[f.key] || 0; });
    const res = await saveEnergyTariff(clean, note.trim(), actor);
    setSaving(false);
    if (res?.__error) { setErr(res.message || t("commonErrorSave")); return; }
    setNote(""); setOk(t("enTfSavedV", { v: res.version }));
    await refresh();
  };

  return (
    <div style={{ direction: dir }}>
      <ModuleSubHeader icon={SlidersHorizontal} title={t("enTariffTitle")} note={t("enTfNote")} onBack={onBack} backLabel={t("commonBackPlain")} />

      <div style={card}>
        <div style={{ fontSize: 11.5, color: THEME.text3, marginBottom: 12 }}>
          {active ? (active.isSystemDefault ? t("enTfUsingSystem") : t("enTfUsingCompanyV", { v: active.version })) : t("enTfUsingSystem")}
        </div>

        <div style={{ marginBottom: 10 }}>
          <label style={{ ...styles.label, marginTop: 0 }}>{t("enTfCurrency")}</label>
          <input style={styles.input} value={form.currency || "IRR"} onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))} />
        </div>

        <div style={styles.formGridWide}>
          {FIELDS.map((f) => (
            <div key={f.key}>
              <label style={{ ...styles.label, marginTop: 0 }}>{t(f.labelKey)}{f.unit ? ` (${f.unit})` : ""}</label>
              <input style={styles.input} type="number" step="any" value={form[f.key] ?? ""} onChange={(e) => setF(f.key, e.target.value)} />
            </div>
          ))}
        </div>

        <div style={{ marginTop: 14 }}>
          <label style={{ ...styles.label, marginTop: 0 }}>{t("enTfVersionNote")}</label>
          <input style={styles.input} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("enTfVersionNoteHint")} />
        </div>

        {err && <p style={styles.error}>{err}</p>}
        {ok && <p style={{ ...styles.error, color: THEME.ok }}>{ok}</p>}

        <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
          <button type="button" onClick={save} disabled={saving || !dirty}
            style={{ ...styles.smallButton, background: THEME.teal, opacity: saving || !dirty ? 0.6 : 1, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Save size={14} /> {saving ? t("commonSaving") : t("enTfSaveNewVersion")}
          </button>
          <button type="button" onClick={() => setForm({ ...DEFAULT_TARIFF })} style={{ ...styles.smallButton, background: THEME.surface2, color: THEME.text }}>
            {t("enTfResetSystem")}
          </button>
        </div>
        <p style={{ fontSize: 10.5, color: THEME.text3, marginTop: 10, lineHeight: 1.7 }}>{t("enTfDisclaimer")}</p>
      </div>

      <div style={{ ...card, paddingTop: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <History size={15} color={THEME.tealDeep} />
          <span style={{ fontSize: 13, fontWeight: 800, color: THEME.heading }}>{t("enTfHistory")} ({history.length})</span>
        </div>
        {history.length === 0
          ? <p style={{ fontSize: 12, color: THEME.text3, margin: 0 }}>{t("enTfNoHistory")}</p>
          : history.map((h) => (
            <div key={h.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "7px 0", borderBottom: `1px solid ${THEME.borderSoft}`, fontSize: 12 }}>
              <span style={{ fontWeight: 700, color: THEME.text }}>
                v{h.version} {h.isActive && <span style={{ color: THEME.ok, fontSize: 10.5 }}>● {t("cmActiveHint")}</span>}
              </span>
              <span style={{ color: THEME.text2, flex: 1, minWidth: 0 }}>{h.note || "—"}</span>
              <span style={{ color: THEME.text3, whiteSpace: "nowrap" }}>{h.createdBy} · {toJalaliSafe(h.createdAt)}</span>
            </div>
          ))}
      </div>
    </div>
  );
}
