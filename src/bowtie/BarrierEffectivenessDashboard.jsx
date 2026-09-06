import React, { useState, useEffect, useMemo } from "react";
import { ShieldCheck, AlertTriangle, TrendingDown, TrendingUp, Minus, RefreshCw, Sliders, Link2, ChevronLeft, Send } from "lucide-react";
import { styles, THEME } from "../shared.js";
import { toJalaliSafe, JalaliDateInput } from "../personnel/jalaliDate.jsx";
import { effectivenessMeta } from "./bowtieApi.js";
import { loadDashboardData, loadBarrierHistory, loadBarrierEvidence, recalculateBarrierDbee, recalculateAllBarriersDbee } from "./dbeeEngine.js";
import { createCorrectiveAction } from "../correctiveActions/correctiveActionsApi.js";
import DbeeWeightsManager from "./DbeeWeightsManager.jsx";
import DbeeTypeMappingManager from "./DbeeTypeMappingManager.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";

/**
 * DBEE — Barrier Effectiveness Dashboard (زیرماژول مستقیم BowTie، طبق
 * محل قرارگیری تأییدشده: مدیریت ارزیابی ریسک → BowTie → این صفحه).
 */
export default function BarrierEffectivenessDashboard({ currentUser, role, onBack }) {
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [filterBowtieId, setFilterBowtieId] = useState("all");
  const [filterSite, setFilterSite] = useState("all");
  const [selectedBarrier, setSelectedBarrier] = useState(null);
  const [subView, setSubView] = useState(null); // null | 'weights' | 'mapping'
  const [recalculating, setRecalculating] = useState(false);

  const isEmployerSide = role === "EMPLOYER" || role === "ADMIN";

  const load = async () => setData(await loadDashboardData());
  useEffect(() => { load(); }, []);

  if (subView === "weights") return <DbeeWeightsManager currentUser={currentUser} onBack={() => setSubView(null)} />;
  if (subView === "mapping") return <DbeeTypeMappingManager currentUser={currentUser} onBack={() => setSubView(null)} />;

  if (selectedBarrier) {
    return (
      <BarrierDetailView
        barrier={selectedBarrier} bowtieTitle={data.bowties.find((b) => b.id === selectedBarrier.bowtieId)?.title}
        currentUser={currentUser} isEmployerSide={isEmployerSide}
        onBack={() => setSelectedBarrier(null)}
        onRecalculated={async () => { await load(); }}
      />
    );
  }

  if (!data) return <p style={{ color: THEME.text3, textAlign: "center", padding: 40 }}>{t("dbeeDashLoading")}</p>;

  const sites = [...new Set(data.bowties.map((b) => b.site).filter(Boolean))];
  const bowtiesInSite = filterSite === "all" ? data.bowties : data.bowties.filter((b) => b.site === filterSite);
  const bowtieIdsInScope = new Set(bowtiesInSite.map((b) => b.id));

  let visibleBarriers = data.barriers.filter((b) => bowtieIdsInScope.has(b.bowtieId));
  if (filterBowtieId !== "all") visibleBarriers = visibleBarriers.filter((b) => b.bowtieId === filterBowtieId);

  const kpi = computeKpis(visibleBarriers, data.bowties);

  const handleRecalculateAll = async () => {
    setRecalculating(true);
    const targets = filterBowtieId === "all" ? bowtiesInSite : bowtiesInSite.filter((b) => b.id === filterBowtieId);
    for (const bt of targets) await recalculateAllBarriersDbee(bt.id);
    await load();
    setRecalculating(false);
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
      {onBack && <div style={styles.backLink} onClick={onBack}>{t("commonBackPlain")}</div>}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 4 }}>
        <div>
          <h2 style={{ fontSize: 18, color: THEME.navy, fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <ShieldCheck size={20} color={THEME.teal} /> {t("dbeeDashTitle")}
          </h2>
          <p style={{ color: THEME.text3, fontSize: 12, marginTop: 4 }}>{t("dbeeDashSubtitle")}</p>
        </div>
        {isEmployerSide && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" style={{ ...styles.smallButton, display: "flex", alignItems: "center", gap: 5, background: THEME.navyMid }} onClick={() => setSubView("mapping")}>
              <Link2 size={13} /> {t("dbeeDashManageMapping")}
            </button>
            <button type="button" style={{ ...styles.smallButton, display: "flex", alignItems: "center", gap: 5, background: THEME.navyMid }} onClick={() => setSubView("weights")}>
              <Sliders size={13} /> {t("dbeeDashWeighting")}
            </button>
            <button type="button" style={{ ...styles.smallButton, display: "flex", alignItems: "center", gap: 5 }} onClick={handleRecalculateAll} disabled={recalculating}>
              <RefreshCw size={13} /> {recalculating ? t("dbeeDashRecalculating") : t("dbeeDashRecalcAll")}
            </button>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "18px 0" }}>
        <select style={{ ...styles.input, marginTop: 0, width: 200 }} value={filterSite} onChange={(e) => { setFilterSite(e.target.value); setFilterBowtieId("all"); }} dir="rtl">
          <option value="all">{t("dbeeDashAllSites")}</option>
          {sites.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select style={{ ...styles.input, marginTop: 0, width: 240 }} value={filterBowtieId} onChange={(e) => setFilterBowtieId(e.target.value)} dir="rtl">
          <option value="all">{t("dbeeDashAllBowties")}</option>
          {bowtiesInSite.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
        </select>
      </div>

      <KpiGrid kpi={kpi} />

      <TopFailuresSection barriers={visibleBarriers} bowties={data.bowties} />

      <CriticalBarriersBySite barriers={visibleBarriers} bowties={data.bowties} />

      <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 12, padding: 18, marginTop: 16 }}>
        <h3 style={{ fontSize: 14, color: THEME.navy, fontWeight: 700, margin: "0 0 12px" }}>{t("dbeeAllBarriers")}</h3>
        {visibleBarriers.length === 0 && <p style={{ fontSize: 12, color: THEME.text3, textAlign: "center", padding: 20 }}>{t("dbeeNoBarriersInFilter")}</p>}
        {visibleBarriers.map((b) => (
          <BarrierRow key={b.id} barrier={b} bowtieTitle={data.bowties.find((bt) => bt.id === b.bowtieId)?.title} onClick={() => setSelectedBarrier(b)} />
        ))}
      </div>
    </div>
  );
}

function computeKpis(barriers, bowties) {
  const total = barriers.length;
  const effective = barriers.filter((b) => b.status === "effective").length;
  const weak = barriers.filter((b) => b.status === "weak").length;
  const critical = barriers.filter((b) => b.status === "failed" || (b.status === "weak" && b.criticality === "high")).length;
  const notAssessed = barriers.filter((b) => b.status === "not_assessed").length;
  return { total, effective, weak, critical, notAssessed };
}

function KpiGrid({ kpi }) {
  const { t } = useLanguage();
  const cards = [
    { label: t("dbeeKpiTotal"), value: kpi.total, color: THEME.navy, bg: THEME.bg },
    { label: t("dbeeKpiEffective"), value: kpi.effective, color: "#166534", bg: "#dcfce7" },
    { label: t("dbeeKpiWeak"), value: kpi.weak, color: "#b45309", bg: "#fef3c7" },
    { label: t("dbeeKpiCritical"), value: kpi.critical, color: "#b91c1c", bg: "#fee2e2" },
    { label: t("dbeeKpiNotAssessed"), value: kpi.notAssessed, color: THEME.text3, bg: THEME.bg },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
      {cards.map((c) => (
        <div key={c.label} style={{ background: c.bg, borderRadius: 10, padding: "14px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: c.color }}>{c.value}</div>
          <div style={{ fontSize: 11, color: THEME.text3, marginTop: 4 }}>{c.label}</div>
        </div>
      ))}
    </div>
  );
}

function TopFailuresSection({ barriers, bowties }) {
  const { t } = useLanguage();
  const withHistory = barriers.filter((b) => b.score != null);
  const worst = [...withHistory].sort((a, b) => a.score - b.score).slice(0, 5);
  if (worst.length === 0) return null;
  return (
    <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 12, padding: 18, marginTop: 16 }}>
      <h3 style={{ fontSize: 14, color: THEME.navy, fontWeight: 700, margin: "0 0 12px", display: "flex", alignItems: "center", gap: 6 }}>
        <TrendingDown size={15} color={THEME.danger} /> {t("dbeeTopFailures")}
      </h3>
      {worst.map((b) => {
        const meta = effectivenessMeta(b.status);
        return (
          <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${THEME.border}` }}>
            <div>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: THEME.navy }}>{b.label}</span>
              <span style={{ fontSize: 11, color: THEME.text3, marginRight: 8 }}>({bowties.find((bt) => bt.id === b.bowtieId)?.title})</span>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: meta.color }}>{meta.emoji} {t("dbeePct", { n: b.score })}</span>
          </div>
        );
      })}
    </div>
  );
}

function CriticalBarriersBySite({ barriers, bowties }) {
  const { t } = useLanguage();
  const critical = barriers.filter((b) => b.status === "failed" || (b.status === "weak" && b.criticality === "high"));
  if (critical.length === 0) return null;
  const bySite = {};
  critical.forEach((b) => {
    const site = bowties.find((bt) => bt.id === b.bowtieId)?.site || t("dbeeUnknown");
    bySite[site] = (bySite[site] || 0) + 1;
  });
  const sorted = Object.entries(bySite).sort((a, b) => b[1] - a[1]);
  return (
    <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 12, padding: 18, marginTop: 16 }}>
      <h3 style={{ fontSize: 14, color: "#b91c1c", fontWeight: 700, margin: "0 0 10px", display: "flex", alignItems: "center", gap: 6 }}>
        <AlertTriangle size={15} /> {t("dbeeCriticalBySite")}
      </h3>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {sorted.map(([site, count]) => (
          <span key={site} style={{ fontSize: 12, background: "#fff", border: "1px solid #fca5a5", borderRadius: 999, padding: "5px 14px", color: "#7f1d1d", fontWeight: 600 }}>
            {site}: {count}
          </span>
        ))}
      </div>
    </div>
  );
}

function BarrierRow({ barrier, bowtieTitle, onClick }) {
  const { t } = useLanguage();
  const meta = effectivenessMeta(barrier.status);
  const isCriticalFlag = barrier.status === "failed" || (barrier.status === "weak" && barrier.criticality === "high");
  return (
    <div
      onClick={onClick}
      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 8px", borderBottom: `1px solid ${THEME.border}`, cursor: "pointer" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = THEME.bg)}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        {isCriticalFlag && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: "#b91c1c", color: "#fff", fontWeight: 700, flexShrink: 0 }}>{t("dbeeCriticalFlag")}</span>}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: THEME.navy, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{barrier.label}</div>
          <div style={{ fontSize: 11, color: THEME.text3 }}>{bowtieTitle}</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: meta.color }}>{meta.emoji} {barrier.score != null ? t("dbeePct", { n: barrier.score }) : t("dbeeNotEnoughData")}</span>
        <ChevronLeft size={14} color={THEME.text3} />
      </div>
    </div>
  );
}

// ---------- جزئیات یک Barrier ----------

const SOURCE_LABEL_KEYS = {
  source_anomaly: "dbeeSrcAnomaly", source_capa: "dbeeSrcCapa", source_incident: "dbeeSrcIncident", source_tripod: "dbeeSrcTripod",
  source_sbs: "dbeeSrcSbs", source_hse_climate: "dbeeSrcHseClimate", source_accident_proneness: "dbeeSrcAccidentProneness", bowtie_own: "dbeeSrcBowtieOwn",
};

function BarrierDetailView({ barrier, bowtieTitle, currentUser, isEmployerSide, onBack, onRecalculated }) {
  const { t } = useLanguage();
  const [history, setHistory] = useState(null);
  const [evidence, setEvidence] = useState(null);
  const [recalculating, setRecalculating] = useState(false);
  const [caForm, setCaForm] = useState(null); // { description, responsible, dueDate }
  const [caSaving, setCaSaving] = useState(false);
  const [caMessage, setCaMessage] = useState("");

  const load = async () => {
    const [h, e] = await Promise.all([loadBarrierHistory(barrier.id), loadBarrierEvidence(barrier.id)]);
    setHistory(h);
    setEvidence(e);
  };
  useEffect(() => { load(); }, [barrier.id]);

  const handleRecalculate = async () => {
    setRecalculating(true);
    await recalculateBarrierDbee(barrier);
    setRecalculating(false);
    await load();
    await onRecalculated();
  };

  const meta = effectivenessMeta(barrier.status);
  const isWeakOrCritical = barrier.status === "weak" || barrier.status === "failed";

  const previous = history && history.length > 1 ? history[1] : null;
  const current = history && history.length > 0 ? history[0] : null;
  const trend = previous && current && previous.score != null && current.score != null
    ? (current.score > previous.score ? "up" : current.score < previous.score ? "down" : "flat")
    : null;

  const openCaForm = () => setCaForm({ description: "", responsible: "", dueDate: "" });
  const handleSaveCa = async () => {
    if (!caForm.description.trim() || !caForm.responsible.trim()) { setCaMessage(t("dbeeCaErrRequired")); return; }
    setCaSaving(true);
    const result = await createCorrectiveAction({
      source: "bowtie", nonconformanceDescription: t("dbeeCaNonconformanceDesc", { label: barrier.label, bowtie: bowtieTitle, score: barrier.score }),
      actionDescription: caForm.description.trim(), responsibleContractorName: caForm.responsible.trim(),
      dueDate: caForm.dueDate || "", status: "open", linkedBarrierId: barrier.id,
    }, currentUser?.name);
    setCaSaving(false);
    if (result?.__error) { setCaMessage(result.message); return; }
    setCaForm(null);
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 24 }}>
      <div style={styles.backLink} onClick={onBack}>{t("commonBackPlain")}</div>
      <h2 style={{ fontSize: 18, color: THEME.navy, fontWeight: 800, margin: "0 0 4px" }}>{barrier.label}</h2>
      <p style={{ color: THEME.text3, fontSize: 12.5, marginBottom: 18 }}>{bowtieTitle} — {barrier.side === "preventive" ? t("dbeeSidePreventive") : t("dbeeSideRecovery")}</p>

      <div style={{ background: `${meta.color}14`, border: `1px solid ${meta.color}`, borderRadius: 12, padding: 18, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={{ fontSize: 32, fontWeight: 800, color: meta.color }}>{barrier.score != null ? t("dbeePct", { n: barrier.score }) : "—"}</div>
            <div style={{ fontSize: 12.5, color: meta.color, fontWeight: 700 }}>{meta.emoji} {t(meta.labelKey)}</div>
          </div>
          {trend && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: THEME.text2 }}>
              <span>{t("dbeePct", { n: previous.score })}</span>
              {trend === "up" && <TrendingUp size={16} color="#166534" />}
              {trend === "down" && <TrendingDown size={16} color="#b91c1c" />}
              {trend === "flat" && <Minus size={16} color={THEME.text3} />}
              <span style={{ fontWeight: 700 }}>{t("dbeePct", { n: current.score })}</span>
            </div>
          )}
          {isEmployerSide && (
            <button type="button" style={{ ...styles.smallButton, display: "flex", alignItems: "center", gap: 5 }} onClick={handleRecalculate} disabled={recalculating}>
              <RefreshCw size={13} /> {recalculating ? t("dbeeDashRecalculating") : t("dbeeDetailRecalculate")}
            </button>
          )}
        </div>
        {barrier.score == null && <p style={{ fontSize: 12, color: THEME.text3, marginTop: 10 }}>{t("dbeeNoEvidenceNote")}</p>}
      </div>

      {current?.breakdown && (
        <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 12, padding: 18, marginBottom: 16 }}>
          <h4 style={{ fontSize: 13, color: THEME.navy, fontWeight: 700, margin: "0 0 10px" }}>{t("dbeeReasonForStatus")}</h4>
          {Object.entries(current.breakdown).filter(([, v]) => v.evidenceCount > 0).map(([key, v]) => (
            <div key={key} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "5px 0", borderBottom: `1px solid ${THEME.border}` }}>
              <span style={{ color: THEME.text2 }}>{t("dbeeEvidenceCount", { name: SOURCE_LABEL_KEYS[key] ? t(SOURCE_LABEL_KEYS[key]) : key, count: v.evidenceCount })}</span>
              <span style={{ fontWeight: 700, color: v.weightedPenalty > 15 ? THEME.danger : THEME.text2 }}>−{v.weightedPenalty.toFixed(1)}</span>
            </div>
          ))}
          {Object.values(current.breakdown).every((v) => v.evidenceCount === 0) && <p style={{ fontSize: 12, color: THEME.text3 }}>{t("dbeeNoEvidenceRecorded")}</p>}
        </div>
      )}

      {evidence && (
        <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 12, padding: 18, marginBottom: 16 }}>
          <h4 style={{ fontSize: 13, color: THEME.navy, fontWeight: 700, margin: "0 0 10px" }}>{t("dbeeRelatedEvidence")}</h4>
          <EvidenceGroup title={t("dbeeEvRelatedAnomalies")} items={evidence.anomalies.map((a) => `${a.id} — ${toJalaliSafe(a.createdAt)}`)} />
          <EvidenceGroup title={t("dbeeEvCapa")} items={evidence.capa.map((c) => `${c.actionNumber || c.id} — ${c.status}`)} />
          <EvidenceGroup title={t("dbeeEvRelatedIncidents")} items={evidence.incidents.map((i) => `${i.incidentNo} — ${toJalaliSafe(i.occurredAt)}${i.isDisabling ? t("dbeeIncDisablingSuffix") : ""}`)} />
          <EvidenceGroup title={t("dbeeEvRelatedTripod")} items={evidence.tripod.map((tp) => `${tp.id}${t("dbeeTripodStatusPrefix")}${tp.status}`)} last />
        </div>
      )}

      {history && history.length > 0 && (
        <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 12, padding: 18, marginBottom: 16 }}>
          <h4 style={{ fontSize: 13, color: THEME.navy, fontWeight: 700, margin: "0 0 10px" }}>{t("dbeeEffectivenessTrend")}</h4>
          {history.map((h) => (
            <div key={h.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "5px 0", borderBottom: `1px solid ${THEME.border}` }}>
              <span style={{ color: THEME.text3 }}>{toJalaliSafe(h.calculatedAt)}</span>
              <span style={{ fontWeight: 700, color: THEME.navy }}>{h.score != null ? t("dbeePct", { n: h.score }) : t("dbeeNotEnoughData")}</span>
            </div>
          ))}
        </div>
      )}

      {isEmployerSide && isWeakOrCritical && (
        <div style={{ background: THEME.dangerBg, border: `1px solid ${THEME.danger}`, borderRadius: 12, padding: 18 }}>
          <h4 style={{ fontSize: 13, color: THEME.danger, fontWeight: 700, margin: "0 0 10px" }}>{t("dbeeCaSuggestion")}</h4>
          {!caForm && (
            <button type="button" style={{ ...styles.smallButton, display: "flex", alignItems: "center", gap: 6, background: THEME.danger }} onClick={openCaForm}>
              <Send size={13} /> {t("dbeeCaIssueForBarrier")}
            </button>
          )}
          {caForm && (
            <div>
              <label style={styles.label}>{t("dbeeCaDescLabel")}</label>
              <textarea style={{ ...styles.input, minHeight: 60 }} value={caForm.description} onChange={(e) => setCaForm({ ...caForm, description: e.target.value })} dir="rtl" />
              <label style={styles.label}>{t("dbeeCaResponsibleLabel")}</label>
              <input style={styles.input} value={caForm.responsible} onChange={(e) => setCaForm({ ...caForm, responsible: e.target.value })} dir="rtl" />
              <label style={styles.label}>{t("dbeeCaDueLabel")}</label>
              <JalaliDateInput value={caForm.dueDate} onChange={(v) => setCaForm({ ...caForm, dueDate: v })} allowEmpty />
              {caMessage && <p style={styles.error}>{caMessage}</p>}
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button type="button" style={styles.smallButton} onClick={handleSaveCa} disabled={caSaving}>{caSaving ? t("dbeeSubmittingEllipsis") : t("dbeeCaSubmitLinkCapa")}</button>
                <button type="button" style={{ ...styles.smallButton, background: THEME.text3 }} onClick={() => setCaForm(null)}>{t("commonCancel")}</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EvidenceGroup({ title, items, last }) {
  return (
    <div style={{ marginBottom: last ? 0 : 12 }}>
      <p style={{ fontSize: 11.5, color: THEME.text3, fontWeight: 700, marginBottom: 4 }}>{title} ({items.length})</p>
      {items.length === 0 && <p style={{ fontSize: 11.5, color: THEME.text3, margin: 0 }}>—</p>}
      {items.map((it, i) => <p key={i} style={{ fontSize: 12, color: THEME.text2, margin: "2px 0" }}>{it}</p>)}
    </div>
  );
}
