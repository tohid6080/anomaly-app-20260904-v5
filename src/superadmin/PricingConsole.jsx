import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Coins, Save, UploadCloud, Plus, Trash2, X } from "lucide-react";
import { THEME, styles } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import {
  loadModulePrices, saveModulePrice, loadServices, upsertService, deleteService,
  loadPricingGroups, savePricingGroups, loadPricingPublishInfo, publishPricingSnapshot,
} from "../pricingApi.js";
import { updatePlan, loadPlans } from "./superAdminApi.js";
import { syncNotificationTypesWithPlans } from "../systemConfigApi.js";

/* ============================================================================ *
 * کنسولِ یکپارچه‌ی «قیمت‌گذاری و پلن‌ها» — ادغامِ دو تبِ قبلی:
 *   ۱) ماتریسِ ماژول × پلن  (قیمتِ ماهانه/سالانه، رایگان به‌صورتِ نوارِ روشن/خاموش،
 *      و عضویتِ هر ماژول در هر پلن — همه در یک ردیف)
 *   ۲) تنظیماتِ پلن‌ها       (قیمتِ پلن، سقف‌ها، روزِ آزمایشی، بازه‌ی حداقل/حداکثرِ ماژول)
 *   ۳) نمای شرکت‌های فعلی    (کدام شرکت چه ماژول‌هایی فعال دارد — فقط‌خواندنی)
 *   ۴) خدمات و افزودنی‌ها
 *
 * «ذخیره» = نوشتنِ پیش‌نویس در جدول‌های زنده.  «انتشار» = عکسِ قیمت‌ها/خدمات را
 * برای صفحه‌ی خریدِ مشتری زنده می‌کند.  دسته‌بندی‌ها را خودِ مدیر می‌سازد و فقط
 * برچسبِ نمایشی‌اند (هیچ اثری بر دسترسی/قیمت ندارند).
 * کلیدِ هر ردیف === همان کلیدی که isModuleInPlan استفاده می‌کند.
 * ============================================================================ */

const clone = (v) => JSON.parse(JSON.stringify(v ?? null));
const fmt = (n) => Number(Math.round(Number(n) || 0)).toLocaleString("fa-IR");
const faInt = (n) => Number(n || 0).toLocaleString("fa-IR");

function planEntryFromPlan(p) {
  if (!p) return null;
  return {
    priceMonthly: p.priceMonthly || 0,
    priceYearly: p.priceYearly || 0,
    priceTotal: p.priceTotal || 0,
    minModules: p.minModules ?? "",
    maxModules: p.maxModules ?? "",
    maxUsers: p.maxUsers ?? "",
    maxPersonnel: p.maxPersonnel ?? "",
    trialDays: p.trialDays ?? "",
    features: Array.isArray(p.features) ? [...p.features] : [],
  };
}
function initPlanDraft(plans) {
  const d = {};
  (plans || []).forEach((p) => { d[p.id] = planEntryFromPlan(p); });
  return d;
}

export default function PricingConsole({ plans, companies, currentAdmin, onChanged }) {
  const { t, dir } = useLanguage();
  const actor = currentAdmin?.fullName || currentAdmin?.username || "";

  const [mp, setMp] = useState([]);
  const [mpBase, setMpBase] = useState([]);
  const [svc, setSvc] = useState([]);
  const [svcBase, setSvcBase] = useState([]);
  const [grp, setGrp] = useState({ groups: [], byModule: {} });
  const [grpBase, setGrpBase] = useState({ groups: [], byModule: {} });
  const [planDraft, setPlanDraft] = useState(() => initPlanDraft(plans));
  const [planBase, setPlanBase] = useState(() => initPlanDraft(plans));
  const [pubInfo, setPubInfo] = useState(undefined); // undefined=loading, null=never, {publishedAt}
  const [needsPublish, setNeedsPublish] = useState(false);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [collapsed, setCollapsed] = useState({});
  const [modQuery, setModQuery] = useState("");
  const [coQuery, setCoQuery] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    const [m, s, g, pi] = await Promise.all([
      loadModulePrices({ live: true }), loadServices({ live: true }),
      loadPricingGroups(), loadPricingPublishInfo(),
    ]);
    setMp(m); setMpBase(clone(m));
    setSvc(s); setSvcBase(clone(s));
    setGrp(g); setGrpBase(clone(g));
    setPubInfo(pi);
    setLoading(false);
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  // پلن‌ها از props می‌آیند؛ وقتی والد دوباره لود کرد و چیزی دستِ ما تغییرنکرده،
  // پیش‌نویسِ محلی را با نسخه‌ی تازه هم‌تراز کن (بدون از دست دادنِ ویرایشِ نشده).
  const planDirty = useMemo(() => JSON.stringify(planDraft) !== JSON.stringify(planBase), [planDraft, planBase]);
  useEffect(() => {
    if (planDirty) return;
    const fresh = initPlanDraft(plans);
    setPlanDraft(fresh); setPlanBase(clone(fresh));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plans]);

  const mpDirty = useMemo(() => JSON.stringify(mp) !== JSON.stringify(mpBase), [mp, mpBase]);
  const svcDirty = useMemo(() => JSON.stringify(svc) !== JSON.stringify(svcBase), [svc, svcBase]);
  const grpDirty = useMemo(() => JSON.stringify(grp) !== JSON.stringify(grpBase), [grp, grpBase]);
  const dirtyCount = useMemo(() => {
    let n = 0;
    mp.forEach((r) => { const b = mpBase.find((x) => x.moduleKey === r.moduleKey); if (!b || JSON.stringify(b) !== JSON.stringify(r)) n++; });
    svc.forEach((r) => { if (r.__new || JSON.stringify(svcBase.find((x) => x.id === r.id)) !== JSON.stringify(r)) n++; });
    Object.keys(planDraft).forEach((id) => { if (JSON.stringify(planDraft[id]) !== JSON.stringify(planBase[id])) n++; });
    if (grpDirty) n++;
    return n;
  }, [mp, mpBase, svc, svcBase, planDraft, planBase, grpDirty]);
  const anyDirty = mpDirty || svcDirty || grpDirty || planDirty;

  // ---------- گروه‌بندی ----------
  const groupList = grp.groups.length ? grp.groups : [{ id: "__ungrouped", name: t("pcUngrouped") }];
  const groupOf = (key) => {
    const gid = grp.byModule[key];
    return grp.groups.some((g) => g.id === gid) ? gid : groupList[0].id;
  };
  const setModuleGroup = (key, gid) => setGrp((g) => ({ ...g, byModule: { ...g.byModule, [key]: gid } }));
  const addGroup = () => setGrp((g) => {
    const base = g.groups.length ? g.groups : [];
    return { ...g, groups: [...base, { id: "g" + Date.now().toString(36), name: t("pcGroupNew") }] };
  });
  const renameGroup = (gid, name) => setGrp((g) => ({ ...g, groups: g.groups.map((x) => (x.id === gid ? { ...x, name: name || t("pcGroupNew") } : x)) }));
  const deleteGroup = (gid) => setGrp((g) => {
    const remaining = g.groups.filter((x) => x.id !== gid);
    const fallback = remaining[0]?.id || "";
    const byModule = { ...g.byModule };
    Object.keys(byModule).forEach((k) => { if (byModule[k] === gid) byModule[k] = fallback; });
    return { groups: remaining, byModule };
  });

  // ---------- ویرایشِ ردیف‌ها ----------
  const setRow = (k, patch) => setMp((rows) => rows.map((r) => (r.moduleKey === k ? { ...r, ...patch } : r)));
  const setSvcRow = (r, patch) => setSvc((rows) => rows.map((y) => (y === r ? { ...y, ...patch } : y)));
  const addSvc = () => setSvc((rows) => [...rows, { id: "", name: t("mpNewService"), description: "", priceMonthly: 0, priceYearly: 0, period: "monthly", sortOrder: (rows.length + 1) * 10, isActive: true, __new: true }]);
  const removeSvc = async (r) => {
    if (r.__new) { setSvc((rows) => rows.filter((x) => x !== r)); return; }
    if (!window.confirm(t("mpConfirmDeleteService"))) return;
    const res = await deleteService(r.id);
    if (res?.__error) { setErr(res.message); return; }
    await refresh();
  };

  const planField = (pid, patch) => setPlanDraft((d) => {
    const cur = d[pid] || planEntryFromPlan((plans || []).find((p) => p.id === pid)) || {};
    return { ...d, [pid]: { ...cur, ...patch } };
  });
  const togglePlanModule = (pid, key) => setPlanDraft((d) => {
    const cur = d[pid] || planEntryFromPlan((plans || []).find((p) => p.id === pid)) || { features: [] };
    const list = cur.features || [];
    const has = list.indexOf(key) > -1;
    return { ...d, [pid]: { ...cur, features: has ? list.filter((x) => x !== key) : [...list, key] } };
  });

  // ---------- ذخیره ----------
  const save = async () => {
    setBusy(true); setErr(""); setOk("");
    try {
      const changedMp = mp.filter((r) => { const b = mpBase.find((x) => x.moduleKey === r.moduleKey); return !b || JSON.stringify(b) !== JSON.stringify(r); });
      for (const r of changedMp) {
        const res = await saveModulePrice(r, actor);
        if (res?.__error) throw new Error(res.message || t("commonErrorSave"));
      }
      const changedSvc = svc.filter((r) => r.__new || JSON.stringify(svcBase.find((x) => x.id === r.id)) !== JSON.stringify(r));
      for (const r of changedSvc) {
        const res = await upsertService(r, actor);
        if (res?.__error) throw new Error(res.message || t("commonErrorSave"));
      }
      if (grpDirty) {
        const res = await savePricingGroups(grp, actor);
        if (res?.__error) throw new Error(res.message || t("commonErrorSave"));
      }
      const numOrNull = (v) => (v === "" || v == null ? null : Number(v));
      let planChanged = false;
      for (const id of Object.keys(planDraft)) {
        const d = planDraft[id];
        if (!d) continue;
        const b = planBase[id];
        if (b && JSON.stringify(d) === JSON.stringify(b)) continue;
        planChanged = true;
        const res = await updatePlan(id, {
          priceMonthly: Number(d.priceMonthly) || 0,
          priceYearly: Number(d.priceYearly) || 0,
          priceTotal: Number(d.priceTotal) || 0,
          minModules: numOrNull(d.minModules),
          maxModules: numOrNull(d.maxModules),
          maxUsers: numOrNull(d.maxUsers),
          maxPersonnel: numOrNull(d.maxPersonnel),
          trialDays: numOrNull(d.trialDays),
          features: Array.isArray(d.features) ? d.features : [],
        });
        if (res?.__error) throw new Error(res.message || t("commonErrorSave"));
      }
      if (planChanged) {
        try { await syncNotificationTypesWithPlans((await loadPlans()).map((p) => p.features)); } catch { /* بی‌اهمیت */ }
      }
      setBusy(false);
      setOk(t("pcSavedDraft"));
      setNeedsPublish(true);
      // پلن‌ها را از حقیقتِ سرور دوباره بساز تا حالتِ «ذخیره‌نشده» گیر نکند.
      try {
        const freshPlans = await loadPlans();
        const fresh = initPlanDraft(freshPlans);
        setPlanDraft(fresh); setPlanBase(clone(fresh));
      } catch { /* effect وابسته به prop خودش هم‌تراز می‌کند */ }
      await refresh();
      onChanged && onChanged();
    } catch (e) {
      setBusy(false);
      setErr(e.message || t("commonErrorSave"));
    }
  };

  const publish = async () => {
    if (anyDirty) { setErr(t("pcNeedSaveFirst")); return; }
    if (!window.confirm(t("pcPublishConfirm"))) return;
    setBusy(true); setErr(""); setOk("");
    const res = await publishPricingSnapshot({ modules: mp, services: svc }, actor);
    setBusy(false);
    if (res?.__error) { setErr(res.message || t("commonErrorSave")); return; }
    setOk(t("pcPublished"));
    setNeedsPublish(false);
    setPubInfo({ publishedAt: new Date().toISOString(), publishedBy: actor });
  };

  const cancel = async () => { await refresh(); setNeedsPublish(false); setErr(""); setOk(""); };

  if (loading) return <p style={{ color: THEME.text3, padding: 20 }}>{t("commonLoading")}</p>;

  const publishedChip = pubInfo === null
    ? { text: t("pcNeverPublished"), bg: THEME.warnBg, fg: THEME.warn }
    : (needsPublish
      ? { text: t("pcChipDraft"), bg: THEME.warnBg, fg: THEME.warn }
      : { text: t("pcChipPublished"), bg: THEME.okBg, fg: THEME.ok });

  return (
    <div style={{ direction: dir }}>
      <style>{CSS}</style>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
        <Coins size={17} color={THEME.tealDeep} />
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: THEME.heading }}>{t("pcTitle")}</h3>
        <span style={{ marginInlineStart: "auto", fontSize: 10.5, fontWeight: 800, padding: "3px 10px", borderRadius: 999, background: publishedChip.bg, color: publishedChip.fg }}>
          {publishedChip.text}
        </span>
      </div>
      <p style={{ fontSize: 11.5, color: THEME.text3, marginBottom: 12, lineHeight: 1.8 }}>{t("pcIntro")}</p>

      {/* نوارِ ذخیره / انتشار */}
      <div className="pc-actionbar">
        <span style={{ fontSize: 12, fontWeight: 700, color: dirtyCount ? THEME.warn : THEME.text2 }}>
          {dirtyCount ? t("pcDirtyN", { n: faInt(dirtyCount) }) : (needsPublish ? t("pcSavedDraft") : t("pcAllClean"))}
        </span>
        <div style={{ display: "flex", gap: 8, marginInlineStart: "auto", flexWrap: "wrap" }}>
          <button type="button" onClick={save} disabled={busy || !anyDirty}
            style={{ ...styles.smallButton, background: THEME.teal, opacity: busy || !anyDirty ? 0.55 : 1, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Save size={13} /> {t("pcSave")}
          </button>
          <button type="button" onClick={publish} disabled={busy || anyDirty}
            title={anyDirty ? t("pcNeedSaveFirst") : ""}
            style={{ ...styles.smallButton, background: THEME.navyMid, color: "#fff", opacity: busy || anyDirty ? 0.55 : 1, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <UploadCloud size={13} /> {pubInfo === null ? t("pcPublishFirst") : t("pcPublish")}
          </button>
          <button type="button" onClick={cancel} disabled={busy || (!anyDirty && !needsPublish)}
            style={{ ...styles.smallButton, background: THEME.surface2, color: THEME.text2, opacity: busy || (!anyDirty && !needsPublish) ? 0.55 : 1 }}>
            {t("pcCancel")}
          </button>
        </div>
      </div>
      {err && <p style={styles.error}>{err}</p>}
      {ok && <p style={{ ...styles.error, color: THEME.ok }}>{ok}</p>}

      {/* ---------- ۱) ماتریسِ ماژول × پلن ---------- */}
      <div style={{ ...styles.cardWide, marginBottom: 16 }}>
        <div className="pc-panelhead">
          <b style={{ fontSize: 13, color: THEME.heading }}>{t("pcMatrixTitle")}</b>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input value={modQuery} onChange={(e) => setModQuery(e.target.value)} placeholder={t("pcSearchModule")}
              style={{ ...cellIn, width: 150, fontFamily: THEME.font, textAlign: "start" }} />
            <button type="button" onClick={addGroup} style={{ ...styles.smallButton, background: THEME.surface2, color: THEME.text, display: "inline-flex", alignItems: "center", gap: 5 }}>
              <Plus size={12} /> {t("pcAddGroup")}
            </button>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="pc-matrix">
            <thead>
              <tr>
                <th className="pc-sticky">{t("mpColModule")}</th>
                <th>{t("mpColMonthly")}</th>
                <th>{t("mpColYearly")}</th>
                <th>{t("mpColFree")}</th>
                {plans.map((p) => <th key={p.id}>{p.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {groupList.map((g) => {
                const rows = mp.filter((r) => groupOf(r.moduleKey) === g.id && (!modQuery || (r.label || r.moduleKey).indexOf(modQuery) > -1));
                const isReal = grp.groups.some((x) => x.id === g.id);
                return (
                  <React.Fragment key={g.id}>
                    <tr className="pc-grouprow">
                      <td className="pc-sticky" colSpan={4 + plans.length}>
                        <button type="button" className="pc-caret" onClick={() => setCollapsed((c) => ({ ...c, [g.id]: !c[g.id] }))}>
                          {collapsed[g.id] ? "▸" : "▾"}
                        </button>
                        {isReal ? (
                          <input className="pc-groupname" value={g.name} onChange={(e) => renameGroup(g.id, e.target.value)} />
                        ) : (
                          <span style={{ fontWeight: 800 }}>{g.name}</span>
                        )}
                        <span className="pc-groupcount">({faInt(rows.length)})</span>
                        {isReal && grp.groups.length > 1 && (
                          <button type="button" className="pc-groupdel" title={t("pcDeleteGroup")} onClick={() => deleteGroup(g.id)}><X size={12} /></button>
                        )}
                      </td>
                    </tr>
                    {!collapsed[g.id] && rows.map((r) => (
                      <tr key={r.moduleKey}>
                        <td className="pc-sticky">
                          <div style={{ fontWeight: 600, color: THEME.text }}>{r.label || r.moduleKey}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                            <span style={{ fontFamily: "monospace", fontSize: 9.5, color: THEME.text3 }}>{r.moduleKey}</span>
                            <select className="pc-grpsel" value={groupOf(r.moduleKey)} onChange={(e) => setModuleGroup(r.moduleKey, e.target.value)}>
                              {(grp.groups.length ? grp.groups : groupList).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                            </select>
                          </div>
                        </td>
                        <td>
                          <input type="number" step="100000" disabled={r.isFree} value={r.priceMonthly}
                            onChange={(e) => setRow(r.moduleKey, { priceMonthly: e.target.value === "" ? "" : Number(e.target.value) })} style={cellIn} />
                        </td>
                        <td>
                          <input type="number" step="100000" disabled={r.isFree} value={r.priceYearly}
                            onChange={(e) => setRow(r.moduleKey, { priceYearly: e.target.value === "" ? "" : Number(e.target.value) })} style={cellIn} />
                        </td>
                        <td>
                          <label className="pc-toggle">
                            <input type="checkbox" checked={!!r.isFree}
                              onChange={(e) => setRow(r.moduleKey, { isFree: e.target.checked, ...(e.target.checked ? { priceMonthly: 0, priceYearly: 0 } : {}) })} />
                            <span className="pc-track"><span className="pc-knob" /></span>
                          </label>
                        </td>
                        {plans.map((p) => {
                          const feats = planDraft[p.id]?.features || p.features || [];
                          const on = feats.indexOf(r.moduleKey) > -1;
                          return (
                            <td key={p.id}>
                              <button type="button" className={"pc-pill" + (on ? " on" : "")} onClick={() => togglePlanModule(p.id, r.moduleKey)}>
                                {on ? "✓" : ""}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
              {mp.length === 0 && <tr><td colSpan={4 + plans.length} style={{ padding: 16, textAlign: "center", color: THEME.text3 }}>{t("commonNoData")}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------- ۲) تنظیماتِ پلن‌ها ---------- */}
      <div style={{ ...styles.cardWide, marginBottom: 16 }}>
        <b style={{ fontSize: 13, color: THEME.heading }}>{t("pcPlanCfgTitle")}</b>
        <p style={{ fontSize: 11, color: THEME.text3, margin: "4px 0 10px", lineHeight: 1.8 }}>{t("pcPlanCfgIntro")}</p>
        <div style={{ overflowX: "auto" }}>
          <table className="pc-matrix">
            <thead>
              <tr><th className="pc-sticky">{t("pcColProp")}</th>{plans.map((p) => <th key={p.id}>{p.name}</th>)}</tr>
            </thead>
            <tbody>
              {PLAN_ROWS.map((row) => (
                <tr key={row.key}>
                  <td className="pc-sticky" style={{ fontWeight: 700, color: THEME.text2 }}>{t(row.labelKey)}</td>
                  {plans.map((p) => {
                    const pd = planDraft[p.id] || planEntryFromPlan(p) || {};
                    return (
                      <td key={p.id}>
                        <input type="number" value={pd[row.key] ?? ""}
                          onChange={(e) => planField(p.id, { [row.key]: e.target.value })}
                          style={{ ...cellIn, width: row.wide ? 118 : 78 }} />
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="pc-computed">
                <td className="pc-sticky" style={{ fontWeight: 700, color: THEME.text2 }}>{t("pcSelCount")}</td>
                {plans.map((p) => {
                  const feats = (planDraft[p.id] || planEntryFromPlan(p) || {}).features || [];
                  return <td key={p.id} style={mono}>{faInt(feats.length)}</td>;
                })}
              </tr>
              <tr className="pc-computed">
                <td className="pc-sticky" style={{ fontWeight: 700, color: THEME.text2 }}>{t("pcSumPrice")}</td>
                {plans.map((p) => {
                  const feats = (planDraft[p.id] || planEntryFromPlan(p) || {}).features || [];
                  return <td key={p.id} style={mono}>{fmt(sumModulePrices(feats, mp))}</td>;
                })}
              </tr>
              <tr className="pc-computed">
                <td className="pc-sticky" style={{ fontWeight: 700, color: THEME.text2 }}>{t("pcBundleDiscount")}</td>
                {plans.map((p) => {
                  const pd = planDraft[p.id] || planEntryFromPlan(p) || {};
                  const d = sumModulePrices(pd.features || [], mp) - (Number(pd.priceMonthly) || 0);
                  return <td key={p.id} style={{ ...mono, color: d > 0 ? THEME.ok : d < 0 ? THEME.warn : THEME.text3 }}>{d === 0 ? "—" : (d > 0 ? "↓ " : "↑ ") + fmt(Math.abs(d))}</td>;
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------- ۳) شرکت‌های فعلی ---------- */}
      <div style={{ ...styles.cardWide, marginBottom: 16 }}>
        <div className="pc-panelhead">
          <b style={{ fontSize: 13, color: THEME.heading }}>{t("pcCompaniesTitle")}</b>
          <input value={coQuery} onChange={(e) => setCoQuery(e.target.value)} placeholder={t("pcSearchCompany")}
            style={{ ...cellIn, width: 160, fontFamily: THEME.font, textAlign: "start" }} />
        </div>
        <p style={{ fontSize: 11, color: THEME.text3, margin: "0 0 10px", lineHeight: 1.8 }}>{t("pcCompaniesIntro")}</p>
        <CompaniesMatrix companies={companies} plans={plans} mp={mp} query={coQuery} t={t} />
      </div>

      {/* ---------- ۴) خدمات ---------- */}
      <div style={styles.cardWide}>
        <div className="pc-panelhead">
          <b style={{ fontSize: 13, color: THEME.heading }}>{t("mpServicesTitle")}</b>
          <button type="button" onClick={addSvc} style={{ ...styles.smallButton, background: THEME.surface2, color: THEME.text, display: "inline-flex", alignItems: "center", gap: 5 }}>
            <Plus size={12} /> {t("mpAddService")}
          </button>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="pc-matrix">
            <thead><tr>
              <th className="pc-sticky">{t("mpSvcName")}</th><th>{t("mpColMonthly")}</th><th>{t("mpColYearly")}</th>
              <th>{t("mpSvcPeriod")}</th><th>{t("mpSvcDesc")}</th><th>{t("commonActive")}</th><th />
            </tr></thead>
            <tbody>
              {svc.map((r, i) => (
                <tr key={r.id || "new" + i}>
                  <td className="pc-sticky"><input value={r.name} onChange={(e) => setSvcRow(r, { name: e.target.value })} style={{ ...cellIn, width: 150, fontFamily: THEME.font, textAlign: "start" }} /></td>
                  <td><input type="number" step="100000" value={r.priceMonthly} onChange={(e) => setSvcRow(r, { priceMonthly: Number(e.target.value) || 0 })} style={cellIn} /></td>
                  <td><input type="number" step="100000" value={r.priceYearly} onChange={(e) => setSvcRow(r, { priceYearly: Number(e.target.value) || 0 })} style={cellIn} /></td>
                  <td>
                    <select value={r.period} onChange={(e) => setSvcRow(r, { period: e.target.value })} style={{ ...cellIn, width: 90 }}>
                      <option value="monthly">{t("mpPeriodMonthly")}</option>
                      <option value="yearly">{t("mpPeriodYearly")}</option>
                      <option value="once">{t("mpPeriodOnce")}</option>
                    </select>
                  </td>
                  <td><input value={r.description} onChange={(e) => setSvcRow(r, { description: e.target.value })} style={{ ...cellIn, width: 180, fontFamily: THEME.font, textAlign: "start" }} /></td>
                  <td>
                    <label className="pc-toggle">
                      <input type="checkbox" checked={r.isActive !== false} onChange={(e) => setSvcRow(r, { isActive: e.target.checked })} />
                      <span className="pc-track"><span className="pc-knob" /></span>
                    </label>
                  </td>
                  <td><button type="button" onClick={() => removeSvc(r)} style={{ border: "none", background: "transparent", color: THEME.danger, cursor: "pointer" }}><Trash2 size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ---------------- شرکت‌های فعلی — ماتریسِ فقط‌خواندنی ---------------- */
function CompaniesMatrix({ companies, plans, mp, query, t }) {
  const planById = useMemo(() => { const m = {}; (plans || []).forEach((p) => { m[p.id] = p; }); return m; }, [plans]);
  const list = (companies || []).filter((c) => !query || (c.name || "").indexOf(query) > -1);
  const activeSet = (c) => {
    const keys = Array.isArray(c.moduleOverrides) ? c.moduleOverrides : (planById[c.planId]?.features || []);
    return new Set(keys);
  };
  const stColor = (s) => (s === "active" ? THEME.ok : s === "disabled" ? THEME.text3 : s === "expired" ? THEME.danger : THEME.warn);
  const avg = list.length ? Math.round(list.reduce((a, c) => a + activeSet(c).size, 0) / list.length) : 0;
  const customN = list.filter((c) => Array.isArray(c.moduleOverrides)).length;

  return (
    <>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 11.5, color: THEME.text2, marginBottom: 8 }}>
        <span><b style={{ color: THEME.text }}>{faInt(list.length)}</b> {t("pcSumCompanies")}</span>
        <span>{t("pcSumAvg")}: <b style={{ color: THEME.text }}>{faInt(avg)}</b></span>
        <span><b style={{ color: THEME.text }}>{faInt(customN)}</b> {t("pcSumCustom")}</span>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table className="pc-matrix pc-co">
          <thead>
            <tr>
              <th className="pc-sticky">{t("pcColCompany")}</th>
              {mp.map((m) => <th key={m.moduleKey} title={m.label || m.moduleKey}>{shortLabel(m.label || m.moduleKey)}</th>)}
            </tr>
          </thead>
          <tbody>
            {list.map((c) => {
              const set = activeSet(c);
              const plan = planById[c.planId];
              return (
                <tr key={c.id}>
                  <td className="pc-sticky">
                    <div style={{ fontWeight: 700, color: THEME.text, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      {c.name}
                      {Array.isArray(c.moduleOverrides) && <span style={{ fontSize: 8.5, fontWeight: 800, padding: "1px 6px", borderRadius: 999, background: THEME.warnBg, color: THEME.warn }}>{t("pcCustomTag")}</span>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                      <span style={{ fontSize: 9, fontWeight: 800, padding: "1px 7px", borderRadius: 999, background: THEME.tealSoft, color: THEME.tealDeep }}>{plan?.name || "—"}</span>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: stColor(c.subscriptionStatus), display: "inline-block" }} />
                      <span style={{ fontSize: 10, fontFamily: "monospace", color: THEME.text3 }}>{faInt(set.size)}/{faInt(mp.length)}</span>
                    </div>
                  </td>
                  {mp.map((m) => (
                    <td key={m.moduleKey} style={{ color: set.has(m.moduleKey) ? THEME.teal : THEME.border, fontSize: set.has(m.moduleKey) ? 14 : 11 }}
                      title={c.name + " — " + (m.label || m.moduleKey)}>●</td>
                  ))}
                </tr>
              );
            })}
            {list.length === 0 && <tr><td colSpan={1 + mp.length} style={{ padding: 16, textAlign: "center", color: THEME.text3 }}>{t("commonNoData")}</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

function shortLabel(s) {
  const parts = String(s).split(/\s|‌/).filter(Boolean);
  return parts.length > 2 ? parts.slice(0, 2).join(" ") : s;
}
function sumModulePrices(features, mp) {
  if (!Array.isArray(features)) return 0;
  const byKey = {};
  (mp || []).forEach((m) => { byKey[m.moduleKey] = m; });
  return features.reduce((a, k) => {
    const m = byKey[k];
    if (!m || m.isFree) return a;
    return a + (Number(m.priceMonthly) || 0);
  }, 0);
}

const PLAN_ROWS = [
  { key: "priceMonthly", labelKey: "saMonthlyPriceToman", wide: true },
  { key: "priceYearly", labelKey: "saYearlyPriceToman", wide: true },
  { key: "priceTotal", labelKey: "saPfPriceTotal", wide: true },
  { key: "minModules", labelKey: "mpMinModules" },
  { key: "maxModules", labelKey: "mpMaxModules" },
  { key: "maxUsers", labelKey: "saColUserCap" },
  { key: "maxPersonnel", labelKey: "saColPersonnelCap" },
  { key: "trialDays", labelKey: "saPfTrialDays" },
];

const cellIn = { width: 96, padding: "5px 7px", border: `1px solid ${THEME.border}`, borderRadius: 7, background: THEME.surface, color: THEME.text, fontSize: 11.5, fontFamily: "monospace", textAlign: "center", boxSizing: "border-box" };
const mono = { fontFamily: "monospace", fontWeight: 700, color: THEME.text2 };

const CSS = `
.pc-actionbar{position:sticky;top:0;z-index:6;display:flex;align-items:center;gap:10px;flex-wrap:wrap;
  background:var(--ihms-surface-2,#12313f);border:1px solid var(--ihms-border,#20404f);border-radius:10px;padding:9px 12px;margin-bottom:12px}
.pc-panelhead{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px}
.pc-matrix{width:100%;border-collapse:separate;border-spacing:0;font-size:12px;min-width:640px}
.pc-matrix thead th{position:sticky;top:0;z-index:3;background:var(--ihms-surface-2,#12313f);font-size:10px;font-weight:800;
  color:var(--ihms-text3,#6a8492);padding:7px 8px;text-align:center;white-space:nowrap;border-bottom:1px solid var(--ihms-border,#20404f)}
.pc-matrix thead th.pc-sticky{z-index:5;text-align:start;min-width:200px;inset-inline-start:0}
.pc-matrix td{padding:6px 8px;text-align:center;border-bottom:1px solid var(--ihms-border-soft,#1a3543);vertical-align:middle}
.pc-matrix td.pc-sticky{position:sticky;inset-inline-start:0;z-index:2;background:var(--ihms-surface,#0f2a3a);text-align:start;min-width:200px}
.pc-matrix tr:hover td{background:var(--ihms-surface-2,#12313f)}
.pc-matrix tr:hover td.pc-sticky{background:var(--ihms-surface-2,#12313f)}
.pc-grouprow td{background:var(--ihms-navy-deep,#0b2130);padding:6px 8px;text-align:start;position:sticky;inset-inline-start:0}
.pc-caret{border:none;background:transparent;color:var(--ihms-teal,#16c0ad);cursor:pointer;font-size:12px;padding:0 6px 0 0}
.pc-groupname{border:1px solid transparent;background:transparent;color:#e4eef2;font-family:inherit;font-size:12px;font-weight:800;
  border-radius:5px;padding:2px 6px;max-width:220px}
.pc-groupname:hover,.pc-groupname:focus{border-color:var(--ihms-teal,#16c0ad);outline:none}
.pc-groupcount{color:#9fbfc9;font-size:10.5px;margin-inline-start:6px}
.pc-groupdel{border:none;background:transparent;color:#9fbfc9;cursor:pointer;vertical-align:middle;margin-inline-start:6px}
.pc-groupdel:hover{color:#fff}
.pc-grpsel{border:1px solid var(--ihms-border,#20404f);background:var(--ihms-bg,#081019);color:var(--ihms-text3,#6a8492);
  border-radius:5px;font-size:10px;font-family:inherit;padding:1px 4px;max-width:140px}
.pc-computed td{background:var(--ihms-surface-2,#12313f)}
.pc-co td{padding:5px 6px}
.pc-co thead th{min-width:40px;max-width:52px;font-size:9px;line-height:1.35;white-space:normal;padding:6px 3px}

.pc-toggle{position:relative;display:inline-flex;cursor:pointer}
.pc-toggle input{position:absolute;opacity:0;width:0;height:0}
.pc-track{width:38px;height:21px;border-radius:999px;background:var(--ihms-border,#20404f);transition:background .15s;position:relative;flex-shrink:0}
.pc-knob{position:absolute;top:2px;inset-inline-start:2px;width:17px;height:17px;border-radius:50%;background:#fff;
  transition:inset-inline-start .15s;box-shadow:0 1px 3px rgba(0,0,0,.35)}
.pc-toggle input:checked + .pc-track{background:var(--ihms-teal,#16c0ad)}
.pc-toggle input:checked + .pc-track .pc-knob{inset-inline-start:19px}

.pc-pill{width:32px;height:24px;border-radius:7px;border:1.5px solid var(--ihms-border,#20404f);background:transparent;
  color:var(--ihms-text3,#6a8492);cursor:pointer;font-size:12px;font-weight:800;line-height:1}
.pc-pill:hover{border-color:var(--ihms-teal,#16c0ad)}
.pc-pill.on{background:var(--ihms-teal,#16c0ad);border-color:var(--ihms-teal,#16c0ad);color:#fff}
`;
