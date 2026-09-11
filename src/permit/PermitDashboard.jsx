import React, { useEffect, useMemo, useState } from "react";
import { Plus, FileSpreadsheet, Trash2, Layers, PenSquare } from "lucide-react";
import { THEME, styles } from "../shared.js";
import { toJalaliSafe } from "../personnel/jalaliDate.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { STATUS_META } from "./permitModel.js";
import {
  loadPermits, createPermit, deletePermit, loadPermitTemplates, cloneTemplateToCompany,
  createBlankTemplate, deleteCompanyTemplate,
} from "./permitApi.js";
import PermitWorkspace from "./PermitWorkspace.jsx";
import PermitTemplateBuilder from "./PermitTemplateBuilder.jsx";

const chip = (tone) => ({
  gray: { bg: THEME.surface2, fg: THEME.text3 }, teal: { bg: THEME.tealSoft, fg: THEME.tealDeep },
  ok: { bg: THEME.okBg, fg: THEME.ok }, warn: { bg: THEME.warnBg, fg: THEME.warn }, danger: { bg: THEME.dangerBg, fg: THEME.danger },
}[tone] || { bg: THEME.surface2, fg: THEME.text3 });

const FILTERS = ["all", "open", "active", "closed"];

export default function PermitDashboard({ currentUser, role, readOnly, onBack, wide }) {
  const { t, dir } = useLanguage();
  const [permits, setPermits] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [builderId, setBuilderId] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [showTpl, setShowTpl] = useState(false);
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = async () => {
    setLoading(true);
    const [p, tpl] = await Promise.all([loadPermits(), loadPermitTemplates()]);
    setPermits(p); setTemplates(tpl);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const shown = useMemo(() => permits.filter((p) => {
    if (filter === "open") return ["draft", "submitted", "under_review", "rejected", "issued"].includes(p.status);
    if (filter === "active") return ["active", "suspended"].includes(p.status);
    if (filter === "closed") return ["closed", "expired"].includes(p.status);
    return true;
  }), [permits, filter]);

  const handleNew = async (tplId) => {
    setBusy(true); setErr(""); setShowNew(false);
    const tpl = templates.find((x) => x.id === tplId) || templates[0];
    const res = await createPermit({}, tpl, currentUser?.name);
    setBusy(false);
    if (res?.__error) { setErr(res.message); return; }
    await load();
    setOpenId(res.id);
  };

  const handleClone = async (srcId) => {
    setBusy(true); setErr("");
    const res = await cloneTemplateToCompany(srcId, "", currentUser?.name);
    setBusy(false);
    if (res?.__error) { setErr(res.message); return; }
    setShowTpl(false); await load();
    setBuilderId(res.id);
  };

  const handleNewTemplate = async () => {
    setBusy(true); setErr("");
    const res = await createBlankTemplate(t("pmUntitledTemplate"), "general", currentUser?.name);
    setBusy(false);
    if (res?.__error) { setErr(res.message); return; }
    setShowTpl(false); await load();
    setBuilderId(res.id);
  };

  const handleDeleteTemplate = async (tpl) => {
    if (!window.confirm(t("pmConfirmDeleteTemplate"))) return;
    const res = await deleteCompanyTemplate(tpl.id);
    if (res?.__error) { setErr(res.message); return; }
    load();
  };

  const handleDelete = async (p) => {
    if (!window.confirm(t("pmConfirmDelete"))) return;
    const res = await deletePermit(p.id);
    if (res?.__error) { setErr(res.message); return; }
    load();
  };

  if (openId) {
    return <PermitWorkspace permitId={openId} currentUser={currentUser} readOnly={readOnly} wide={wide}
      onBack={() => { setOpenId(null); load(); }} />;
  }
  if (builderId) {
    return <PermitTemplateBuilder templateId={builderId} currentUser={currentUser}
      onBack={() => { setBuilderId(null); load(); }} onSaved={load} />;
  }

  const isContractor = role === "CONTRACTOR";
  const companyTpls = templates.filter((x) => !x.isSystem);
  const sysTpls = templates.filter((x) => x.isSystem);
  const pickableTpls = isContractor ? companyTpls.filter((x) => x.isPublished) : templates;
  const noPublished = isContractor && companyTpls.filter((x) => x.isPublished).length === 0;

  return (
    <div style={wide ? { direction: dir } : { maxWidth: 900, margin: "0 auto", padding: 24, direction: dir }}>
      {onBack && <div style={styles.backLink} onClick={onBack}>{t("commonBack")}</div>}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <FileSpreadsheet size={17} color={THEME.tealDeep} />
        <h3 style={{ margin: 0, color: THEME.heading, fontSize: 15, fontWeight: 800 }}>{t("modulePermitToWork")}</h3>
      </div>
      <p style={{ color: THEME.text3, fontSize: 12, margin: "2px 0 14px", lineHeight: 1.8 }}>{t("pmIntro")}</p>
      {err && <p style={styles.error}>{err}</p>}

      {!readOnly && noPublished && (
        <div style={{ ...styles.cardWide, marginBottom: 14, textAlign: "center", color: THEME.text3, fontSize: 12.5 }}>
          {t("pmNoPublishedTemplates")}
        </div>
      )}

      {!readOnly && !noPublished && (
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <button type="button" onClick={() => setShowNew((v) => !v)} disabled={busy} style={{ ...styles.smallButton, display: "inline-flex", alignItems: "center", gap: 6 }}><Plus size={13} /> {t("pmNewPermit")}</button>
          {!isContractor && <button type="button" onClick={() => setShowTpl((v) => !v)} style={{ ...styles.smallButton, background: THEME.surface2, color: THEME.text, display: "inline-flex", alignItems: "center", gap: 6 }}><Layers size={13} /> {t("pmTemplates")}</button>}
        </div>
      )}

      {showNew && !readOnly && !noPublished && (
        <div style={{ ...styles.cardWide, marginBottom: 14 }}>
          <b style={{ fontSize: 12.5, color: THEME.heading }}>{t("pmPickTemplate")}</b>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8, marginTop: 10 }}>
            {pickableTpls.map((tp) => (
              <button key={tp.id} type="button" onClick={() => handleNew(tp.id)} style={tplCard}>
                <span style={{ fontWeight: 800, fontSize: 12.5, color: THEME.heading }}>{tp.name || tp.permitType}</span>
                <span style={{ fontSize: 10, color: THEME.text3 }}>{tp.isSystem ? t("pmSystemTemplate") : t("pmCompanyTemplate")} · v{tp.version}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {showTpl && !readOnly && !isContractor && (
        <div style={{ ...styles.cardWide, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <b style={{ fontSize: 12.5, color: THEME.heading }}>{t("pmTemplates")}</b>
            <button type="button" onClick={handleNewTemplate} disabled={busy}
              style={{ ...styles.smallButton, fontSize: 11, marginInlineStart: "auto", display: "inline-flex", alignItems: "center", gap: 5 }}>
              <Plus size={12} /> {t("pmNewTemplate")}
            </button>
          </div>
          <p style={{ fontSize: 10.5, color: THEME.text3, margin: "3px 0 10px" }}>{t("pmTemplatesHint")}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {companyTpls.map((tp) => (
              <div key={tp.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, padding: "7px 10px", border: `1px solid ${THEME.border}`, borderRadius: 8 }}>
                <b style={{ flex: 1, color: THEME.text }}>{tp.name}</b>
                <span style={{ fontSize: 10, color: THEME.text3 }}>{t("pmCompanyTemplate")} · v{tp.version}</span>
                <span style={{ fontSize: 9.5, fontWeight: 800, padding: "2px 8px", borderRadius: 999, background: tp.isPublished ? THEME.okBg : THEME.surface2, color: tp.isPublished ? THEME.ok : THEME.text3 }}>
                  {tp.isPublished ? t("pmPublished") : t("pmDraftStatus")}
                </span>
                <button type="button" onClick={() => setBuilderId(tp.id)} style={{ ...styles.smallButton, fontSize: 11, background: THEME.surface2, color: THEME.text, display: "inline-flex", alignItems: "center", gap: 4 }}><PenSquare size={11} /> {t("pmEdit")}</button>
                <button type="button" onClick={() => handleDeleteTemplate(tp)} style={{ ...styles.smallButton, fontSize: 11, background: THEME.surface2, color: THEME.danger }}><Trash2 size={11} /></button>
              </div>
            ))}
            {sysTpls.map((tp) => (
              <div key={tp.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, padding: "7px 10px", border: `1px solid ${THEME.border}`, borderRadius: 8, background: THEME.surface2 }}>
                <b style={{ flex: 1, color: THEME.text }}>{tp.name}</b>
                <span style={{ fontSize: 10, color: THEME.text3 }}>{t("pmSystemTemplate")}</span>
                <button type="button" onClick={() => handleClone(tp.id)} style={{ ...styles.smallButton, fontSize: 11, background: THEME.teal }}>{t("pmCloneTemplate")}</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "inline-flex", background: THEME.surface2, border: `1px solid ${THEME.border}`, borderRadius: 9, padding: 3, gap: 3, marginBottom: 12 }}>
        {FILTERS.map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)}
            style={{ border: "none", borderRadius: 7, padding: "6px 14px", fontFamily: THEME.font, fontSize: 12, fontWeight: 700, cursor: "pointer",
              background: filter === f ? THEME.teal : "transparent", color: filter === f ? "#fff" : THEME.text2 }}>{t("pmFilter_" + f)}</button>
        ))}
      </div>

      {loading && <p style={{ color: THEME.text3, textAlign: "center", padding: 20 }}>{t("commonLoading")}</p>}
      {!loading && shown.length === 0 && <p style={{ color: THEME.text3, textAlign: "center", padding: 20 }}>{t("pmNoPermits")}</p>}

      {shown.map((p) => {
        const sm = STATUS_META[p.status] || {};
        const cc = chip(sm.tone);
        return (
          <div key={p.id} style={{ ...styles.card, width: "auto", marginBottom: 10, cursor: "pointer" }} onClick={() => setOpenId(p.id)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: THEME.heading, fontSize: 13 }}>
                  {p.permitNo ? <span style={{ fontFamily: "monospace", marginInlineEnd: 6 }}>{p.permitNo}</span> : null}
                  {p.title || t("pmUntitled")}
                </div>
                <div style={{ fontSize: 11, color: THEME.text3, marginTop: 3 }}>
                  {[p.workLocation, p.applicantName, toJalaliSafe(p.updatedAt || p.createdAt)].filter(Boolean).join(" · ")}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ fontSize: 10.5, padding: "3px 10px", borderRadius: 999, fontWeight: 700, background: cc.bg, color: cc.fg }}>{t(sm.key || p.status)}</span>
                {!readOnly && p.status === "draft" && (
                  <button type="button" onClick={(e) => { e.stopPropagation(); handleDelete(p); }} style={{ ...styles.smallButton, fontSize: 11, background: THEME.surface2, color: THEME.danger }}><Trash2 size={11} /></button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const tplCard = {
  display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start", textAlign: "start",
  border: `1px solid ${THEME.border}`, background: "transparent", borderRadius: 10, padding: "10px 12px",
  cursor: "pointer", fontFamily: THEME.font,
};
