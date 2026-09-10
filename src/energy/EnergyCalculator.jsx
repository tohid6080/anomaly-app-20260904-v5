import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Zap, Plus, Trash2, Archive, ArchiveRestore, Save, X, SlidersHorizontal,
  History, ChevronDown, ChevronRight, Search, Printer, Download, PackagePlus, Star,
} from "lucide-react";
import { THEME, styles } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import ModuleSubHeader from "../shared/ModuleSubHeader.jsx";
import { JalaliDateInput, toJalaliSafe } from "../personnel/jalaliDate.jsx";
import {
  loadEnergyAssessments, createEnergyAssessment, updateEnergyAssessment,
  archiveEnergyAssessment, restoreEnergyAssessment, deleteEnergyAssessment,
  loadEnergyAudit, loadEnergyBank, upsertBankEquipment, deleteBankEquipment,
  loadEnergyTariff, EQUIP_CATEGORY_LABEL_KEYS,
} from "./energyApi.js";
import { computeEnergy, computeItem, PHASES, EQUIP_CATEGORIES, formulaNote } from "./energyCalcEngine.js";
import EnergyTariffManager from "./EnergyTariffManager.jsx";

/* ============================================================================ *
 * محاسبه و پایشِ مصرفِ برق — فهرست + فرم (Load List) + محاسبه‌ی لحظه‌ای +
 * داشبورد + بانکِ تجهیزات (استاندارد + اختصاصیِ Company/Project) + تعرفه‌ی
 * نسخه‌دار + Export/Print + Save to IHMS + Audit Trail. Mobile-first.
 * local draft تا کلیکِ صریحِ ذخیره؛ company-scoped؛ offlineWrite.
 * ============================================================================ */

const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

const EMPTY_FORM = {
  project: "", contractorId: "", contractorName: "", title: "", assessmentDate: "",
  notes: "", items: [],
};

let _seq = 0;
const rid = () => `it-${Date.now().toString(36)}-${(_seq += 1)}`;
const clone = (v) => JSON.parse(JSON.stringify(v ?? null));
const n = (v, d = 0) => { const x = parseFloat(v); return Number.isFinite(x) ? x : d; };
const fmt = (v, d = 1) => (v == null || !Number.isFinite(v) ? "—" : Number(v.toFixed(d)).toLocaleString("en-US"));
const fmtKwh = (v) => (v == null || !Number.isFinite(v) ? "—" : Number(Math.round(v)).toLocaleString("en-US"));

function blankItem(over = {}) {
  return {
    id: rid(), bankId: "", name: "", category: "other", ratingKind: "power",
    powerKw: "", currentA: "", voltageV: 400, phase: "three", pf: 0.85, qty: 1,
    hoursPerDay: 8, daysPerMonth: 26, monthsPerYear: 12, loadFactor: 1, dutyCycle: 1, notes: "",
    ...over,
  };
}
function itemFromBank(b) {
  return blankItem({
    bankId: b.id, name: b.name, category: b.category, ratingKind: b.ratingKind,
    powerKw: b.powerKw ?? "", currentA: b.currentA ?? "", voltageV: b.voltageV ?? 400,
    phase: b.phase, pf: b.pf ?? 0.85, loadFactor: b.loadFactor ?? 1, dutyCycle: b.dutyCycle ?? 1,
    notes: b.notes || "",
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

export default function EnergyCalculator({ currentUser, role, onBack, wide }) {
  const { t, dir, lang } = useLanguage();
  const actor = currentUser?.name || currentUser?.username || "";
  const card = wide ? styles.cardWide : styles.card;

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("list");     // list | edit | tariff
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [baseline, setBaseline] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState("");
  const [audit, setAudit] = useState([]);
  const [showAudit, setShowAudit] = useState(false);
  const [bank, setBank] = useState([]);
  const [tariff, setTariff] = useState(null);
  const [showBank, setShowBank] = useState(false);
  const [bankQ, setBankQ] = useState("");
  const [expandId, setExpandId] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const rows = await loadEnergyAssessments({ includeArchived: true });
    setList(Array.isArray(rows) ? rows : []);
    setLoading(false);
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    let alive = true;
    Promise.all([loadEnergyBank().catch(() => []), loadEnergyTariff().catch(() => null)]).then(([b, tf]) => {
      if (!alive) return;
      setBank(Array.isArray(b) ? b : []);
      setTariff(tf);
    });
    return () => { alive = false; };
  }, [mode]);

  const calc = useMemo(() => computeEnergy(form.items, tariff?.tariff), [form.items, tariff]);
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
      title: a.title, assessmentDate: a.assessmentDate, notes: a.notes,
      items: Array.isArray(a.items) && a.items.length ? clone(a.items) : [],
    };
    setEditId(a.id); setForm(f); setBaseline(clone(f)); setErr(""); setMode("edit");
    setAudit(await loadEnergyAudit(a.id));
  };

  const save = async () => {
    if (!form.title.trim() && !form.project.trim()) { setErr(t("enErrNeedTitle")); return; }
    if (!form.items.length) { setErr(t("enErrNeedItems")); return; }
    setSaving(true); setErr("");
    const rec = { ...form, tariffVersionId: tariff?.id || "", calc };
    const res = editId == null ? await createEnergyAssessment(rec, actor) : await updateEnergyAssessment(editId, rec, actor);
    setSaving(false);
    if (res?.__error) { setErr(res.message || t("commonErrorSave")); return; }
    await refresh();
    if (editId == null && res?.id) { openEdit(res); } else { setBaseline(clone(form)); if (editId) setAudit(await loadEnergyAudit(editId)); }
  };

  const doArchiveToggle = async (a) => {
    setBusyId(a.id);
    const res = a.archivedAt ? await restoreEnergyAssessment(a.id, actor) : await archiveEnergyAssessment(a.id, actor);
    setBusyId("");
    if (res?.__error) { setErr(res.message); return; }
    await refresh();
  };
  const doDelete = async (a) => {
    if (!window.confirm(t("enConfirmDelete"))) return;
    setBusyId(a.id);
    const res = await deleteEnergyAssessment(a.id, actor);
    setBusyId("");
    if (res?.__error) { setErr(res.message); return; }
    if (mode === "edit" && editId === a.id) { setMode("list"); setEditId(null); }
    await refresh();
  };

  const saveItemToBank = async (it) => {
    setBusyId(it.id);
    const res = await upsertBankEquipment({
      name: it.name || t("enUntitledItem"), category: it.category, ratingKind: it.ratingKind,
      powerKw: it.powerKw, currentA: it.currentA, voltageV: it.voltageV, phase: it.phase, pf: it.pf,
      loadFactor: it.loadFactor, dutyCycle: it.dutyCycle, notes: it.notes, project: form.project || "",
    }, actor);
    setBusyId("");
    if (res?.__error) { setErr(res.message); return; }
    patchItem(it.id, { bankId: res.id });
    setBank(await loadEnergyBank());
  };
  const removeBankEntry = async (b) => {
    if (!window.confirm(t("enConfirmDeleteBank"))) return;
    const res = await deleteBankEquipment(b.id);
    if (res?.__error) { setErr(res.message); return; }
    setBank(await loadEnergyBank());
  };

  const exportCsv = () => {
    const cur = calc.cost?.currency || tariff?.tariff?.currency || "";
    const head = ["name", "category", "phase", "V", "PF", "qty", "kW(nameplate)", "A(nameplate)", "LF", "duty", "installedKw", "actualKw", "dailyKwh", "monthlyKwh", "yearlyKwh", "share%"];
    const lines = calc.perItem.map((r) => [
      r.name, r.category, r.phase, r.voltageV, r.pf, r.qty, r.nameplateKw, r.nameplateA, r.loadFactor, r.dutyCycle,
      r.installedKw, r.actualKw, r.dailyKwh, r.monthlyKwh, r.yearlyKwh, r.sharePct,
    ].map((x) => (typeof x === "number" ? Math.round(x * 1000) / 1000 : `"${String(x).replace(/"/g, '""')}"`)).join(","));
    const totals = `\nTOTAL,,,,,,,,,,${Math.round(calc.totalInstalledKw)},${Math.round(calc.peakDemandKw)},${Math.round(calc.dailyKwh)},${Math.round(calc.monthlyKwh)},${Math.round(calc.yearlyKwh)},100`;
    const costLine = calc.cost ? `\n\nCost (${cur}),hourly,${Math.round(calc.cost.hourly)},daily,${Math.round(calc.cost.daily)},monthly,${Math.round(calc.cost.monthly)},yearly,${Math.round(calc.cost.yearly)}` : "";
    const csv = "﻿" + head.join(",") + "\n" + lines.join("\n") + totals + costLine;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `energy-${(form.title || form.project || "report").replace(/\s+/g, "_")}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  const printReport = () => {
    const cur = calc.cost?.currency || "";
    const rows = calc.perItem.map((r) => `<tr><td>${esc(r.name || "—")}</td><td>${t(EQUIP_CATEGORY_LABEL_KEYS[r.category] || "enCatOther")}</td><td>${fmt(r.nameplateKw, 2)}</td><td>${r.qty}</td><td>${fmt(r.actualKw, 2)}</td><td>${fmtKwh(r.yearlyKwh)}</td><td>${fmt(r.sharePct, 1)}%</td></tr>`).join("");
    const costBlock = calc.cost ? `<h3>${t("enCost")} (${cur})</h3><p>${t("enHourly")}: ${fmtKwh(calc.cost.hourly)} · ${t("enDaily")}: ${fmtKwh(calc.cost.daily)} · ${t("enMonthly")}: ${fmtKwh(calc.cost.monthly)} · ${t("enYearly")}: ${fmtKwh(calc.cost.yearly)}</p>` : `<p>${t("enNoTariff")}</p>`;
    const html = `<!doctype html><html dir="${dir}"><head><meta charset="utf-8"><title>${esc(form.title || form.project || "Energy report")}</title>
<style>body{font-family:Tahoma,Arial,sans-serif;margin:24px;color:#111;font-size:12px}h1{font-size:16px}h3{font-size:13px;margin:14px 0 4px}
table{border-collapse:collapse;width:100%;margin-top:6px}th,td{border:1px solid #bbb;padding:4px 6px;text-align:${dir === "rtl" ? "right" : "left"}}
.kpis{display:flex;flex-wrap:wrap;gap:12px;margin:8px 0}.kpi{border:1px solid #ccc;border-radius:6px;padding:8px 12px}.kpi b{display:block;font-size:15px}
.disc{margin-top:16px;font-size:10px;color:#555;line-height:1.6}</style></head><body>
<h1>${t("enReportTitle")}</h1>
<p>${esc(form.title || "—")} — ${esc(form.project || "—")} · ${esc(form.contractorName || "")} · ${form.assessmentDate ? toJalaliSafe(form.assessmentDate) : ""}</p>
<div class="kpis">
<div class="kpi">${t("enTotalInstalled")}<b>${fmt(calc.totalInstalledKw, 1)} kW</b></div>
<div class="kpi">${t("enPeakDemand")}<b>${fmt(calc.peakDemandKw, 1)} kW</b></div>
<div class="kpi">${t("enAvgLoad")}<b>${fmt(calc.averageLoadKw, 1)} kW</b></div>
<div class="kpi">${t("enLoadFactorLbl")}<b>${fmt(calc.loadFactorPct, 1)}%</b></div>
<div class="kpi">${t("enDailyKwh")}<b>${fmtKwh(calc.dailyKwh)}</b></div>
<div class="kpi">${t("enMonthlyKwh")}<b>${fmtKwh(calc.monthlyKwh)}</b></div>
<div class="kpi">${t("enYearlyKwh")}<b>${fmtKwh(calc.yearlyKwh)}</b></div>
</div>
${costBlock}
<h3>${t("enEquipmentList")} (${calc.itemCount})</h3>
<table><thead><tr><th>${t("enColName")}</th><th>${t("enColCategory")}</th><th>kW</th><th>${t("enColQty")}</th><th>${t("enColActualKw")}</th><th>${t("enYearlyKwh")}</th><th>${t("enColShare")}</th></tr></thead><tbody>${rows}</tbody></table>
<p class="disc">${t("enFormula")}: ${formulaNote("three")} &nbsp;|&nbsp; ${t("enDataSource")}: ${tariff?.isSystemDefault ? t("enTfUsingSystem") : t("enTfUsingCompanyV", { v: tariff?.version || 1 })}. ${t("enDisclaimer")}</p>
</body></html>`;
    const w = window.open("", "_blank");
    if (!w) { setErr(t("enPrintBlocked")); return; }
    w.document.open(); w.document.write(html); w.document.close();
    setTimeout(() => { try { w.print(); } catch { /* noop */ } }, 300);
  };

  // ---------------- list ----------------
  if (mode === "tariff") {
    return <EnergyTariffManager wide={wide} currentUser={currentUser} onBack={() => setMode("edit")} />;
  }

  if (mode === "list") {
    return (
      <div style={{ direction: dir }}>
        <ModuleSubHeader icon={Zap} title={t("moduleEnergyCalc")} note={t("enSubNote")} onBack={onBack} backLabel={t("commonBackPlain")} />
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <span style={{ fontSize: 12, color: THEME.text3 }}>{t("enCount", { n: list.length })}</span>
            <button type="button" onClick={openNew} style={{ ...styles.smallButton, background: THEME.teal, display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Plus size={14} /> {t("enNew")}
            </button>
          </div>
          {err && <p style={styles.error}>{err}</p>}
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
            {loading ? <p style={{ fontSize: 12.5, color: THEME.text3 }}>{t("commonLoading")}</p>
              : list.length === 0 ? <p style={{ fontSize: 12.5, color: THEME.text3 }}>{t("enEmpty")}</p>
                : list.map((a) => (
                  <div key={a.id} style={{ border: `1px solid ${THEME.cardBorder}`, borderRadius: THEME.radiusCard, padding: "12px 14px", background: THEME.cardBg, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", opacity: a.archivedAt ? 0.55 : 1 }}>
                    <button type="button" onClick={() => openEdit(a)} style={{ border: "none", background: "transparent", textAlign: "start", cursor: "pointer", flex: 1, minWidth: 0, padding: 0, fontFamily: THEME.font }}>
                      <div style={{ fontSize: 13.5, fontWeight: 800, color: THEME.text }}>{a.title || a.project || t("lpUntitled")}</div>
                      <div style={{ fontSize: 11.5, color: THEME.text3, marginTop: 3 }}>
                        {[a.project, a.contractorName, a.assessmentDate && toJalaliSafe(a.assessmentDate), a.calc?.yearlyKwh != null && `${fmtKwh(a.calc.yearlyKwh)} kWh/${t("enYr")}`].filter(Boolean).join("  ·  ")}
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
    return (b.name || "").toLowerCase().includes(bankQ.trim().toLowerCase());
  });

  return (
    <div style={{ direction: dir }}>
      <ModuleSubHeader icon={Zap} title={isNew ? t("enNewTitle") : t("enEditTitle")} note={t("enSubNote")}
        onBack={() => { setMode("list"); setEditId(null); }} backLabel={t("commonBackPlain")} />

      {/* metadata */}
      <div style={card}>
        <div style={styles.formGridWide}>
          <Field label={t("lpFieldTitle")}><input style={styles.input} value={form.title} onChange={(e) => set("title", e.target.value)} /></Field>
          <Field label={t("lpFieldProject")}><input style={styles.input} value={form.project} onChange={(e) => set("project", e.target.value)} /></Field>
          <Field label={t("lpFieldContractor")}><input style={styles.input} value={form.contractorName} onChange={(e) => set("contractorName", e.target.value)} /></Field>
          <Field label={t("lpFieldDate")}><JalaliDateInput value={form.assessmentDate} allowEmpty onChange={(v) => set("assessmentDate", v)} style={styles.input} /></Field>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <button type="button" onClick={() => setShowBank((s) => !s)} style={{ ...styles.smallButton, background: THEME.surface2, color: THEME.text, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <PackagePlus size={14} /> {t("enAddFromBank")}
          </button>
          <button type="button" onClick={addBlank} style={{ ...styles.smallButton, background: THEME.surface2, color: THEME.text, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Plus size={14} /> {t("enAddCustom")}
          </button>
          <button type="button" onClick={() => setMode("tariff")} style={{ ...styles.smallButton, background: THEME.surface2, color: THEME.text, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <SlidersHorizontal size={14} /> {t("enTariffTitle")}
          </button>
        </div>
        <p style={{ fontSize: 10.5, color: THEME.text3, marginTop: 8 }}>
          {tariff ? (tariff.isSystemDefault ? t("enTariffSystemHint") : t("enTfUsingCompanyV", { v: tariff.version })) : t("enTariffSystemHint")}
        </p>

        {showBank && (
          <div style={{ marginTop: 10, border: `1px solid ${THEME.borderSoft}`, borderRadius: 10, padding: 10, background: THEME.surface2 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 9, padding: "7px 10px", marginBottom: 8 }}>
              <Search size={14} color={THEME.text3} />
              <input value={bankQ} onChange={(e) => setBankQ(e.target.value)} placeholder={t("enBankSearch")}
                style={{ flex: 1, border: "none", outline: "none", background: "transparent", color: THEME.text, fontSize: 13, fontFamily: THEME.font }} />
            </div>
            <div style={{ maxHeight: 260, overflowY: "auto", display: "flex", flexDirection: "column", gap: 5 }}>
              {bankList.length === 0 ? <p style={{ fontSize: 11.5, color: THEME.text3, margin: 4 }}>{t("enBankEmpty")}</p>
                : bankList.map((b) => (
                  <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 8, background: THEME.surface, border: `1px solid ${THEME.borderSoft}` }}>
                    <button type="button" onClick={() => addFromBank(b)} style={{ border: "none", background: "transparent", cursor: "pointer", flex: 1, minWidth: 0, textAlign: "start", fontFamily: THEME.font, padding: 0 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: THEME.text }}>{b.name}</span>
                      <span style={{ fontSize: 10.5, color: THEME.text3, marginInlineStart: 6 }}>
                        {t(EQUIP_CATEGORY_LABEL_KEYS[b.category] || "enCatOther")} · {b.ratingKind === "current" ? `${fmt(b.currentA, 1)}A` : `${fmt(b.powerKw, 2)}kW`} · {b.phase === "single" ? t("enPhaseSingle") : b.phase === "dc" ? "DC" : t("enPhaseThree")}
                        {b.isSystem ? ` · ${t("enBankSystem")}` : b.project ? ` · ${b.project}` : ` · ${t("enBankCompany")}`}
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
        <h3 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 800, color: THEME.heading }}>{t("enEquipmentList")} ({form.items.length})</h3>
        {form.items.length === 0 && <p style={{ fontSize: 12, color: THEME.text3 }}>{t("enNoItems")}</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {form.items.map((it) => {
            const ci = computeItem(it);
            const open = expandId === it.id;
            return (
              <div key={it.id} style={{ border: `1px solid ${THEME.borderSoft}`, borderRadius: 10, background: THEME.surface2 }}>
                <button type="button" onClick={() => setExpandId(open ? null : it.id)}
                  style={{ width: "100%", border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, padding: "9px 11px", fontFamily: THEME.font, textAlign: "start" }}>
                  {open ? <ChevronDown size={15} color={THEME.text3} /> : <ChevronRight size={15} color={THEME.text3} />}
                  <span style={{ fontSize: 12.5, fontWeight: 800, color: THEME.text, flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {it.name || t("enUntitledItem")}
                  </span>
                  <span style={{ fontSize: 10.5, color: THEME.text3, fontFamily: MONO, whiteSpace: "nowrap" }}>
                    {fmt(ci.nameplateKw, 2)}kW · {fmt(ci.nameplateA, 0)}A · {fmtKwh(ci.yearlyKwh)} kWh/{t("enYr")}
                  </span>
                </button>
                {open && (
                  <div style={{ padding: "0 11px 11px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: "8px 10px" }}>
                      <Field label={t("enColName")} full><input style={smIn} value={it.name} onChange={(e) => patchItem(it.id, { name: e.target.value })} /></Field>
                      <Field label={t("enColCategory")}>
                        <select style={smIn} value={it.category} onChange={(e) => patchItem(it.id, { category: e.target.value })}>
                          {EQUIP_CATEGORIES.map((c) => <option key={c} value={c}>{t(EQUIP_CATEGORY_LABEL_KEYS[c])}</option>)}
                        </select>
                      </Field>
                      <Field label={t("enPhase")}>
                        <select style={smIn} value={it.phase} onChange={(e) => patchItem(it.id, { phase: e.target.value })}>
                          <option value="single">{t("enPhaseSingle")}</option>
                          <option value="three">{t("enPhaseThree")}</option>
                          <option value="dc">DC</option>
                        </select>
                      </Field>
                      <Field label={t("enRatingKind")}>
                        <select style={smIn} value={it.ratingKind} onChange={(e) => patchItem(it.id, { ratingKind: e.target.value })}>
                          <option value="power">{t("enRatingPower")}</option>
                          <option value="current">{t("enRatingCurrent")}</option>
                        </select>
                      </Field>
                      {it.ratingKind === "current"
                        ? <Field label={t("enCurrentA")}><input style={smIn} type="number" step="any" value={it.currentA} onChange={(e) => patchItem(it.id, { currentA: e.target.value })} /></Field>
                        : <Field label={t("enPowerKw")}><input style={smIn} type="number" step="any" value={it.powerKw} onChange={(e) => patchItem(it.id, { powerKw: e.target.value })} /></Field>}
                      <Field label={t("enVoltageV")}><input style={smIn} type="number" step="any" value={it.voltageV} onChange={(e) => patchItem(it.id, { voltageV: e.target.value })} /></Field>
                      {it.phase !== "dc" && <Field label={t("enPf")}><input style={smIn} type="number" step="any" value={it.pf} onChange={(e) => patchItem(it.id, { pf: e.target.value })} /></Field>}
                      <Field label={t("enQty")}><input style={smIn} type="number" step="1" value={it.qty} onChange={(e) => patchItem(it.id, { qty: e.target.value })} /></Field>
                      <Field label={t("enHoursPerDay")}><input style={smIn} type="number" step="any" value={it.hoursPerDay} onChange={(e) => patchItem(it.id, { hoursPerDay: e.target.value })} /></Field>
                      <Field label={t("enDaysPerMonth")}><input style={smIn} type="number" step="any" value={it.daysPerMonth} onChange={(e) => patchItem(it.id, { daysPerMonth: e.target.value })} /></Field>
                      <Field label={t("enMonthsPerYear")}><input style={smIn} type="number" step="any" value={it.monthsPerYear} onChange={(e) => patchItem(it.id, { monthsPerYear: e.target.value })} /></Field>
                      <Field label={t("enLoadFactor")}><input style={smIn} type="number" step="any" min="0" max="1" value={it.loadFactor} onChange={(e) => patchItem(it.id, { loadFactor: e.target.value })} /></Field>
                      <Field label={t("enDutyCycle")}><input style={smIn} type="number" step="any" min="0" max="1" value={it.dutyCycle} onChange={(e) => patchItem(it.id, { dutyCycle: e.target.value })} /></Field>
                      <Field label={t("enColNotes")} full><input style={smIn} value={it.notes} onChange={(e) => patchItem(it.id, { notes: e.target.value })} placeholder={t("enNotesHint")} /></Field>
                    </div>
                    <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap", fontSize: 11, color: THEME.text2, fontFamily: MONO }}>
                      <span>{t("enInstalledKw")}: <b>{fmt(ci.installedKw, 2)}</b></span>
                      <span>{t("enColActualKw")}: <b>{fmt(ci.actualKw, 2)}</b></span>
                      <span>{t("enDailyKwh")}: <b>{fmtKwh(ci.dailyKwh)}</b></span>
                      <span>{t("enMonthlyKwh")}: <b>{fmtKwh(ci.monthlyKwh)}</b></span>
                      <span>{t("enYearlyKwh")}: <b>{fmtKwh(ci.yearlyKwh)}</b></span>
                    </div>
                    <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                      <button type="button" onClick={() => saveItemToBank(it)} disabled={busyId === it.id}
                        style={{ ...styles.smallButton, background: THEME.surface, color: THEME.text2, border: `1px solid ${THEME.border}`, display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5 }}>
                        <Star size={12} /> {t("enSaveToBank")}
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
        <h3 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 800, color: THEME.heading }}>{t("enDashboard")}</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8 }}>
          <Kpi label={t("enTotalInstalled")} value={`${fmt(calc.totalInstalledKw, 1)} kW`} />
          <Kpi label={t("enPeakDemand")} value={`${fmt(calc.peakDemandKw, 1)} kW`} />
          <Kpi label={t("enAvgLoad")} value={`${fmt(calc.averageLoadKw, 1)} kW`} />
          <Kpi label={t("enLoadFactorLbl")} value={`${fmt(calc.loadFactorPct, 1)}%`} />
          <Kpi label={t("enDailyKwh")} value={fmtKwh(calc.dailyKwh)} />
          <Kpi label={t("enMonthlyKwh")} value={fmtKwh(calc.monthlyKwh)} />
          <Kpi label={t("enYearlyKwh")} value={fmtKwh(calc.yearlyKwh)} />
        </div>

        {calc.cost ? (
          <div style={{ marginTop: 12, border: `1px solid ${THEME.borderSoft}`, borderRadius: 10, padding: "10px 12px", background: THEME.surface2 }}>
            <div style={{ fontSize: 11.5, fontWeight: 800, color: THEME.heading, marginBottom: 6 }}>{t("enCost")} — {calc.cost.currency}</div>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12, fontFamily: MONO, color: THEME.text2 }}>
              <span>{t("enHourly")}: <b>{fmtKwh(calc.cost.hourly)}</b></span>
              <span>{t("enDaily")}: <b>{fmtKwh(calc.cost.daily)}</b></span>
              <span>{t("enMonthly")}: <b style={{ color: THEME.text }}>{fmtKwh(calc.cost.monthly)}</b></span>
              <span>{t("enYearly")}: <b style={{ color: THEME.text }}>{fmtKwh(calc.cost.yearly)}</b></span>
            </div>
          </div>
        ) : (
          <p style={{ fontSize: 11, color: THEME.warn, marginTop: 10 }}>{t("enNoTariff")}</p>
        )}

        {/* monthly trend */}
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: THEME.text3, marginBottom: 4 }}>{t("enTrend")}</div>
          <MiniBars values={calc.monthlySeriesKwh} />
        </div>

        {/* top 10 */}
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: THEME.text3, marginBottom: 4 }}>{t("enTop10")}</div>
          {calc.top10.length === 0 ? <p style={{ fontSize: 11.5, color: THEME.text3 }}>—</p>
            : calc.top10.map((r, i) => (
              <ShareRow key={r.id || i} label={r.name || t("enUntitledItem")} value={`${fmtKwh(r.yearlyKwh)} kWh`} pct={r.sharePct} />
            ))}
        </div>

        {/* by category */}
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: THEME.text3, marginBottom: 4 }}>{t("enByCategory")}</div>
          {calc.byCategory.map((c) => (
            <ShareRow key={c.category} label={t(EQUIP_CATEGORY_LABEL_KEYS[c.category] || "enCatOther")} value={`${fmtKwh(c.yearlyKwh)} kWh`} pct={c.sharePct} />
          ))}
        </div>

        <p style={{ fontSize: 10.5, color: THEME.text3, marginTop: 14, lineHeight: 1.8 }}>
          <b>{t("enFormula")}:</b> {t("enFormulaFull")}<br />
          <b>{t("enDataSource")}:</b> {tariff ? (tariff.isSystemDefault ? t("enTfUsingSystem") : t("enTfUsingCompanyV", { v: tariff.version })) : t("enTfUsingSystem")}<br />
          <b>{t("enAssumptions")}:</b> {t("enAssumptionsText", { d: calc.diversityFactor, h: calc.tariffUsed.hoursPerYear })}<br />
          {t("enDisclaimer")}
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
        <div key={i} title={`${M[i]}: ${fmtKwh(v)}`} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <div style={{ width: "100%", height: `${Math.max(2, (v / max) * 50)}px`, background: v > 0 ? THEME.tealDeep : THEME.borderSoft, borderRadius: "2px 2px 0 0" }} />
          <span style={{ fontSize: 8, color: THEME.text3 }}>{M[i]}</span>
        </div>
      ))}
    </div>
  );
}
