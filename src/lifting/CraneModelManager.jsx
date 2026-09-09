import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Construction, Plus, Trash2, Save, X, Table2 } from "lucide-react";
import { THEME, styles } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import ModuleSubHeader from "../shared/ModuleSubHeader.jsx";
import { loadCraneModels, upsertCraneModel, deleteCraneModel, CRANE_MODEL_TYPES } from "./liftingPlanApi.js";

/* ============================================================================ *
 * مدیریتِ Master Dataِ مدلِ جرثقیل — Load Chartِ واقعیِ سازنده. این داده مبنای
 * محاسبه‌ی ظرفیت در «طراحی و شبیه‌سازی لیفتینگ» است؛ اگر مدلی چارت نداشته
 * باشد، ظرفیت در آن پلن «خارج از چارت» می‌ماند (هیچ مقدارِ فرضی).
 * ============================================================================ */

const EMPTY = {
  id: null, manufacturer: "", model: "", craneType: "mobile", configLabel: "",
  chartSource: "", isActive: true, machineryId: "", loadChart: [],
};

export default function CraneModelManager({ onBack, wide, currentUser }) {
  const { t, dir } = useLanguage();
  const actor = currentUser?.name || currentUser?.username || "";
  const card = wide ? styles.cardWide : styles.card;

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("list"); // list | edit
  const [form, setForm] = useState(EMPTY);
  const [baseline, setBaseline] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    const rows = await loadCraneModels({ activeOnly: false });
    setList(Array.isArray(rows) ? rows : []);
    setLoading(false);
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(baseline), [form, baseline]);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const openNew = () => { setForm({ ...EMPTY, loadChart: [{ radius_m: 6, capacity_kg: 10000 }] }); setBaseline(EMPTY); setErr(""); setMode("edit"); };
  const openEdit = (r) => {
    const f = { id: r.id, manufacturer: r.manufacturer, model: r.model, craneType: r.craneType, configLabel: r.configLabel,
      chartSource: r.chartSource, isActive: r.isActive, machineryId: r.machineryId, loadChart: r.loadChart.map((p) => ({ ...p })) };
    setForm(f); setBaseline(f); setErr(""); setMode("edit");
  };

  const setChartCell = (i, key, val) => setForm((p) => ({
    ...p, loadChart: p.loadChart.map((row, j) => (j === i ? { ...row, [key]: val === "" ? "" : Number(val) } : row)),
  }));
  const addChartRow = () => setForm((p) => {
    const last = p.loadChart[p.loadChart.length - 1];
    return { ...p, loadChart: [...p.loadChart, { radius_m: last ? Number(last.radius_m) + 4 : 6, capacity_kg: 1000 }] };
  });
  const delChartRow = (i) => setForm((p) => ({ ...p, loadChart: p.loadChart.filter((_, j) => j !== i) }));

  const save = async () => {
    if (!form.manufacturer.trim() && !form.model.trim()) { setErr(t("cmErrNeedName")); return; }
    const chart = form.loadChart.filter((p) => Number.isFinite(+p.radius_m) && Number.isFinite(+p.capacity_kg) && p.radius_m !== "" && p.capacity_kg !== "");
    if (chart.length < 2) { setErr(t("cmErrNeedChart")); return; }
    setSaving(true); setErr("");
    const res = await upsertCraneModel({ ...form, loadChart: chart }, actor);
    setSaving(false);
    if (res?.__error) { setErr(res.message || t("commonErrorSave")); return; }
    await refresh();
    setMode("list");
  };

  const doDelete = async (r) => {
    if (!window.confirm(t("cmConfirmDelete"))) return;
    setBusyId(r.id);
    const res = await deleteCraneModel(r.id);
    setBusyId("");
    if (res?.__error) { setErr(res.message); return; }
    await refresh();
  };

  if (mode === "edit") {
    const sortedChart = form.loadChart;
    return (
      <div style={{ direction: dir }}>
        <ModuleSubHeader icon={Construction} title={form.id ? t("cmEditTitle") : t("cmNewTitle")} note={t("cmNote")}
          onBack={() => setMode("list")} backLabel={t("commonBackPlain")} />

        <div style={card}>
          <div style={styles.formGridWide}>
            <Field label={t("cmManufacturer")}><input style={styles.input} value={form.manufacturer} onChange={(e) => set("manufacturer", e.target.value)} /></Field>
            <Field label={t("cmModel")}><input style={styles.input} value={form.model} onChange={(e) => set("model", e.target.value)} /></Field>
            <Field label={t("cmType")}>
              <select style={styles.input} value={form.craneType} onChange={(e) => set("craneType", e.target.value)}>
                {CRANE_MODEL_TYPES.map((v) => <option key={v} value={v}>{t("lpCrane" + v[0].toUpperCase() + v.slice(1))}</option>)}
              </select>
            </Field>
            <Field label={t("cmConfig")}><input style={styles.input} value={form.configLabel} onChange={(e) => set("configLabel", e.target.value)} placeholder={t("cmConfigHint")} /></Field>
            <Field label={t("cmChartSource")} full><input style={styles.input} value={form.chartSource} onChange={(e) => set("chartSource", e.target.value)} placeholder={t("cmChartSourceHint")} /></Field>
            <Field label={t("cmActive")}>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: THEME.text2 }}>
                <input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} /> {t("cmActiveHint")}
              </label>
            </Field>
          </div>

          <div style={{ marginTop: 16, borderTop: `1px solid ${THEME.borderSoft}`, paddingTop: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Table2 size={15} color={THEME.tealDeep} />
              <span style={{ fontSize: 13, fontWeight: 800, color: THEME.heading }}>{t("cmChartTitle")}</span>
            </div>
            <p style={{ fontSize: 11, color: THEME.text3, margin: "0 0 8px", lineHeight: 1.7 }}>{t("cmChartHint")}</p>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr>
                  <th style={thS}>{t("cmRadius")} (m)</th>
                  <th style={thS}>{t("cmCapacity")} (kg)</th>
                  <th style={{ ...thS, width: 40 }} />
                </tr>
              </thead>
              <tbody>
                {sortedChart.map((row, i) => (
                  <tr key={i}>
                    <td style={tdS}><input style={cellInput} type="number" step="any" value={row.radius_m} onChange={(e) => setChartCell(i, "radius_m", e.target.value)} /></td>
                    <td style={tdS}><input style={cellInput} type="number" step="any" value={row.capacity_kg} onChange={(e) => setChartCell(i, "capacity_kg", e.target.value)} /></td>
                    <td style={tdS}>
                      <button type="button" onClick={() => delChartRow(i)} title={t("commonDelete")}
                        style={{ border: "none", background: "transparent", color: THEME.danger, cursor: "pointer", padding: 4 }}>
                        <X size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="button" onClick={addChartRow}
              style={{ ...styles.smallButton, background: THEME.surface2, color: THEME.text, marginTop: 8, display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Plus size={13} /> {t("cmAddRow")}
            </button>
          </div>

          {err && <p style={styles.error}>{err}</p>}

          <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
            <button type="button" onClick={save} disabled={saving || !dirty}
              style={{ ...styles.smallButton, background: THEME.teal, opacity: saving || !dirty ? 0.6 : 1, display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Save size={14} /> {saving ? t("commonSaving") : t("commonSave")}
            </button>
            <button type="button" onClick={() => setMode("list")} style={{ ...styles.smallButton, background: THEME.surface2, color: THEME.text }}>
              {t("commonCancel")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ direction: dir }}>
      <ModuleSubHeader icon={Construction} title={t("subCraneModels")} note={t("cmNote")} onBack={onBack} backLabel={t("commonBackPlain")} />
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <span style={{ fontSize: 12, color: THEME.text3 }}>{t("cmCount", { n: list.length })}</span>
          <button type="button" onClick={openNew} style={{ ...styles.smallButton, background: THEME.teal, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Plus size={14} /> {t("cmNew")}
          </button>
        </div>
        {err && <p style={styles.error}>{err}</p>}
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
          {loading ? <p style={{ fontSize: 12.5, color: THEME.text3 }}>{t("commonLoading")}</p>
            : list.length === 0 ? <p style={{ fontSize: 12.5, color: THEME.text3 }}>{t("cmEmpty")}</p>
              : list.map((r) => (
                <div key={r.id} style={{ border: `1px solid ${THEME.cardBorder}`, borderRadius: THEME.radiusCard, padding: "12px 14px", background: THEME.cardBg, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", opacity: r.isActive ? 1 : 0.55 }}>
                  <button type="button" onClick={() => openEdit(r)} style={{ border: "none", background: "transparent", textAlign: "start", cursor: "pointer", flex: 1, minWidth: 0, padding: 0, fontFamily: THEME.font }}>
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: THEME.text }}>{[r.manufacturer, r.model].filter(Boolean).join(" ") || t("lpUntitled")}</div>
                    <div style={{ fontSize: 11.5, color: THEME.text3, marginTop: 3 }}>
                      {[t("lpCrane" + r.craneType[0].toUpperCase() + r.craneType.slice(1)), r.configLabel, t("cmChartRows", { n: r.loadChart.length })].filter(Boolean).join("  ·  ")}
                    </div>
                  </button>
                  <button type="button" title={t("commonDelete")} onClick={() => doDelete(r)} disabled={busyId === r.id}
                    style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${THEME.border}`, background: THEME.surface, color: THEME.danger, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
        </div>
      </div>
    </div>
  );
}

const thS = { textAlign: "start", fontSize: 10.5, fontWeight: 800, color: THEME.text3, padding: "4px 6px", borderBottom: `1px solid ${THEME.borderSoft}` };
const tdS = { padding: "3px 6px" };
const cellInput = { width: "100%", padding: "6px 8px", borderRadius: 7, border: `1.5px solid ${THEME.border}`, background: THEME.surface, color: THEME.text, fontSize: 12.5, fontFamily: THEME.font, outline: "none" };

function Field({ label, children, full }) {
  return (
    <div style={{ gridColumn: full ? "1 / -1" : undefined }}>
      <label style={{ ...styles.label, marginTop: 0 }}>{label}</label>
      {children}
    </div>
  );
}
