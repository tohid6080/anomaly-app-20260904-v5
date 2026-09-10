import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Fuel, Plus, Trash2, Archive, ArchiveRestore, Save, X, History,
  ChevronDown, ChevronRight, Search, Printer, Download, PackagePlus, Star,
} from "lucide-react";
import { THEME, styles } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import ModuleSubHeader from "../shared/ModuleSubHeader.jsx";
import { JalaliDateInput, toJalaliSafe } from "../personnel/jalaliDate.jsx";
import { loadMachineryList } from "../machinery/machineryApi.js";
import {
  loadFleetAssessments, createFleetAssessment, updateFleetAssessment,
  archiveFleetAssessment, restoreFleetAssessment, deleteFleetAssessment,
  loadFleetAudit, loadVehicleBank, upsertBankVehicle, deleteBankVehicle,
  FUEL_TYPE_LABEL_KEYS,
} from "./fleetFuelApi.js";
import { computeFleet, computeVehicle, FUEL_TYPES, FORMULA_NOTE } from "./fleetFuelCalcEngine.js";

/* ============================================================================ *
 * محاسبه‌ی مصرفِ سوختِ ناوگانِ خودرو — فهرست + فرم (ناوگان) + محاسبه‌ی لحظه‌ای
 * (شهری/جاده‌ای جداگانه، نسبتِ واقعیِ پیمایش) + داشبورد + مقایسه‌ی برآوردی با
 * واقعی + بانکِ خودرو (استاندارد + اختصاصیِ Company/Project) + Export/Print +
 * Save to IHMS + Audit Trail. Mobile-first، local draft، company-scoped.
 * ============================================================================ */

const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
const EMPTY_FORM = {
  project: "", contractorId: "", contractorName: "", title: "", assessmentDate: "",
  cityShareDefault: 0.6, notes: "", items: [],
};

let _seq = 0;
const rid = () => `fv-${Date.now().toString(36)}-${(_seq += 1)}`;
const clone = (v) => JSON.parse(JSON.stringify(v ?? null));
const fmt = (v, d = 1) => (v == null || !Number.isFinite(v) ? "—" : Number(v.toFixed(d)).toLocaleString("en-US"));
const fmtL = (v) => (v == null || !Number.isFinite(v) ? "—" : Number(Math.round(v)).toLocaleString("en-US"));

function blankItem(over = {}) {
  return {
    id: rid(), bankId: "", machineryId: "", brand: "", model: "", trim: "", engine: "", gearbox: "",
    fuelType: "gasoline", cityL100: "", highwayL100: "", combinedL100: "", source: "", plate: "", fleetCode: "",
    qty: 1, cityKmPerDay: "", highwayKmPerDay: "", kmPerDay: "", workDaysPerMonth: 26, activeMonthsPerYear: 12,
    useActual: false, actualLitersMonthly: "", actualKmMonthly: "", notes: "",
    ...over,
  };
}
function itemFromBank(b) {
  return blankItem({
    bankId: b.id, brand: b.brand, model: b.model, trim: b.trim, engine: b.engine, gearbox: b.gearbox,
    fuelType: b.fuelType, cityL100: b.cityL100 ?? "", highwayL100: b.highwayL100 ?? "", combinedL100: b.combinedL100 ?? "",
    source: b.source || "", plate: b.plate || "", fleetCode: b.fleetCode || "", notes: b.notes || "",
  });
}

function Field({ label, children, full }) {
  return (
    <div style={{ gridColumn: full ? "1 / -1" : undefined }}>
      <label style={{ ...styles.label, marginTop: 0, fontSize: 11 }}>{label}</label>
      {children}
    </div>
  );
}
const smIn = { ...styles.input, padding: "8px 10px", fontSize: 13 };

export default function FleetFuelCalculator({ currentUser, role, onBack, wide }) {
  const { t, dir } = useLanguage();
  const actor = currentUser?.name || currentUser?.username || "";
  const card = wide ? styles.cardWide : styles.card;

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("list");
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [baseline, setBaseline] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState("");
  const [audit, setAudit] = useState([]);
  const [showAudit, setShowAudit] = useState(false);
  const [bank, setBank] = useState([]);
  const [machinery, setMachinery] = useState([]);
  const [showBank, setShowBank] = useState(false);
  const [bankQ, setBankQ] = useState("");
  const [expandId, setExpandId] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const rows = await loadFleetAssessments({ includeArchived: true });
    setList(Array.isArray(rows) ? rows : []);
    setLoading(false);
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    let alive = true;
    Promise.all([loadVehicleBank().catch(() => []), loadMachineryList().catch(() => [])]).then(([b, m]) => {
      if (!alive) return;
      setBank(Array.isArray(b) ? b : []);
      setMachinery(Array.isArray(m) ? m : []);
    });
    return () => { alive = false; };
  }, [mode]);

  const opts = useMemo(() => ({ cityShareDefault: form.cityShareDefault }), [form.cityShareDefault]);
  const calc = useMemo(() => computeFleet(form.items, opts), [form.items, opts]);
  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(baseline), [form, baseline]);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const patchItem = (id, next) => setForm((p) => ({ ...p, items: p.items.map((it) => (it.id === id ? { ...it, ...next } : it)) }));
  const removeItem = (id) => setForm((p) => ({ ...p, items: p.items.filter((it) => it.id !== id) }));
  const addBlank = () => { const it = blankItem(); setForm((p) => ({ ...p, items: [...p.items, it] })); setExpandId(it.id); };
  const addFromBank = (b) => { const it = itemFromBank(b); setForm((p) => ({ ...p, items: [...p.items, it] })); setExpandId(it.id); };

  const openNew = () => { setEditId(null); setForm(clone(EMPTY_FORM)); setBaseline(clone(EMPTY_FORM)); setAudit([]); setErr(""); setMode("edit"); };
  const openEdit = async (a) => {
    const f = {
      project: a.project, contractorId: a.contractorId, contractorName: a.contractorName,
      title: a.title, assessmentDate: a.assessmentDate, cityShareDefault: a.cityShareDefault ?? 0.6, notes: a.notes,
      items: Array.isArray(a.items) && a.items.length ? clone(a.items) : [],
    };
    setEditId(a.id); setForm(f); setBaseline(clone(f)); setErr(""); setMode("edit");
    setAudit(await loadFleetAudit(a.id));
  };

  const save = async () => {
    if (!form.title.trim() && !form.project.trim()) { setErr(t("ffErrNeedTitle")); return; }
    if (!form.items.length) { setErr(t("ffErrNeedItems")); return; }
    setSaving(true); setErr("");
    const rec = { ...form, calc };
    const res = editId == null ? await createFleetAssessment(rec, actor) : await updateFleetAssessment(editId, rec, actor);
    setSaving(false);
    if (res?.__error) { setErr(res.message || t("commonErrorSave")); return; }
    await refresh();
    if (editId == null && res?.id) { openEdit(res); } else { setBaseline(clone(form)); if (editId) setAudit(await loadFleetAudit(editId)); }
  };

  const doArchiveToggle = async (a) => {
    setBusyId(a.id);
    const res = a.archivedAt ? await restoreFleetAssessment(a.id, actor) : await archiveFleetAssessment(a.id, actor);
    setBusyId("");
    if (res?.__error) { setErr(res.message); return; }
    await refresh();
  };
  const doDelete = async (a) => {
    if (!window.confirm(t("ffConfirmDelete"))) return;
    setBusyId(a.id);
    const res = await deleteFleetAssessment(a.id, actor);
    setBusyId("");
    if (res?.__error) { setErr(res.message); return; }
    if (mode === "edit" && editId === a.id) { setMode("list"); setEditId(null); }
    await refresh();
  };

  const saveItemToBank = async (it) => {
    setBusyId(it.id);
    const res = await upsertBankVehicle({
      brand: it.brand, model: it.model, trim: it.trim, engine: it.engine, gearbox: it.gearbox, fuelType: it.fuelType,
      cityL100: it.cityL100, highwayL100: it.highwayL100, combinedL100: it.combinedL100, source: it.source || t("ffSourceUserActual"),
      plate: it.plate, fleetCode: it.fleetCode, notes: it.notes, project: form.project || "",
    }, actor);
    setBusyId("");
    if (res?.__error) { setErr(res.message); return; }
    patchItem(it.id, { bankId: res.id });
    setBank(await loadVehicleBank());
  };
  const removeBankEntry = async (b) => {
    if (!window.confirm(t("ffConfirmDeleteBank"))) return;
    const res = await deleteBankVehicle(b.id);
    if (res?.__error) { setErr(res.message); return; }
    setBank(await loadVehicleBank());
  };

  const exportCsv = () => {
    const head = ["brand", "model", "plate", "fuel", "qty", "cityL100", "hwyL100", "cityKm/d", "hwyKm/d", "basis", "dailyL", "monthlyL", "yearlyL", "kmYear", "effL100", "share%", "actualMonthlyL", "delta%"];
    const lines = calc.perItem.map((r) => [
      r.brand, r.model, r.plate, r.fuelType, r.qty, r.cityRate, r.highwayRate, r.cityKmPerVeh, r.highwayKmPerVeh,
      r.basis, r.dailyLiters, r.monthlyLiters, r.yearlyLiters, r.kmYear, r.effL100, r.sharePct,
      r.actualMonthlyLiters ?? "", r.deltaPct ?? "",
    ].map((x) => (typeof x === "number" ? Math.round(x * 1000) / 1000 : `"${String(x).replace(/"/g, '""')}"`)).join(","));
    const totals = `\nTOTAL,,,,${calc.vehicleCount},,,,,,${Math.round(calc.dailyLiters)},${Math.round(calc.monthlyLiters)},${Math.round(calc.yearlyLiters)},${Math.round(calc.kmYear)},${fmt(calc.fleetEffL100, 2)},100,${calc.actualMonthlyLiters != null ? Math.round(calc.actualMonthlyLiters) : ""},${calc.fleetDeltaPct != null ? fmt(calc.fleetDeltaPct, 1) : ""}`;
    const csv = "﻿" + head.join(",") + "\n" + lines.join("\n") + totals;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `fleet-fuel-${(form.title || form.project || "report").replace(/\s+/g, "_")}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  const printReport = () => {
    const rows = calc.perItem.map((r) => `<tr><td>${esc((r.brand + " " + r.model).trim() || "—")}</td><td>${esc(r.plate || "")}</td><td>${r.qty}</td><td>${t(basisKey(r.basis))}</td><td>${fmtL(r.monthlyLiters)}</td><td>${fmtL(r.yearlyLiters)}</td><td>${fmt(r.effL100, 1)}</td><td>${fmt(r.sharePct, 1)}%</td></tr>`).join("");
    const cmp = calc.hasActual ? `<h3>${t("ffCompare")}</h3><p>${t("ffStdMonthly")}: ${fmtL(calc.stdMonthlyLiters)} L · ${t("ffActualMonthly")}: ${fmtL(calc.actualMonthlyLiters)} L · ${t("ffDelta")}: ${calc.fleetDeltaMonthly > 0 ? "+" : ""}${fmtL(calc.fleetDeltaMonthly)} L (${fmt(calc.fleetDeltaPct, 1)}%)</p>` : "";
    const html = `<!doctype html><html dir="${dir}"><head><meta charset="utf-8"><title>${esc(form.title || form.project || "Fleet fuel report")}</title>
<style>body{font-family:Tahoma,Arial,sans-serif;margin:24px;color:#111;font-size:12px}h1{font-size:16px}h3{font-size:13px;margin:14px 0 4px}
table{border-collapse:collapse;width:100%;margin-top:6px}th,td{border:1px solid #bbb;padding:4px 6px;text-align:${dir === "rtl" ? "right" : "left"}}
.kpis{display:flex;flex-wrap:wrap;gap:12px;margin:8px 0}.kpi{border:1px solid #ccc;border-radius:6px;padding:8px 12px}.kpi b{display:block;font-size:15px}
.disc{margin-top:16px;font-size:10px;color:#555;line-height:1.6}</style></head><body>
<h1>${t("ffReportTitle")}</h1>
<p>${esc(form.title || "—")} — ${esc(form.project || "—")} · ${esc(form.contractorName || "")} · ${form.assessmentDate ? toJalaliSafe(form.assessmentDate) : ""}</p>
<div class="kpis">
<div class="kpi">${t("ffFleetCount")}<b>${calc.vehicleCount}</b></div>
<div class="kpi">${t("ffKmYear")}<b>${fmtL(calc.kmYear)} km</b></div>
<div class="kpi">${t("ffDailyL")}<b>${fmtL(calc.dailyLiters)} L</b></div>
<div class="kpi">${t("ffMonthlyL")}<b>${fmtL(calc.monthlyLiters)} L</b></div>
<div class="kpi">${t("ffYearlyL")}<b>${fmtL(calc.yearlyLiters)} L</b></div>
<div class="kpi">${t("ffFleetAvg")}<b>${fmt(calc.fleetEffL100, 1)} L/100</b></div>
</div>
${cmp}
<h3>${t("ffVehicleList")} (${calc.itemCount})</h3>
<table><thead><tr><th>${t("ffColVehicle")}</th><th>${t("ffColPlate")}</th><th>${t("enColQty")}</th><th>${t("ffColBasis")}</th><th>${t("ffMonthlyL")}</th><th>${t("ffYearlyL")}</th><th>L/100</th><th>${t("enColShare")}</th></tr></thead><tbody>${rows}</tbody></table>
<p class="disc">${t("enFormula")}: ${FORMULA_NOTE} &nbsp;|&nbsp; ${t("ffDataSourceNote")} ${t("ffDisclaimer")}</p>
</body></html>`;
    const w = window.open("", "_blank");
    if (!w) { setErr(t("enPrintBlocked")); return; }
    w.document.open(); w.document.write(html); w.document.close();
    setTimeout(() => { try { w.print(); } catch { /* noop */ } }, 300);
  };

  // ---------------- list ----------------
  if (mode === "list") {
    return (
      <div style={{ direction: dir }}>
        <ModuleSubHeader icon={Fuel} title={t("moduleFleetFuel")} note={t("ffSubNote")} onBack={onBack} backLabel={t("commonBackPlain")} />
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <span style={{ fontSize: 12, color: THEME.text3 }}>{t("enCount", { n: list.length })}</span>
            <button type="button" onClick={openNew} style={{ ...styles.smallButton, background: THEME.teal, display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Plus size={14} /> {t("ffNew")}
            </button>
          </div>
          {err && <p style={styles.error}>{err}</p>}
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
            {loading ? <p style={{ fontSize: 12.5, color: THEME.text3 }}>{t("commonLoading")}</p>
              : list.length === 0 ? <p style={{ fontSize: 12.5, color: THEME.text3 }}>{t("ffEmpty")}</p>
                : list.map((a) => (
                  <div key={a.id} style={{ border: `1px solid ${THEME.cardBorder}`, borderRadius: THEME.radiusCard, padding: "12px 14px", background: THEME.cardBg, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", opacity: a.archivedAt ? 0.55 : 1 }}>
                    <button type="button" onClick={() => openEdit(a)} style={{ border: "none", background: "transparent", textAlign: "start", cursor: "pointer", flex: 1, minWidth: 0, padding: 0, fontFamily: THEME.font }}>
                      <div style={{ fontSize: 13.5, fontWeight: 800, color: THEME.text }}>{a.title || a.project || t("lpUntitled")}</div>
                      <div style={{ fontSize: 11.5, color: THEME.text3, marginTop: 3 }}>
                        {[a.project, a.contractorName, a.assessmentDate && toJalaliSafe(a.assessmentDate), a.calc?.yearlyLiters != null && `${fmtL(a.calc.yearlyLiters)} L/${t("enYr")}`].filter(Boolean).join("  ·  ")}
                      </div>
                    </button>
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      <IconBtn title={a.archivedAt ? t("lpRestore") : t("lpArchive")} onClick={() => doArchiveToggle(a)} disabled={busyId === a.id}>
                        {a.archivedAt ? <ArchiveRestore size={15} /> : <Archive size={15} />}
                      </IconBtn>
                      <IconBtn title={t("commonDelete")} danger onClick={() => doDelete(a)} disabled={busyId === a.id}><Trash2 size={15} /></IconBtn>
                    </div>
                  </div>
                ))}
          </div>
        </div>
      </div>
    );
  }

  // ---------------- editor ----------------
  const isNew = editId == null;
  const bankList = bank.filter((b) => {
    if (!b.isActive) return false;
    if (b.companyId && b.project && b.project !== (form.project || "")) return false;
    if (!bankQ.trim()) return true;
    return `${b.brand} ${b.model} ${b.trim}`.toLowerCase().includes(bankQ.trim().toLowerCase());
  });

  return (
    <div style={{ direction: dir }}>
      <ModuleSubHeader icon={Fuel} title={isNew ? t("ffNewTitle") : t("ffEditTitle")} note={t("ffSubNote")}
        onBack={() => { setMode("list"); setEditId(null); }} backLabel={t("commonBackPlain")} />

      <div style={card}>
        <div style={styles.formGridWide}>
          <Field label={t("lpFieldTitle")}><input style={styles.input} value={form.title} onChange={(e) => set("title", e.target.value)} /></Field>
          <Field label={t("lpFieldProject")}><input style={styles.input} value={form.project} onChange={(e) => set("project", e.target.value)} /></Field>
          <Field label={t("lpFieldContractor")}><input style={styles.input} value={form.contractorName} onChange={(e) => set("contractorName", e.target.value)} /></Field>
          <Field label={t("lpFieldDate")}><JalaliDateInput value={form.assessmentDate} allowEmpty onChange={(v) => set("assessmentDate", v)} style={styles.input} /></Field>
          <Field label={t("ffCityShare")}><input style={styles.input} type="number" step="any" min="0" max="1" value={form.cityShareDefault} onChange={(e) => set("cityShareDefault", e.target.value === "" ? 0.6 : Number(e.target.value))} /></Field>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <button type="button" onClick={() => setShowBank((s) => !s)} style={{ ...styles.smallButton, background: THEME.surface2, color: THEME.text, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <PackagePlus size={14} /> {t("ffAddFromBank")}
          </button>
          <button type="button" onClick={addBlank} style={{ ...styles.smallButton, background: THEME.surface2, color: THEME.text, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Plus size={14} /> {t("ffAddCustom")}
          </button>
        </div>
        <p style={{ fontSize: 10.5, color: THEME.text3, marginTop: 8 }}>{t("ffCityShareHint")}</p>

        {showBank && (
          <div style={{ marginTop: 10, border: `1px solid ${THEME.borderSoft}`, borderRadius: 10, padding: 10, background: THEME.surface2 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 9, padding: "7px 10px", marginBottom: 8 }}>
              <Search size={14} color={THEME.text3} />
              <input value={bankQ} onChange={(e) => setBankQ(e.target.value)} placeholder={t("ffBankSearch")}
                style={{ flex: 1, border: "none", outline: "none", background: "transparent", color: THEME.text, fontSize: 13, fontFamily: THEME.font }} />
            </div>
            <div style={{ maxHeight: 260, overflowY: "auto", display: "flex", flexDirection: "column", gap: 5 }}>
              {bankList.length === 0 ? <p style={{ fontSize: 11.5, color: THEME.text3, margin: 4 }}>{t("ffBankEmpty")}</p>
                : bankList.map((b) => (
                  <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 8, background: THEME.surface, border: `1px solid ${THEME.borderSoft}` }}>
                    <button type="button" onClick={() => addFromBank(b)} style={{ border: "none", background: "transparent", cursor: "pointer", flex: 1, minWidth: 0, textAlign: "start", fontFamily: THEME.font, padding: 0 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: THEME.text }}>{b.brand} {b.model}</span>
                      <span style={{ fontSize: 10.5, color: THEME.text3, marginInlineStart: 6 }}>
                        {[b.trim, b.engine, b.combinedL100 ? `${fmt(b.combinedL100, 1)} L/100` : null, b.isSystem ? t("enBankSystem") : b.project || t("enBankCompany")].filter(Boolean).join(" · ")}
                      </span>
                    </button>
                    <button type="button" onClick={() => addFromBank(b)} title={t("enAdd")} style={{ border: "none", background: THEME.teal, color: "#fff", borderRadius: 7, width: 26, height: 26, cursor: "pointer", flexShrink: 0 }}>+</button>
                    {!b.isSystem && (
                      <button type="button" onClick={() => removeBankEntry(b)} title={t("commonDelete")} style={{ border: "none", background: "transparent", color: THEME.danger, cursor: "pointer", padding: 2, flexShrink: 0 }}><X size={14} /></button>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* items */}
      <div style={card}>
        <h3 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 800, color: THEME.heading }}>{t("ffVehicleList")} ({form.items.length})</h3>
        {form.items.length === 0 && <p style={{ fontSize: 12, color: THEME.text3 }}>{t("ffNoItems")}</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {form.items.map((it) => {
            const ci = computeVehicle(it, opts);
            const open = expandId === it.id;
            return (
              <div key={it.id} style={{ border: `1px solid ${THEME.borderSoft}`, borderRadius: 10, background: THEME.surface2 }}>
                <button type="button" onClick={() => setExpandId(open ? null : it.id)}
                  style={{ width: "100%", border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, padding: "9px 11px", fontFamily: THEME.font, textAlign: "start" }}>
                  {open ? <ChevronDown size={15} color={THEME.text3} /> : <ChevronRight size={15} color={THEME.text3} />}
                  <span style={{ fontSize: 12.5, fontWeight: 800, color: THEME.text, flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {(it.brand + " " + it.model).trim() || t("ffUntitledItem")}{it.qty > 1 ? ` ×${it.qty}` : ""}
                  </span>
                  <span style={{ fontSize: 10.5, color: THEME.text3, fontFamily: MONO, whiteSpace: "nowrap" }}>
                    {fmt(ci.effL100, 1)} L/100 · {fmtL(ci.monthlyLiters)} L/{t("ffMo")} · {t(basisKey(ci.basis))}
                  </span>
                </button>
                {open && (
                  <div style={{ padding: "0 11px 11px" }}>
                    {machinery.length > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        <label style={{ ...styles.label, marginTop: 0, fontSize: 11 }}>{t("ffLinkMachinery")}</label>
                        <select style={smIn} value={it.machineryId || ""}
                          onChange={(e) => {
                            const mm = machinery.find((x) => x.id === e.target.value);
                            patchItem(it.id, mm
                              ? { machineryId: mm.id, brand: it.brand || (mm.machineName || "").split(" ")[0] || "", model: it.model || mm.machineName || "", plate: it.plate || mm.plateNumber || "" }
                              : { machineryId: "" });
                          }}>
                          <option value="">{t("ffMachineryNone")}</option>
                          {machinery.map((mm) => <option key={mm.id} value={mm.id}>{[mm.machineName, mm.plateNumber, mm.contractorName].filter(Boolean).join(" · ")}</option>)}
                        </select>
                      </div>
                    )}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: "8px 10px" }}>
                      <Field label={t("ffColBrand")}><input style={smIn} value={it.brand} onChange={(e) => patchItem(it.id, { brand: e.target.value })} /></Field>
                      <Field label={t("ffColModel")}><input style={smIn} value={it.model} onChange={(e) => patchItem(it.id, { model: e.target.value })} /></Field>
                      <Field label={t("ffColTrim")}><input style={smIn} value={it.trim} onChange={(e) => patchItem(it.id, { trim: e.target.value })} /></Field>
                      <Field label={t("ffColEngine")}><input style={smIn} value={it.engine} onChange={(e) => patchItem(it.id, { engine: e.target.value })} /></Field>
                      <Field label={t("ffColGearbox")}><input style={smIn} value={it.gearbox} onChange={(e) => patchItem(it.id, { gearbox: e.target.value })} /></Field>
                      <Field label={t("ffColFuel")}>
                        <select style={smIn} value={it.fuelType} onChange={(e) => patchItem(it.id, { fuelType: e.target.value })}>
                          {FUEL_TYPES.map((f) => <option key={f} value={f}>{t(FUEL_TYPE_LABEL_KEYS[f])}</option>)}
                        </select>
                      </Field>
                      <Field label={t("ffCityL100")}><input style={smIn} type="number" step="any" value={it.cityL100} onChange={(e) => patchItem(it.id, { cityL100: e.target.value })} /></Field>
                      <Field label={t("ffHighwayL100")}><input style={smIn} type="number" step="any" value={it.highwayL100} onChange={(e) => patchItem(it.id, { highwayL100: e.target.value })} /></Field>
                      <Field label={t("ffCombinedL100")}><input style={smIn} type="number" step="any" value={it.combinedL100} onChange={(e) => patchItem(it.id, { combinedL100: e.target.value })} /></Field>
                      <Field label={t("ffColSource")} full><input style={smIn} value={it.source} onChange={(e) => patchItem(it.id, { source: e.target.value })} placeholder={t("ffSourceHint")} /></Field>
                      <Field label={t("ffColPlate")}><input style={smIn} value={it.plate} onChange={(e) => patchItem(it.id, { plate: e.target.value })} /></Field>
                      <Field label={t("ffColFleetCode")}><input style={smIn} value={it.fleetCode} onChange={(e) => patchItem(it.id, { fleetCode: e.target.value })} /></Field>
                      <Field label={t("enQty")}><input style={smIn} type="number" step="1" value={it.qty} onChange={(e) => patchItem(it.id, { qty: e.target.value })} /></Field>
                      <Field label={t("ffCityKmDay")}><input style={smIn} type="number" step="any" value={it.cityKmPerDay} onChange={(e) => patchItem(it.id, { cityKmPerDay: e.target.value })} /></Field>
                      <Field label={t("ffHighwayKmDay")}><input style={smIn} type="number" step="any" value={it.highwayKmPerDay} onChange={(e) => patchItem(it.id, { highwayKmPerDay: e.target.value })} /></Field>
                      <Field label={t("ffKmDayFallback")}><input style={smIn} type="number" step="any" value={it.kmPerDay} onChange={(e) => patchItem(it.id, { kmPerDay: e.target.value })} placeholder={t("ffKmDayFallbackHint")} /></Field>
                      <Field label={t("enDaysPerMonth")}><input style={smIn} type="number" step="any" value={it.workDaysPerMonth} onChange={(e) => patchItem(it.id, { workDaysPerMonth: e.target.value })} /></Field>
                      <Field label={t("enMonthsPerYear")}><input style={smIn} type="number" step="any" value={it.activeMonthsPerYear} onChange={(e) => patchItem(it.id, { activeMonthsPerYear: e.target.value })} /></Field>
                    </div>

                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: THEME.text2, marginTop: 10 }}>
                      <input type="checkbox" checked={!!it.useActual} onChange={(e) => patchItem(it.id, { useActual: e.target.checked })} /> {t("ffUseActual")}
                    </label>
                    {it.useActual && (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "8px 10px", marginTop: 6 }}>
                        <Field label={t("ffActualLitersMonthly")}><input style={smIn} type="number" step="any" value={it.actualLitersMonthly} onChange={(e) => patchItem(it.id, { actualLitersMonthly: e.target.value })} /></Field>
                        <Field label={t("ffActualKmMonthly")}><input style={smIn} type="number" step="any" value={it.actualKmMonthly} onChange={(e) => patchItem(it.id, { actualKmMonthly: e.target.value })} /></Field>
                      </div>
                    )}
                    <Field label={t("enColNotes")} full><input style={{ ...smIn, marginTop: 8 }} value={it.notes} onChange={(e) => patchItem(it.id, { notes: e.target.value })} /></Field>

                    <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap", fontSize: 11, color: THEME.text2, fontFamily: MONO }}>
                      <span>{t("ffKmYear")}: <b>{fmtL(ci.kmYear)}</b></span>
                      <span>{t("ffDailyL")}: <b>{fmtL(ci.dailyLiters)}</b></span>
                      <span>{t("ffMonthlyL")}: <b>{fmtL(ci.monthlyLiters)}</b></span>
                      <span>{t("ffYearlyL")}: <b>{fmtL(ci.yearlyLiters)}</b></span>
                      {ci.deltaPct != null && <span style={{ color: ci.deltaPct > 0 ? THEME.danger : THEME.ok }}>{t("ffDelta")}: {ci.deltaPct > 0 ? "+" : ""}{fmt(ci.deltaPct, 1)}%</span>}
                    </div>
                    {ci.assumptions.length > 0 && (
                      <p style={{ fontSize: 10, color: THEME.warn, marginTop: 6 }}>
                        {t("ffAssumptions")}: {ci.assumptions.map((k) => t("ffAsm_" + k)).join(" · ")}
                      </p>
                    )}
                    <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                      <button type="button" onClick={() => saveItemToBank(it)} disabled={busyId === it.id}
                        style={{ ...styles.smallButton, background: THEME.surface, color: THEME.text2, border: `1px solid ${THEME.border}`, display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5 }}>
                        <Star size={12} /> {t("ffSaveToBank")}
                      </button>
                      <button type="button" onClick={() => removeItem(it.id)}
                        style={{ ...styles.smallButton, background: "transparent", color: THEME.danger, border: `1px solid ${THEME.danger}55`, display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5 }}>
                        <Trash2 size={12} /> {t("commonDelete")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* dashboard */}
      <div style={card}>
        <h3 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 800, color: THEME.heading }}>{t("ffDashboard")}</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8 }}>
          <Kpi label={t("ffFleetCount")} value={fmt(calc.vehicleCount, 0)} />
          <Kpi label={t("ffKmDay")} value={`${fmtL(calc.kmDay)} km`} />
          <Kpi label={t("ffKmMonth")} value={`${fmtL(calc.kmMonth)} km`} />
          <Kpi label={t("ffKmYear")} value={`${fmtL(calc.kmYear)} km`} />
          <Kpi label={t("ffDailyL")} value={`${fmtL(calc.dailyLiters)} L`} />
          <Kpi label={t("ffMonthlyL")} value={`${fmtL(calc.monthlyLiters)} L`} />
          <Kpi label={t("ffYearlyL")} value={`${fmtL(calc.yearlyLiters)} L`} />
          <Kpi label={t("ffFleetAvg")} value={`${fmt(calc.fleetEffL100, 1)} L/100`} />
        </div>

        {calc.hasActual && (
          <div style={{ marginTop: 12, border: `1px solid ${THEME.borderSoft}`, borderRadius: 10, padding: "10px 12px", background: THEME.surface2 }}>
            <div style={{ fontSize: 11.5, fontWeight: 800, color: THEME.heading, marginBottom: 6 }}>{t("ffCompare")}</div>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12, fontFamily: MONO, color: THEME.text2 }}>
              <span>{t("ffStdMonthly")}: <b>{fmtL(calc.stdMonthlyLiters)} L</b></span>
              <span>{t("ffActualMonthly")}: <b style={{ color: THEME.text }}>{fmtL(calc.actualMonthlyLiters)} L</b></span>
              <span style={{ color: (calc.fleetDeltaMonthly || 0) > 0 ? THEME.danger : THEME.ok }}>
                {t("ffDelta")}: <b>{(calc.fleetDeltaMonthly || 0) > 0 ? "+" : ""}{fmtL(calc.fleetDeltaMonthly)} L ({fmt(calc.fleetDeltaPct, 1)}%)</b>
              </span>
            </div>
          </div>
        )}

        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: THEME.text3, marginBottom: 4 }}>{t("ffTrend")}</div>
          <MiniBars values={calc.monthlySeriesLiters} />
        </div>

        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: THEME.text3, marginBottom: 4 }}>{t("ffTop10")}</div>
          {calc.top10.length === 0 ? <p style={{ fontSize: 11.5, color: THEME.text3 }}>—</p>
            : calc.top10.map((r, i) => (
              <ShareRow key={r.id || i} label={(r.brand + " " + r.model).trim() || t("ffUntitledItem")} value={`${fmtL(r.yearlyLiters)} L`} pct={r.sharePct} />
            ))}
        </div>

        {calc.assumptions.length > 0 && (
          <p style={{ fontSize: 10.5, color: THEME.warn, marginTop: 10 }}>
            {t("ffAssumptions")}: {calc.assumptions.map((k) => t("ffAsm_" + k)).join(" · ")}
          </p>
        )}
        <p style={{ fontSize: 10.5, color: THEME.text3, marginTop: 10, lineHeight: 1.8 }}>
          <b>{t("enFormula")}:</b> {FORMULA_NOTE}<br />
          <b>{t("enDataSource")}:</b> {t("ffDataSourceNote")}<br />
          {t("ffDisclaimer")}
        </p>
      </div>

      {err && <p style={styles.error}>{err}</p>}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4, marginBottom: 20 }}>
        <button type="button" onClick={save} disabled={saving || (!isNew && !dirty)}
          style={{ ...styles.smallButton, background: THEME.teal, opacity: saving || (!isNew && !dirty) ? 0.6 : 1, display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Save size={14} /> {saving ? t("commonSaving") : t("enSaveToIhms")}
        </button>
        <button type="button" onClick={printReport} style={{ ...styles.smallButton, background: THEME.surface2, color: THEME.text, display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Printer size={14} /> {t("enPrint")}
        </button>
        <button type="button" onClick={exportCsv} style={{ ...styles.smallButton, background: THEME.surface2, color: THEME.text, display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Download size={14} /> {t("enExportCsv")}
        </button>
      </div>

      {!isNew && (
        <div style={{ ...card, paddingTop: 12 }}>
          <button type="button" onClick={() => setShowAudit((s) => !s)}
            style={{ width: "100%", border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, padding: 0, fontFamily: THEME.font }}>
            {showAudit ? <ChevronDown size={16} color={THEME.text3} /> : <ChevronRight size={16} color={THEME.text3} />}
            <History size={15} color={THEME.tealDeep} />
            <span style={{ fontSize: 13, fontWeight: 800, color: THEME.heading }}>{t("lpAuditSection")} ({audit.length})</span>
          </button>
          {showAudit && (
            <div style={{ marginTop: 10 }}>
              {audit.length === 0 ? <p style={{ fontSize: 12, color: THEME.text3, margin: 0 }}>{t("lpNoAudit")}</p>
                : audit.map((a) => (
                  <div key={a.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "7px 0", borderBottom: `1px solid ${THEME.borderSoft}`, fontSize: 12 }}>
                    <span style={{ fontWeight: 700, color: THEME.text }}>{t("lpAudit_" + a.action) || a.action}</span>
                    <span style={{ color: THEME.text3, whiteSpace: "nowrap" }}>{a.actor || "—"} · {toJalaliSafe(a.createdAt)}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------- small pieces ---------------- */
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
function basisKey(b) { return b === "actual" ? "ffBasisActual" : "ffBasisStandard"; }

function IconBtn({ children, title, onClick, disabled, danger }) {
  return (
    <button type="button" title={title} aria-label={title} onClick={onClick} disabled={disabled}
      style={{ width: 30, height: 30, borderRadius: 8, display: "inline-flex", alignItems: "center", justifyContent: "center",
        border: `1px solid ${THEME.border}`, background: THEME.surface, cursor: disabled ? "default" : "pointer",
        color: danger ? THEME.danger : THEME.text2, opacity: disabled ? 0.5 : 1 }}>
      {children}
    </button>
  );
}
function Kpi({ label, value }) {
  return (
    <div style={{ border: `1px solid ${THEME.cardBorder}`, borderRadius: 10, padding: "9px 11px", background: THEME.cardBg }}>
      <div style={{ fontSize: 10, color: THEME.text3, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 800, color: THEME.text, fontFamily: MONO, fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </div>
  );
}
function ShareRow({ label, value, pct }) {
  const p = Math.max(0, Math.min(100, pct || 0));
  return (
    <div style={{ padding: "5px 0", borderBottom: `1px solid ${THEME.borderSoft}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 11.5 }}>
        <span style={{ color: THEME.text2, flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
        <span style={{ fontFamily: MONO, fontWeight: 700, color: THEME.text }}>{value} · {p.toFixed(1)}%</span>
      </div>
      <div style={{ height: 5, borderRadius: 3, background: THEME.surface2, marginTop: 3, overflow: "hidden" }}>
        <div style={{ width: `${p}%`, height: "100%", background: THEME.teal }} />
      </div>
    </div>
  );
}
function MiniBars({ values }) {
  const vals = Array.isArray(values) && values.length ? values : Array(12).fill(0);
  const max = Math.max(1, ...vals);
  const M = ["۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹", "۱۰", "۱۱", "۱۲"];
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 60 }}>
      {vals.map((v, i) => (
        <div key={i} title={`${M[i]}: ${fmtL(v)}`} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <div style={{ width: "100%", height: `${Math.max(2, (v / max) * 50)}px`, background: v > 0 ? THEME.tealDeep : THEME.borderSoft, borderRadius: "2px 2px 0 0" }} />
          <span style={{ fontSize: 8, color: THEME.text3 }}>{M[i]}</span>
        </div>
      ))}
    </div>
  );
}
