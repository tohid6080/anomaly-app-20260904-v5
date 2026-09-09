import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Construction, Plus, Copy, Archive, ArchiveRestore, Trash2, GitBranch,
  History, ClipboardList, ChevronDown, ChevronRight, Save, X,
} from "lucide-react";
import { THEME, styles } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import ModuleSubHeader from "../shared/ModuleSubHeader.jsx";
import { JalaliDateInput, toJalaliSafe } from "../personnel/jalaliDate.jsx";
import {
  loadLiftingPlans, createLiftingPlan, updateLiftingPlanMeta, setLiftingPlanStatus,
  duplicateLiftingPlan, archiveLiftingPlan, restoreLiftingPlan, deleteLiftingPlan,
  freezeLiftingRevision, loadLiftingRevisions, loadLiftingAudit,
  LIFTING_STATUS_META, LIFTING_STATUS_ORDER, liftingStatusMeta,
} from "./liftingPlanApi.js";

/* ============================================================================ *
 * Lifting Plan Designer — Workspace (فاز ۱: فهرست + فرمِ متادیتا +
 * Versioning / Duplicate / Archive / Audit Trail). بومِ طراحی در فاز ۲.
 * از Layout/Theme/RTL/توکن‌های مشترکِ IHMS استفاده می‌کند؛ هیچ CSS جدید.
 * ============================================================================ */

const EMPTY_META = {
  planNumber: "", revision: "0", planDate: "", project: "", contractorId: "",
  contractorName: "", title: "", preparedBy: "", reviewedBy: "", approvedBy: "", status: "draft",
};

function StatusBadge({ status, t }) {
  const m = liftingStatusMeta(status);
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999, color: m.color, background: m.bg }}>
      {t(m.labelKey)}
    </span>
  );
}

export default function LiftingPlanWorkspace({ currentUser, role, onBack, wide, readOnly = false }) {
  const { t, dir } = useLanguage();
  const actor = currentUser?.name || currentUser?.username || "";
  const card = wide ? styles.cardWide : styles.card;

  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [mode, setMode] = useState("list"); // list | edit
  const [editId, setEditId] = useState(null); // null → new
  const [meta, setMeta] = useState(EMPTY_META);
  const [baseline, setBaseline] = useState(EMPTY_META);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");

  const [revisions, setRevisions] = useState([]);
  const [audit, setAudit] = useState([]);
  const [showRevs, setShowRevs] = useState(false);
  const [showAudit, setShowAudit] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const list = await loadLiftingPlans({ includeArchived: true });
    setPlans(Array.isArray(list) ? list : []);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return plans;
    return plans.filter((p) => p.status === statusFilter);
  }, [plans, statusFilter]);

  const dirty = useMemo(
    () => JSON.stringify(meta) !== JSON.stringify(baseline),
    [meta, baseline]
  );

  const openNew = () => {
    setEditId(null);
    setMeta(EMPTY_META);
    setBaseline(EMPTY_META);
    setRevisions([]);
    setAudit([]);
    setErr("");
    setMode("edit");
  };

  const openEdit = async (p) => {
    const m = {
      planNumber: p.planNumber, revision: p.revision, planDate: p.planDate, project: p.project,
      contractorId: p.contractorId, contractorName: p.contractorName, title: p.title,
      preparedBy: p.preparedBy, reviewedBy: p.reviewedBy, approvedBy: p.approvedBy, status: p.status,
    };
    setEditId(p.id);
    setMeta(m);
    setBaseline(m);
    setErr("");
    setMode("edit");
    const [revs, aud] = await Promise.all([loadLiftingRevisions(p.id), loadLiftingAudit(p.id)]);
    setRevisions(revs);
    setAudit(aud);
  };

  const set = (k, v) => setMeta((prev) => ({ ...prev, [k]: v }));

  const save = async () => {
    if (!meta.planNumber.trim() && !meta.title.trim()) {
      setErr(t("lpErrNeedNumberOrTitle"));
      return;
    }
    setSaving(true);
    setErr("");
    let res;
    if (editId == null) {
      res = await createLiftingPlan({ ...meta, createdBy: actor }, actor);
    } else {
      const prev = plans.find((p) => p.id === editId);
      res = await updateLiftingPlanMeta(editId, meta, actor, prev);
    }
    setSaving(false);
    if (res?.__error) { setErr(res.message || t("commonErrorSave")); return; }
    await refresh();
    if (editId == null && res?.id) {
      await openEdit(res);
    } else {
      setBaseline(meta);
      if (editId) {
        const aud = await loadLiftingAudit(editId);
        setAudit(aud);
      }
    }
  };

  const changeStatus = async (p, status) => {
    setBusyId(p.id);
    const res = await setLiftingPlanStatus(p.id, status, actor, p.status);
    setBusyId("");
    if (res?.__error) { setErr(res.message); return; }
    await refresh();
    if (mode === "edit" && editId === p.id) {
      set("status", status);
      setBaseline((b) => ({ ...b, status }));
      setAudit(await loadLiftingAudit(p.id));
    }
  };

  const doDuplicate = async (p) => {
    setBusyId(p.id);
    const res = await duplicateLiftingPlan(p.id, actor);
    setBusyId("");
    if (res?.__error) { setErr(res.message); return; }
    await refresh();
  };

  const doArchiveToggle = async (p) => {
    setBusyId(p.id);
    const res = p.status === "archived"
      ? await restoreLiftingPlan(p.id, actor)
      : await archiveLiftingPlan(p.id, actor, p.status);
    setBusyId("");
    if (res?.__error) { setErr(res.message); return; }
    await refresh();
  };

  const doDelete = async (p) => {
    if (!window.confirm(t("lpConfirmDelete"))) return;
    setBusyId(p.id);
    const res = await deleteLiftingPlan(p.id, actor);
    setBusyId("");
    if (res?.__error) { setErr(res.message); return; }
    if (mode === "edit" && editId === p.id) { setMode("list"); setEditId(null); }
    await refresh();
  };

  const doFreeze = async () => {
    if (editId == null) return;
    const note = window.prompt(t("lpRevisionNotePrompt"), "");
    if (note === null) return;
    setSaving(true);
    const res = await freezeLiftingRevision(editId, note, actor);
    setSaving(false);
    if (res?.__error) { setErr(res.message); return; }
    set("revision", res.revision);
    setBaseline((b) => ({ ...b, revision: res.revision }));
    await refresh();
    const [revs, aud] = await Promise.all([loadLiftingRevisions(editId), loadLiftingAudit(editId)]);
    setRevisions(revs);
    setAudit(aud);
  };

  // ---------- render: editor ----------
  if (mode === "edit") {
    const isNew = editId == null;
    return (
      <div style={{ direction: dir }}>
        <ModuleSubHeader
          icon={Construction}
          title={isNew ? t("lpNewPlanTitle") : t("lpEditPlanTitle")}
          note={t("lpSubHeaderNote")}
          onBack={() => { setMode("list"); setEditId(null); }}
          backLabel={t("commonBackPlain")}
        />

        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 4 }}>
            <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 800, color: THEME.heading }}>{t("lpMetaSection")}</h3>
            {!isNew && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <StatusBadge status={meta.status} t={t} />
                <span style={{ fontSize: 11.5, color: THEME.text3 }}>{t("lpRevisionShort")} {meta.revision}</span>
              </div>
            )}
          </div>

          <div style={styles.formGridWide}>
            <Field label={t("lpFieldPlanNumber")}>
              <input style={styles.input} value={meta.planNumber} disabled={readOnly}
                onChange={(e) => set("planNumber", e.target.value)} />
            </Field>
            <Field label={t("lpFieldRevision")}>
              <input style={{ ...styles.input, background: THEME.surface2 }} value={meta.revision} disabled readOnly />
            </Field>
            <Field label={t("lpFieldDate")}>
              <JalaliDateInput value={meta.planDate} allowEmpty disabled={readOnly}
                onChange={(v) => set("planDate", v)} style={styles.input} />
            </Field>
            <Field label={t("lpFieldStatus")}>
              <select style={styles.input} value={meta.status} disabled={readOnly}
                onChange={(e) => set("status", e.target.value)}>
                {LIFTING_STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>{t(LIFTING_STATUS_META[s].labelKey)}</option>
                ))}
              </select>
            </Field>

            <Field label={t("lpFieldProject")}>
              <input style={styles.input} value={meta.project} disabled={readOnly}
                onChange={(e) => set("project", e.target.value)} />
            </Field>
            <Field label={t("lpFieldContractor")}>
              <input style={styles.input} value={meta.contractorName} disabled={readOnly}
                onChange={(e) => set("contractorName", e.target.value)} />
            </Field>
            <Field label={t("lpFieldTitle")} full>
              <input style={styles.input} value={meta.title} disabled={readOnly}
                onChange={(e) => set("title", e.target.value)} />
            </Field>

            <Field label={t("lpFieldPreparedBy")}>
              <input style={styles.input} value={meta.preparedBy} disabled={readOnly}
                onChange={(e) => set("preparedBy", e.target.value)} />
            </Field>
            <Field label={t("lpFieldReviewedBy")}>
              <input style={styles.input} value={meta.reviewedBy} disabled={readOnly}
                onChange={(e) => set("reviewedBy", e.target.value)} />
            </Field>
            <Field label={t("lpFieldApprovedBy")}>
              <input style={styles.input} value={meta.approvedBy} disabled={readOnly}
                onChange={(e) => set("approvedBy", e.target.value)} />
            </Field>
          </div>

          {err && <p style={styles.error}>{err}</p>}

          {!readOnly && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 18 }}>
              <button type="button" onClick={save} disabled={saving || (!isNew && !dirty)}
                style={{ ...styles.smallButton, background: THEME.teal, opacity: saving || (!isNew && !dirty) ? 0.6 : 1, display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Save size={14} /> {saving ? t("commonSaving") : t("commonSave")}
              </button>
              {!isNew && (
                <button type="button" onClick={doFreeze} disabled={saving}
                  style={{ ...styles.smallButton, background: THEME.navyMid, display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <GitBranch size={14} /> {t("lpFreezeRevision")}
                </button>
              )}
              {!isNew && (
                <button type="button" onClick={() => { const p = plans.find((x) => x.id === editId); if (p) doDuplicate(p); }} disabled={saving}
                  style={{ ...styles.smallButton, background: THEME.surface2, color: THEME.text, display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Copy size={14} /> {t("lpDuplicate")}
                </button>
              )}
            </div>
          )}
        </div>

        {/* بومِ طراحی — فاز ۲ */}
        <div style={{ ...card, textAlign: "center", padding: "34px 18px" }}>
          <Construction size={30} color={THEME.text3} />
          <p style={{ margin: "10px 0 0", fontSize: 13, fontWeight: 700, color: THEME.text2 }}>{t("lpCanvasComingTitle")}</p>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: THEME.text3, lineHeight: 1.7 }}>{t("lpCanvasComingNote")}</p>
        </div>

        {!isNew && (
          <>
            <Collapsible open={showRevs} onToggle={() => setShowRevs((s) => !s)} icon={History}
              title={`${t("lpRevisionsSection")} (${revisions.length})`} card={card}>
              {revisions.length === 0
                ? <p style={{ fontSize: 12, color: THEME.text3, margin: 0 }}>{t("lpNoRevisions")}</p>
                : revisions.map((r) => (
                  <div key={r.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "8px 0", borderBottom: `1px solid ${THEME.borderSoft}`, fontSize: 12 }}>
                    <span style={{ fontWeight: 700, color: THEME.text }}>{t("lpRevisionShort")} {r.revision}</span>
                    <span style={{ color: THEME.text2, flex: 1, minWidth: 0 }}>{r.note || "—"}</span>
                    <span style={{ color: THEME.text3, whiteSpace: "nowrap" }}>{r.createdBy} · {toJalaliSafe(r.createdAt)}</span>
                  </div>
                ))}
            </Collapsible>

            <Collapsible open={showAudit} onToggle={() => setShowAudit((s) => !s)} icon={ClipboardList}
              title={`${t("lpAuditSection")} (${audit.length})`} card={card}>
              {audit.length === 0
                ? <p style={{ fontSize: 12, color: THEME.text3, margin: 0 }}>{t("lpNoAudit")}</p>
                : audit.map((a) => (
                  <div key={a.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "7px 0", borderBottom: `1px solid ${THEME.borderSoft}`, fontSize: 12 }}>
                    <span style={{ fontWeight: 700, color: THEME.text }}>{t("lpAudit_" + a.action) || a.action}</span>
                    <span style={{ color: THEME.text3, whiteSpace: "nowrap" }}>{a.actor || "—"} · {toJalaliSafe(a.createdAt)}</span>
                  </div>
                ))}
            </Collapsible>
          </>
        )}
      </div>
    );
  }

  // ---------- render: list ----------
  return (
    <div style={{ direction: dir }}>
      <ModuleSubHeader
        icon={Construction}
        title={t("moduleLiftingPlan")}
        note={t("lpSubHeaderNote")}
        onBack={onBack}
        backLabel={t("commonBackPlain")}
      />

      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <select style={styles.filterSelect} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">{t("lpFilterAllStatuses")}</option>
              {LIFTING_STATUS_ORDER.map((s) => (
                <option key={s} value={s}>{t(LIFTING_STATUS_META[s].labelKey)}</option>
              ))}
            </select>
            <span style={{ fontSize: 12, color: THEME.text3 }}>{t("lpCount", { n: filtered.length })}</span>
          </div>
          {!readOnly && (
            <button type="button" onClick={openNew}
              style={{ ...styles.smallButton, background: THEME.teal, display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Plus size={14} /> {t("lpNewPlan")}
            </button>
          )}
        </div>

        {err && <p style={styles.error}>{err}</p>}

        <div style={{ marginTop: 14 }}>
          {loading ? (
            <p style={{ fontSize: 12.5, color: THEME.text3 }}>{t("commonLoading")}</p>
          ) : filtered.length === 0 ? (
            <p style={{ fontSize: 12.5, color: THEME.text3 }}>{t("lpEmpty")}</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filtered.map((p) => (
                <div key={p.id} style={{
                  border: `1px solid ${THEME.cardBorder}`, borderRadius: THEME.radiusCard, padding: "12px 14px",
                  background: THEME.cardBg, display: "flex", justifyContent: "space-between", alignItems: "center",
                  gap: 12, flexWrap: "wrap", opacity: p.status === "archived" ? 0.6 : 1,
                }}>
                  <button type="button" onClick={() => openEdit(p)}
                    style={{ border: "none", background: "transparent", textAlign: "start", cursor: "pointer", flex: 1, minWidth: 0, padding: 0, fontFamily: THEME.font }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 13.5, fontWeight: 800, color: THEME.text }}>
                        {p.title || p.planNumber || t("lpUntitled")}
                      </span>
                      <StatusBadge status={p.status} t={t} />
                      <span style={{ fontSize: 11, color: THEME.text3 }}>{t("lpRevisionShort")} {p.revision}</span>
                    </div>
                    <div style={{ fontSize: 11.5, color: THEME.text3, marginTop: 3 }}>
                      {[p.planNumber && `${t("lpFieldPlanNumber")}: ${p.planNumber}`, p.project, p.contractorName, p.planDate && toJalaliSafe(p.planDate)]
                        .filter(Boolean).join("  ·  ")}
                    </div>
                  </button>

                  {!readOnly && (
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      <IconBtn title={t("lpDuplicate")} onClick={() => doDuplicate(p)} disabled={busyId === p.id}><Copy size={15} /></IconBtn>
                      <IconBtn title={p.status === "archived" ? t("lpRestore") : t("lpArchive")} onClick={() => doArchiveToggle(p)} disabled={busyId === p.id}>
                        {p.status === "archived" ? <ArchiveRestore size={15} /> : <Archive size={15} />}
                      </IconBtn>
                      <IconBtn title={t("commonDelete")} danger onClick={() => doDelete(p)} disabled={busyId === p.id}><Trash2 size={15} /></IconBtn>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, full }) {
  return (
    <div style={{ gridColumn: full ? "1 / -1" : undefined }}>
      <label style={{ ...styles.label, marginTop: 0 }}>{label}</label>
      {children}
    </div>
  );
}

function IconBtn({ children, title, onClick, disabled, danger }) {
  return (
    <button type="button" title={title} aria-label={title} onClick={onClick} disabled={disabled}
      style={{
        width: 30, height: 30, borderRadius: 8, display: "inline-flex", alignItems: "center", justifyContent: "center",
        border: `1px solid ${THEME.border}`, background: THEME.surface, cursor: disabled ? "default" : "pointer",
        color: danger ? THEME.danger : THEME.text2, opacity: disabled ? 0.5 : 1,
      }}>
      {children}
    </button>
  );
}

function Collapsible({ open, onToggle, icon: Icon, title, card, children }) {
  return (
    <div style={{ ...card, paddingTop: 12, paddingBottom: open ? undefined : 12 }}>
      <button type="button" onClick={onToggle}
        style={{ width: "100%", border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, padding: 0, fontFamily: THEME.font }}>
        {open ? <ChevronDown size={16} color={THEME.text3} /> : <ChevronRight size={16} color={THEME.text3} />}
        <Icon size={15} color={THEME.tealDeep} />
        <span style={{ fontSize: 13, fontWeight: 800, color: THEME.heading }}>{title}</span>
      </button>
      {open && <div style={{ marginTop: 12 }}>{children}</div>}
    </div>
  );
}
