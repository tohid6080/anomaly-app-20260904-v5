import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Coins, Save, Plus, Trash2, ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import { THEME, styles } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import {
  loadModulePrices, saveModulePrice, loadServices, upsertService, deleteService,
} from "../pricingApi.js";
import { updatePlan } from "./superAdminApi.js";

/* ============================================================================ *
 * قیمتِ ماژول‌ها + خدمات/افزودنی‌ها + پیکربندیِ «تعداد ماژول → پلن».
 * همه‌چیز Data-driven؛ کلیدِ هر ردیف = همان کلیدی که isModuleInPlan استفاده
 * می‌کند. تغییرِ قیمت اشتراکِ فعالِ شرکت‌ها را عوض نمی‌کند (قفلِ قیمت هنگامِ خرید).
 * ============================================================================ */

const clone = (v) => JSON.parse(JSON.stringify(v ?? null));
const fmt = (n) => Number(Math.round(n) || 0).toLocaleString("fa-IR");

export default function ModulePricingManager({ currentAdmin, plans, onChanged }) {
  const { t, dir } = useLanguage();
  const actor = currentAdmin?.fullName || currentAdmin?.username || "";

  const [mp, setMp] = useState([]);
  const [mpBase, setMpBase] = useState([]);
  const [svc, setSvc] = useState([]);
  const [svcBase, setSvcBase] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [openPlan, setOpenPlan] = useState("");
  const [planDraft, setPlanDraft] = useState({}); // planId -> {minModules,maxModules,moduleUniverse}

  const refresh = useCallback(async () => {
    setLoading(true);
    const [m, s] = await Promise.all([loadModulePrices(), loadServices()]);
    setMp(m); setMpBase(clone(m));
    setSvc(s); setSvcBase(clone(s));
    setLoading(false);
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const priceKeys = useMemo(() => mp.map((x) => x.moduleKey), [mp]);
  const missing = useMemo(() => mp.filter((x) => !x.isFree && (!x.priceMonthly || x.priceMonthly <= 0)), [mp]);

  const mpDirty = useMemo(() => JSON.stringify(mp) !== JSON.stringify(mpBase), [mp, mpBase]);
  const setRow = (k, patch) => setMp((rows) => rows.map((r) => (r.moduleKey === k ? { ...r, ...patch } : r)));

  const saveModules = async () => {
    setBusy(true); setErr(""); setOk("");
    const changed = mp.filter((r) => {
      const b = mpBase.find((x) => x.moduleKey === r.moduleKey);
      return !b || JSON.stringify(b) !== JSON.stringify(r);
    });
    for (const r of changed) {
      const res = await saveModulePrice(r, actor);
      if (res?.__error) { setErr(res.message || t("commonErrorSave")); setBusy(false); return; }
    }
    setBusy(false); setOk(t("mpSavedN", { n: changed.length }));
    await refresh();
  };

  // ---- services ----
  const setSvcRow = (id, patch) => setSvc((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const svcDirty = useMemo(() => JSON.stringify(svc) !== JSON.stringify(svcBase), [svc, svcBase]);
  const addSvc = () => setSvc((rows) => [...rows, { id: "", name: t("mpNewService"), description: "", priceMonthly: 0, priceYearly: 0, period: "monthly", sortOrder: (rows.length + 1) * 10, isActive: true, __new: true }]);
  const saveServices = async () => {
    setBusy(true); setErr(""); setOk("");
    const changed = svc.filter((r) => r.__new || JSON.stringify(svcBase.find((x) => x.id === r.id)) !== JSON.stringify(r));
    for (const r of changed) {
      const res = await upsertService(r, actor);
      if (res?.__error) { setErr(res.message || t("commonErrorSave")); setBusy(false); return; }
    }
    setBusy(false); setOk(t("mpSavedN", { n: changed.length }));
    await refresh();
  };
  const removeSvc = async (r) => {
    if (r.__new) { setSvc((rows) => rows.filter((x) => x !== r)); return; }
    if (!window.confirm(t("mpConfirmDeleteService"))) return;
    const res = await deleteService(r.id);
    if (res?.__error) { setErr(res.message); return; }
    await refresh();
  };

  // ---- plan config ----
  const draftFor = (p) => planDraft[p.id] || { minModules: p.minModules ?? "", maxModules: p.maxModules ?? "", moduleUniverse: p.moduleUniverse ?? [] };
  const setPlanField = (pid, patch) => setPlanDraft((d) => ({ ...d, [pid]: { ...draftFor(plans.find((x) => x.id === pid)), ...(d[pid] || {}), ...patch } }));
  const toggleUni = (pid, key) => {
    const d = draftFor(plans.find((x) => x.id === pid));
    const set = new Set(d.moduleUniverse || []);
    set.has(key) ? set.delete(key) : set.add(key);
    setPlanField(pid, { moduleUniverse: Array.from(set) });
  };
  const savePlanCfg = async (p) => {
    setBusy(true); setErr(""); setOk("");
    const d = draftFor(p);
    const res = await updatePlan(p.id, {
      minModules: d.minModules === "" ? null : Number(d.minModules),
      maxModules: d.maxModules === "" ? null : Number(d.maxModules),
      moduleUniverse: d.moduleUniverse || [],
    });
    setBusy(false);
    if (res?.__error) { setErr(res.message || t("commonErrorSave")); return; }
    setOk(t("mpPlanCfgSaved", { name: p.name }));
    onChanged && onChanged();
  };

  if (loading) return <p style={{ color: THEME.text3, padding: 20 }}>{t("commonLoading")}</p>;

  return (
    <div style={{ direction: dir }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <Coins size={17} color={THEME.tealDeep} />
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: THEME.heading }}>{t("saNavModulePricing")}</h3>
      </div>
      <p style={{ fontSize: 11.5, color: THEME.text3, marginBottom: 14, lineHeight: 1.8 }}>{t("mpIntro")}</p>
      {err && <p style={styles.error}>{err}</p>}
      {ok && <p style={{ ...styles.error, color: THEME.ok }}>{ok}</p>}

      {missing.length > 0 && (
        <div style={{ background: THEME.warnBg, border: `1px solid ${THEME.warn}55`, color: THEME.warn, borderRadius: 10, padding: "9px 12px", fontSize: 11.5, fontWeight: 700, marginBottom: 12, display: "flex", gap: 8, alignItems: "flex-start" }}>
          <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          {t("mpMissingWarn", { n: missing.length, list: missing.map((m) => m.label || m.moduleKey).join("، ") })}
        </div>
      )}

      {/* ---------- module prices ---------- */}
      <div style={{ ...styles.cardWide, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
          <b style={{ fontSize: 13, color: THEME.heading }}>{t("mpTableTitle")}</b>
          <button type="button" onClick={saveModules} disabled={busy || !mpDirty}
            style={{ ...styles.smallButton, background: THEME.teal, opacity: busy || !mpDirty ? 0.6 : 1, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Save size={13} /> {t("mpSaveChanges")}
          </button>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead><tr>
              {[t("mpColModule"), t("mpColMonthly"), t("mpColYearly"), t("mpColFree")].map((h) => (
                <th key={h} style={{ textAlign: "start", fontSize: 10, fontWeight: 800, color: THEME.text3, padding: "5px 7px", borderBottom: `1px solid ${THEME.border}` }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {mp.map((r) => (
                <tr key={r.moduleKey}>
                  <td style={{ padding: "4px 7px", borderBottom: `1px solid ${THEME.borderSoft}` }}>
                    {r.label || r.moduleKey}
                    <div style={{ fontFamily: "monospace", fontSize: 9.5, color: THEME.text3 }}>{r.moduleKey}{r.requires?.length ? ` · نیازمندِ ${r.requires.join(",")}` : ""}</div>
                  </td>
                  <td style={{ padding: "4px 7px", borderBottom: `1px solid ${THEME.borderSoft}` }}>
                    <input type="number" step="100000" disabled={r.isFree} value={r.priceMonthly}
                      onChange={(e) => setRow(r.moduleKey, { priceMonthly: e.target.value === "" ? "" : Number(e.target.value) })}
                      style={cellIn} />
                  </td>
                  <td style={{ padding: "4px 7px", borderBottom: `1px solid ${THEME.borderSoft}` }}>
                    <input type="number" step="100000" disabled={r.isFree} value={r.priceYearly}
                      onChange={(e) => setRow(r.moduleKey, { priceYearly: e.target.value === "" ? "" : Number(e.target.value) })}
                      style={cellIn} />
                  </td>
                  <td style={{ padding: "4px 7px", borderBottom: `1px solid ${THEME.borderSoft}` }}>
                    <input type="checkbox" checked={r.isFree} onChange={(e) => setRow(r.moduleKey, { isFree: e.target.checked, ...(e.target.checked ? { priceMonthly: 0, priceYearly: 0 } : {}) })} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------- services ---------- */}
      <div style={{ ...styles.cardWide, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
          <b style={{ fontSize: 13, color: THEME.heading }}>{t("mpServicesTitle")}</b>
          <div style={{ display: "flex", gap: 6 }}>
            <button type="button" onClick={addSvc} style={{ ...styles.smallButton, background: THEME.surface2, color: THEME.text, display: "inline-flex", alignItems: "center", gap: 5 }}><Plus size={13} /> {t("mpAddService")}</button>
            <button type="button" onClick={saveServices} disabled={busy || !svcDirty} style={{ ...styles.smallButton, background: THEME.teal, opacity: busy || !svcDirty ? 0.6 : 1, display: "inline-flex", alignItems: "center", gap: 5 }}><Save size={13} /> {t("mpSaveChanges")}</button>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead><tr>
              {[t("mpSvcName"), t("mpColMonthly"), t("mpColYearly"), t("mpSvcPeriod"), t("mpSvcDesc"), ""].map((h, i) => (
                <th key={i} style={{ textAlign: "start", fontSize: 10, fontWeight: 800, color: THEME.text3, padding: "5px 7px", borderBottom: `1px solid ${THEME.border}` }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {svc.map((r, i) => (
                <tr key={r.id || "new" + i}>
                  <td style={tdS}><input type="text" value={r.name} onChange={(e) => upd(r, { name: e.target.value })} style={{ ...cellIn, width: 150, textAlign: "start", fontFamily: THEME.font }} /></td>
                  <td style={tdS}><input type="number" step="100000" value={r.priceMonthly} onChange={(e) => upd(r, { priceMonthly: Number(e.target.value) || 0 })} style={cellIn} /></td>
                  <td style={tdS}><input type="number" step="100000" value={r.priceYearly} onChange={(e) => upd(r, { priceYearly: Number(e.target.value) || 0 })} style={cellIn} /></td>
                  <td style={tdS}>
                    <select value={r.period} onChange={(e) => upd(r, { period: e.target.value })} style={{ ...cellIn, width: 90 }}>
                      <option value="monthly">{t("mpPeriodMonthly")}</option>
                      <option value="yearly">{t("mpPeriodYearly")}</option>
                      <option value="once">{t("mpPeriodOnce")}</option>
                    </select>
                  </td>
                  <td style={tdS}><input type="text" value={r.description} onChange={(e) => upd(r, { description: e.target.value })} style={{ ...cellIn, width: 170 }} /></td>
                  <td style={tdS}><button type="button" onClick={() => removeSvc(r)} style={{ border: "none", background: "transparent", color: THEME.danger, cursor: "pointer" }}><Trash2 size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------- plan config ---------- */}
      <div style={styles.cardWide}>
        <b style={{ fontSize: 13, color: THEME.heading }}>{t("mpPlanCfgTitle")}</b>
        <p style={{ fontSize: 11, color: THEME.text3, margin: "4px 0 10px", lineHeight: 1.8 }}>{t("mpPlanCfgIntro")}</p>
        {(plans || []).map((p) => {
          const d = draftFor(p);
          const open = openPlan === p.id;
          return (
            <div key={p.id} style={{ border: `1px solid ${THEME.borderSoft}`, borderRadius: 10, marginBottom: 8 }}>
              <button type="button" onClick={() => setOpenPlan(open ? "" : p.id)}
                style={{ width: "100%", border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", fontFamily: THEME.font, textAlign: "start" }}>
                {open ? <ChevronDown size={15} color={THEME.text3} /> : <ChevronRight size={15} color={THEME.text3} />}
                <span style={{ fontWeight: 800, fontSize: 12.5, color: THEME.text }}>{p.name}</span>
                <span style={{ marginInlineStart: "auto", fontSize: 10.5, color: THEME.text3 }}>
                  {t("mpPlanCfgSummary", { min: p.minModules ?? "—", max: p.maxModules ?? "—", n: (p.moduleUniverse || p.features || []).length })}
                </span>
              </button>
              {open && (
                <div style={{ padding: "0 12px 12px" }}>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
                    <label style={{ fontSize: 11, color: THEME.text2 }}>{t("mpMinModules")}
                      <input type="number" value={d.minModules} onChange={(e) => setPlanField(p.id, { minModules: e.target.value })} style={{ ...cellIn, width: 70, marginInlineStart: 6 }} /></label>
                    <label style={{ fontSize: 11, color: THEME.text2 }}>{t("mpMaxModules")}
                      <input type="number" value={d.maxModules} onChange={(e) => setPlanField(p.id, { maxModules: e.target.value })} style={{ ...cellIn, width: 70, marginInlineStart: 6 }} /></label>
                  </div>
                  <div style={{ fontSize: 10.5, color: THEME.text3, marginBottom: 4 }}>{t("mpUniverseHint")}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "4px 10px", maxHeight: 220, overflowY: "auto", border: `1px solid ${THEME.borderSoft}`, borderRadius: 8, padding: 8 }}>
                    {priceKeys.map((k) => {
                      const m = mp.find((x) => x.moduleKey === k);
                      if (m?.isFree) return null;
                      return (
                        <label key={k} style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 6, color: THEME.text2 }}>
                          <input type="checkbox" checked={(d.moduleUniverse || []).indexOf(k) > -1} onChange={() => toggleUni(p.id, k)} />
                          {m?.label || k}
                        </label>
                      );
                    })}
                  </div>
                  <button type="button" onClick={() => savePlanCfg(p)} disabled={busy}
                    style={{ ...styles.smallButton, background: THEME.teal, marginTop: 10, display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <Save size={13} /> {t("commonSave")}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  function upd(r, patch) {
    setSvc((rows) => rows.map((y) => (y === r ? { ...y, ...patch } : y)));
  }
}

const cellIn = { width: 110, padding: "5px 7px", border: `1px solid ${THEME.border}`, borderRadius: 7, background: THEME.surface, color: THEME.text, fontSize: 11.5, fontFamily: "monospace", textAlign: "end" };
const tdS = { padding: "4px 7px", borderBottom: `1px solid ${THEME.borderSoft}` };
