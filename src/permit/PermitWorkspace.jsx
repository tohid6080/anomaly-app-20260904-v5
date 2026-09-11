import React, { useEffect, useMemo, useState } from "react";
import { Save, Send, ShieldCheck, XCircle, FileCheck2, PlayCircle, PauseCircle, CheckCircle2, RotateCcw, Printer, History } from "lucide-react";
import { THEME, styles } from "../shared.js";
import { toJalaliDateTime, toJalaliSafe } from "../personnel/jalaliDate.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import PermitRuntime from "./PermitRuntime.jsx";
import { STATUS_META, validateForm, collectBinds, canPerformStep, getStepApproval } from "./permitModel.js";
import {
  loadPermit, loadPermitTemplate, savePermit, transitionPermit,
  loadPermitAudit, loadRenewals, addRenewal,
} from "./permitApi.js";
import { loadJobPositionTitle } from "../jobpositions/jobPositionsApi.js";

const clone = (v) => JSON.parse(JSON.stringify(v ?? null));
const chip = (tone) => ({
  gray: { bg: THEME.surface2, fg: THEME.text3 }, teal: { bg: THEME.tealSoft, fg: THEME.tealDeep },
  ok: { bg: THEME.okBg, fg: THEME.ok }, warn: { bg: THEME.warnBg, fg: THEME.warn }, danger: { bg: THEME.dangerBg, fg: THEME.danger },
}[tone] || { bg: THEME.surface2, fg: THEME.text3 });

export default function PermitWorkspace({ permitId, currentUser, readOnly, onBack, wide }) {
  const { t, dir } = useLanguage();
  const actor = currentUser?.name || currentUser?.username || "";
  const [permit, setPermit] = useState(null);
  const [template, setTemplate] = useState(null);
  const [draft, setDraft] = useState(null);
  const [base, setBase] = useState(null);
  const [errors, setErrors] = useState({});
  const [audit, setAudit] = useState([]);
  const [renewals, setRenewals] = useState([]);
  const [posTitles, setPosTitles] = useState({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [showAudit, setShowAudit] = useState(false);

  const load = async () => {
    const p = await loadPermit(permitId);
    if (!p) { setErr(t("pmErrNotFound")); return; }
    setPermit(p);
    const tpl = await loadPermitTemplate(p.templateId);
    setTemplate(tpl);
    const ids = new Set();
    ["review", "decide", "activate", "suspend", "resume", "close"].forEach((s) => {
      const cfg = getStepApproval(tpl?.workflow, s);
      if (cfg.jobPositionId) ids.add(cfg.jobPositionId);
      if (cfg.substituteJobPositionId) ids.add(cfg.substituteJobPositionId);
    });
    const titles = {};
    await Promise.all([...ids].map(async (id) => { titles[id] = await loadJobPositionTitle(id); }));
    setPosTitles(titles);
    setDraft({
      title: p.title, applicantName: p.applicantName, performerName: p.performerName,
      startAt: p.startAt ? String(p.startAt).slice(0, 16) : "", endAt: p.endAt ? String(p.endAt).slice(0, 16) : "",
      formData: clone(p.formData || {}),
    });
    setBase({
      title: p.title, applicantName: p.applicantName, performerName: p.performerName,
      startAt: p.startAt ? String(p.startAt).slice(0, 16) : "", endAt: p.endAt ? String(p.endAt).slice(0, 16) : "",
      formData: clone(p.formData || {}),
    });
    setAudit(await loadPermitAudit(permitId));
    if (["issued", "active", "suspended", "closed", "expired"].includes(p.status)) setRenewals(await loadRenewals(permitId));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [permitId]);

  const editable = !readOnly && permit && (permit.status === "draft" || permit.status === "rejected");
  const can = (stepId) => canPerformStep(template?.workflow, stepId, currentUser);
  const stepNote = (stepId) => {
    const cfg = getStepApproval(template?.workflow, stepId);
    if (!cfg.jobPositionId || can(stepId)) return null;
    const a = posTitles[cfg.jobPositionId] || "—";
    const s = cfg.substituteJobPositionId ? posTitles[cfg.substituteJobPositionId] : "";
    return s ? t("pmWfBlockedNoteSub", { approver: a, substitute: s }) : t("pmWfBlockedNote", { approver: a });
  };
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(base), [draft, base]);

  const setF = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const setField = (fid, val) => setDraft((d) => ({ ...d, formData: { ...d.formData, [fid]: val } }));

  const buildRec = () => {
    const binds = collectBinds(template?.schema, draft.formData);
    return {
      ...permit,
      title: (draft.title || binds.title || "").trim(),
      applicantName: draft.applicantName || "",
      performerName: draft.performerName || "",
      startAt: draft.startAt ? new Date(draft.startAt).toISOString() : "",
      endAt: draft.endAt ? new Date(draft.endAt).toISOString() : "",
      workLocation: binds.workLocation ?? permit.workLocation,
      workDescription: binds.workDescription ?? permit.workDescription,
      riskRef: binds.riskRef ?? permit.riskRef,
      formData: draft.formData,
    };
  };

  const doSave = async () => {
    setBusy(true); setErr(""); setOk("");
    const res = await savePermit(buildRec());
    setBusy(false);
    if (res?.__error) { setErr(res.message); return; }
    setOk(t("pmSaved")); setBase(clone(draft)); load();
  };

  const doSubmit = async () => {
    const { errors: e } = validateForm(template?.schema, draft.formData, t);
    if (!draft.title?.trim()) e.__title = t("pmErrRequired");
    if (!draft.applicantName?.trim()) e.__applicant = t("pmErrRequired");
    if (Object.keys(e).length) { setErrors(e); setErr(t("pmErrFixFields")); return; }
    setBusy(true); setErr("");
    const s = await savePermit(buildRec());
    if (s?.__error) { setBusy(false); setErr(s.message); return; }
    const res = await transitionPermit(permit, "submitted", actor);
    setBusy(false);
    if (res?.__error) { setErr(res.message); return; }
    setOk(t("pmSubmitted")); load();
  };

  const act = async (to, opts) => {
    setBusy(true); setErr("");
    const res = await transitionPermit(permit, to, actor, opts);
    setBusy(false);
    if (res?.__error) { setErr(res.message); return; }
    setOk(t("pmStatusChanged")); load();
  };

  const doRenew = async () => {
    setBusy(true); setErr("");
    const today = new Date().toISOString().slice(0, 10);
    const res = await addRenewal(permit, { dayNo: renewals.length + 1, renewedFor: today, contractorHse: actor }, actor);
    setBusy(false);
    if (res?.__error) { setErr(res.message); return; }
    load();
  };

  if (err && !permit) return <div style={{ padding: 24 }}><p style={styles.error}>{err}</p></div>;
  if (!permit || !draft) return <div style={{ padding: 24, color: THEME.text3 }}>{t("commonLoading")}</div>;

  const sm = STATUS_META[permit.status] || {};
  const cc = chip(sm.tone);

  return (
    <div style={wide ? { direction: dir } : { maxWidth: 900, margin: "0 auto", padding: 22, direction: dir }}>
      {onBack && <div style={styles.backLink} onClick={onBack}>{t("commonBack")}</div>}

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: THEME.heading }}>
          {permit.permitNo ? <span style={{ fontFamily: "monospace" }}>{permit.permitNo}</span> : t("pmNewPermit")}
          {permit.title ? ` — ${permit.title}` : ""}
        </h3>
        <span style={{ fontSize: 10.5, fontWeight: 800, padding: "3px 10px", borderRadius: 999, background: cc.bg, color: cc.fg }}>{t(sm.key || permit.status)}</span>
        <span style={{ fontSize: 11, color: THEME.text3 }}>{template?.name || t("pmGeneralTemplate")}</span>
        <div style={{ marginInlineStart: "auto", display: "flex", gap: 6 }}>
          <button type="button" onClick={() => setShowAudit((v) => !v)} style={{ ...styles.smallButton, background: THEME.surface2, color: THEME.text, display: "inline-flex", alignItems: "center", gap: 5 }}><History size={12} /> {t("pmAudit")}</button>
          {permit.status !== "draft" && <button type="button" onClick={() => window.print()} style={{ ...styles.smallButton, background: THEME.surface2, color: THEME.text, display: "inline-flex", alignItems: "center", gap: 5 }}><Printer size={12} /> {t("pmPrint")}</button>}
        </div>
      </div>
      {err && <p style={styles.error}>{err}</p>}
      {ok && <p style={{ ...styles.error, color: THEME.ok }}>{ok}</p>}

      {showAudit && (
        <div style={{ ...styles.cardWide, marginBottom: 12 }}>
          <b style={{ fontSize: 12, color: THEME.heading }}>{t("pmAudit")}</b>
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
            {audit.length === 0 && <span style={{ fontSize: 11, color: THEME.text3 }}>—</span>}
            {audit.map((a) => (
              <div key={a.id} style={{ fontSize: 11, color: THEME.text2, display: "flex", gap: 8 }}>
                <span style={{ fontFamily: "monospace", color: THEME.text3 }}>{toJalaliDateTime(a.at)}</span>
                <b>{t("pmAudit_" + a.action) !== "pmAudit_" + a.action ? t("pmAudit_" + a.action) : a.action}</b>
                <span>{a.actor}</span>{a.detail && <span style={{ color: THEME.text3 }}>· {a.detail}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* اطلاعاتِ استاندارد */}
      <div style={{ ...styles.cardWide, marginBottom: 12 }}>
        <b style={{ fontSize: 12, color: THEME.heading }}>{t("pmStandardInfo")}</b>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginTop: 8 }}>
          <div><label style={styles.label}>{t("pmTitle")} {editable && "*"}</label>
            <input style={{ ...styles.input, ...(errors.__title ? { borderColor: THEME.danger } : {}) }} value={draft.title} disabled={!editable} dir={dir} onChange={(e) => setF({ title: e.target.value })} /></div>
          <div><label style={styles.label}>{t("pmApplicant")} {editable && "*"}</label>
            <input style={{ ...styles.input, ...(errors.__applicant ? { borderColor: THEME.danger } : {}) }} value={draft.applicantName} disabled={!editable} dir={dir} onChange={(e) => setF({ applicantName: e.target.value })} /></div>
          <div><label style={styles.label}>{t("pmPerformer")}</label>
            <input style={styles.input} value={draft.performerName} disabled={!editable} dir={dir} onChange={(e) => setF({ performerName: e.target.value })} /></div>
          <div><label style={styles.label}>{t("pmStart")}</label>
            <input type="datetime-local" style={styles.input} value={draft.startAt} disabled={!editable} dir="ltr" onChange={(e) => setF({ startAt: e.target.value })} /></div>
          <div><label style={styles.label}>{t("pmPlannedEnd")}</label>
            <input type="datetime-local" style={styles.input} value={draft.endAt} disabled={!editable} dir="ltr" onChange={(e) => setF({ endAt: e.target.value })} /></div>
          {permit.issuerName && <div><label style={styles.label}>{t("pmIssuer")}</label><input style={styles.input} value={permit.issuerName} disabled /></div>}
          {permit.validUntil && <div><label style={styles.label}>{t("pmValidUntil")}</label><input style={styles.input} value={toJalaliSafe(permit.validUntil)} disabled dir="ltr" /></div>}
        </div>
      </div>

      {/* فرمِ پویا */}
      <div style={{ ...styles.cardWide, marginBottom: 12 }}>
        <PermitRuntime schema={template?.schema} values={draft.formData} errors={errors}
          readOnly={!editable} onChange={setField} />
      </div>

      {/* تمدیدِ روزانه */}
      {["active", "suspended", "closed", "expired", "issued"].includes(permit.status) && (
        <div style={{ ...styles.cardWide, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <b style={{ fontSize: 12, color: THEME.heading }}>{t("pmRenewals")}</b>
            {!readOnly && permit.status === "active" && <button type="button" onClick={doRenew} disabled={busy} style={{ ...styles.smallButton, background: THEME.teal, marginInlineStart: "auto", display: "inline-flex", alignItems: "center", gap: 5 }}><RotateCcw size={12} /> {t("pmRenewToday")}</button>}
          </div>
          <div style={{ overflowX: "auto", marginTop: 8 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
              <thead><tr>{[t("pmDay"), t("pmDate"), t("pmContractorHse"), t("pmEmployerHse"), t("pmNote")].map((h) => <th key={h} style={thS}>{h}</th>)}</tr></thead>
              <tbody>
                {renewals.length === 0 && <tr><td colSpan={5} style={{ ...tdS, textAlign: "center", color: THEME.text3 }}>—</td></tr>}
                {renewals.map((r) => (
                  <tr key={r.id}><td style={tdS}>{r.dayNo}</td><td style={tdS}>{toJalaliSafe(r.renewedFor)}</td><td style={tdS}>{r.contractorHse || "—"}</td><td style={tdS}>{r.employerHse || "—"}</td><td style={tdS}>{r.note || "—"}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* کنش‌ها */}
      {!readOnly && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {editable && <button type="button" onClick={doSave} disabled={busy || !dirty} style={{ ...styles.smallButton, background: THEME.surface2, color: THEME.text, opacity: busy || !dirty ? 0.55 : 1, display: "inline-flex", alignItems: "center", gap: 5 }}><Save size={13} /> {t("pmSave")}</button>}
            {editable && <button type="button" onClick={doSubmit} disabled={busy} style={{ ...styles.smallButton, background: THEME.teal, display: "inline-flex", alignItems: "center", gap: 5 }}><Send size={13} /> {t("pmSubmit")}</button>}
            {permit.status === "submitted" && can("review") && <button type="button" onClick={() => act("under_review")} disabled={busy} style={{ ...styles.smallButton, background: THEME.teal, display: "inline-flex", alignItems: "center", gap: 5 }}><ShieldCheck size={13} /> {t("pmStartReview")}</button>}
            {permit.status === "under_review" && can("decide") && <>
              <button type="button" onClick={() => act("issued")} disabled={busy} style={{ ...styles.smallButton, background: THEME.ok, display: "inline-flex", alignItems: "center", gap: 5 }}><FileCheck2 size={13} /> {t("pmIssue")}</button>
              <button type="button" onClick={() => { const n = window.prompt(t("pmRejectReason")); if (n != null) act("rejected", { note: n }); }} disabled={busy} style={{ ...styles.smallButton, background: THEME.danger, display: "inline-flex", alignItems: "center", gap: 5 }}><XCircle size={13} /> {t("pmReject")}</button>
            </>}
            {permit.status === "issued" && can("activate") && <button type="button" onClick={() => act("active", { validUntil: draft.endAt ? draft.endAt.slice(0, 10) : null })} disabled={busy} style={{ ...styles.smallButton, background: THEME.ok, display: "inline-flex", alignItems: "center", gap: 5 }}><PlayCircle size={13} /> {t("pmActivate")}</button>}
            {permit.status === "active" && can("suspend") && <button type="button" onClick={() => act("suspended")} disabled={busy} style={{ ...styles.smallButton, background: THEME.warn, display: "inline-flex", alignItems: "center", gap: 5 }}><PauseCircle size={13} /> {t("pmSuspend")}</button>}
            {permit.status === "suspended" && can("resume") && <button type="button" onClick={() => act("active")} disabled={busy} style={{ ...styles.smallButton, background: THEME.ok, display: "inline-flex", alignItems: "center", gap: 5 }}><PlayCircle size={13} /> {t("pmResume")}</button>}
            {["issued", "active", "suspended"].includes(permit.status) && can("close") && <button type="button" onClick={() => { const r = window.prompt(t("pmCloseReason")); if (r != null) act("closed", { reason: r }); }} disabled={busy} style={{ ...styles.smallButton, background: THEME.navyMid, color: "#fff", display: "inline-flex", alignItems: "center", gap: 5 }}><CheckCircle2 size={13} /> {t("pmClose")}</button>}
          </div>
          {["review", "decide", "activate", "suspend", "resume", "close"].map((s) => {
            const active =
              (s === "review" && permit.status === "submitted") ||
              (s === "decide" && permit.status === "under_review") ||
              (s === "activate" && permit.status === "issued") ||
              (s === "suspend" && permit.status === "active") ||
              (s === "resume" && permit.status === "suspended") ||
              (s === "close" && ["issued", "active", "suspended"].includes(permit.status));
            const note = active && stepNote(s);
            return note ? <p key={s} style={{ fontSize: 10.5, color: THEME.text3, margin: 0 }}>{note}</p> : null;
          })}
        </div>
      )}
    </div>
  );
}

const thS = { textAlign: "start", fontSize: 10, fontWeight: 800, color: THEME.text3, padding: "5px 8px", borderBottom: `1px solid ${THEME.border}` };
const tdS = { padding: "5px 8px", borderBottom: `1px solid ${THEME.borderSoft}`, color: THEME.text2 };
