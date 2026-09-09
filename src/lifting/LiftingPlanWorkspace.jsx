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
  freezeLiftingRevision, loadLiftingRevisions, loadLiftingAudit, saveLiftingScene,
  LIFTING_STATUS_META, LIFTING_STATUS_ORDER, liftingStatusMeta, EMPTY_SCENE,
} from "./liftingPlanApi.js";
import LiftingPlanCanvas, { makeObject, LIFTING_OBJECT_META } from "./LiftingPlanCanvas.jsx";

/* ============================================================================ *
 * Lifting Plan Designer — Workspace: فهرست + فرمِ متادیتا + بومِ دوبعدیِ
 * داده‌محور (فاز ۲) + Versioning / Duplicate / Archive / Audit Trail.
 * از Layout/Theme/RTL/توکن‌های مشترکِ IHMS استفاده می‌کند؛ هیچ CSS جدید.
 * ============================================================================ */

// فیلدهای Inspector به تفکیکِ نوعِ شیء — فقط داده‌ی دامنه؛ هندسه با دستگیره‌های بوم.
const OBJ_PROP_FIELDS = {
  crane: [
    { key: "model", labelKey: "lpPropModel" },
    { key: "boomLengthM", labelKey: "lpPropBoomLen", num: true, unit: "m" },
    { key: "boomAngleDeg", labelKey: "lpPropBoomAngle", num: true, unit: "°" },
    { key: "chartRef", labelKey: "lpPropChartRef" },
  ],
  load: [
    { key: "label", labelKey: "lpPropLabel" },
    { key: "weightKg", labelKey: "lpPropWeight", num: true, unit: "kg" },
  ],
  hook: [
    { key: "weightKg", labelKey: "lpPropWeight", num: true, unit: "kg" },
    { key: "wllKg", labelKey: "lpPropWll", num: true, unit: "kg" },
  ],
  sling: [
    { key: "wllKg", labelKey: "lpPropWll", num: true, unit: "kg" },
    { key: "weightKg", labelKey: "lpPropWeight", num: true, unit: "kg" },
    { key: "count", labelKey: "lpPropCount", num: true },
    { key: "angleDeg", labelKey: "lpPropAngle", num: true, unit: "°" },
  ],
  shackle: [
    { key: "wllKg", labelKey: "lpPropWll", num: true, unit: "kg" },
    { key: "count", labelKey: "lpPropCount", num: true },
  ],
  spreader_beam: [
    { key: "wllKg", labelKey: "lpPropWll", num: true, unit: "kg" },
    { key: "lengthM", labelKey: "lpPropLength", num: true, unit: "m" },
    { key: "weightKg", labelKey: "lpPropWeight", num: true, unit: "kg" },
  ],
  power_line: [
    { key: "voltageKv", labelKey: "lpPropVoltage", num: true, unit: "kV" },
    { key: "clearanceM", labelKey: "lpPropClearance", num: true, unit: "m" },
  ],
  worker: [{ key: "role", labelKey: "lpPropRole" }],
  structure: [{ key: "label", labelKey: "lpPropLabel" }],
  truck: [{ key: "label", labelKey: "lpPropLabel" }],
  barrier: [{ key: "label", labelKey: "lpPropLabel" }],
  exclusion_zone: [{ key: "label", labelKey: "lpPropLabel" }],
};

const clone = (v) => JSON.parse(JSON.stringify(v || null));

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

  // ---- بومِ دوبعدی (فاز ۲) ----
  const [scene, setScene] = useState(() => clone(EMPTY_SCENE));
  const [sceneBaseline, setSceneBaseline] = useState(() => clone(EMPTY_SCENE));
  const [selObjId, setSelObjId] = useState(null);
  const [sceneSaving, setSceneSaving] = useState(false);
  const sceneDirty = useMemo(
    () => JSON.stringify(scene) !== JSON.stringify(sceneBaseline),
    [scene, sceneBaseline]
  );
  const selObj = useMemo(
    () => (scene?.objects || []).find((o) => o.id === selObjId) || null,
    [scene, selObjId]
  );

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
    setScene(clone(EMPTY_SCENE));
    setSceneBaseline(clone(EMPTY_SCENE));
    setSelObjId(null);
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
    const sc = p.scene && Array.isArray(p.scene.objects) ? clone(p.scene) : clone(EMPTY_SCENE);
    setScene(sc);
    setSceneBaseline(clone(sc));
    setSelObjId(null);
    const [revs, aud] = await Promise.all([loadLiftingRevisions(p.id), loadLiftingAudit(p.id)]);
    setRevisions(revs);
    setAudit(aud);
  };

  const set = (k, v) => setMeta((prev) => ({ ...prev, [k]: v }));

  // ---- عملیاتِ بوم ----
  const addObject = (type) => {
    const obj = makeObject(type);
    setScene((s) => ({ ...s, objects: [...(s.objects || []), obj] }));
    setSelObjId(obj.id);
  };
  const patchObjProp = (id, key, val) => {
    setScene((s) => ({
      ...s,
      objects: (s.objects || []).map((o) => (o.id === id ? { ...o, props: { ...o.props, [key]: val } } : o)),
    }));
  };
  const saveScene = async () => {
    if (editId == null) { setErr(t("lpSceneNeedSaveFirst")); return; }
    setSceneSaving(true);
    setErr("");
    const res = await saveLiftingScene(editId, scene, undefined, actor);
    setSceneSaving(false);
    if (res?.__error) { setErr(res.message || t("commonErrorSave")); return; }
    setSceneBaseline(clone(scene));
    setAudit(await loadLiftingAudit(editId));
    refresh();
  };

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

        {/* بومِ دوبعدیِ داده‌محور */}
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
            <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 800, color: THEME.heading }}>{t("lpCanvasSection")}</h3>
            {isNew && <span style={{ fontSize: 11, color: THEME.text3 }}>{t("lpSceneNeedSaveFirst")}</span>}
          </div>

          {!readOnly && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(118px, 1fr))", gap: 7, marginBottom: 12 }}>
              {LIFTING_OBJECT_META.map((m) => (
                <button key={m.type} type="button" onClick={() => addObject(m.type)} disabled={isNew}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 7, textAlign: "start", fontFamily: THEME.font,
                    fontSize: 12, fontWeight: 600, padding: "7px 10px", borderRadius: 9, cursor: isNew ? "default" : "pointer",
                    border: `1px solid ${THEME.borderSoft}`, background: THEME.surface2, color: THEME.text, opacity: isNew ? 0.5 : 1,
                  }}>
                  <span aria-hidden style={{ fontSize: 14 }}>{m.emoji}</span>{t("lpObj_" + m.type)}
                </button>
              ))}
            </div>
          )}

          <LiftingPlanCanvas
            scene={scene}
            onChange={setScene}
            selectedId={selObjId}
            onSelect={setSelObjId}
            readOnly={readOnly || isNew}
          />

          {selObj && (
            <div style={{ marginTop: 14, border: `1px solid ${THEME.borderSoft}`, borderRadius: 10, padding: "12px 14px", background: THEME.surface2 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: THEME.heading, marginBottom: 8 }}>
                {t("lpInspSection")} — {t("lpObj_" + selObj.type)}
              </div>
              <div style={styles.formGridWide}>
                {(OBJ_PROP_FIELDS[selObj.type] || []).map((f) => (
                  <Field key={f.key} label={t(f.labelKey) + (f.unit ? ` (${f.unit})` : "")}>
                    <input
                      style={styles.input}
                      type={f.num ? "number" : "text"}
                      inputMode={f.num ? "decimal" : undefined}
                      value={selObj.props?.[f.key] ?? ""}
                      disabled={readOnly}
                      onChange={(e) => patchObjProp(selObj.id, f.key, f.num ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)}
                    />
                  </Field>
                ))}
                {(OBJ_PROP_FIELDS[selObj.type] || []).length === 0 && (
                  <p style={{ fontSize: 11.5, color: THEME.text3, margin: 0 }}>{t("lpNoProps")}</p>
                )}
              </div>
            </div>
          )}

          {!readOnly && !isNew && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 14 }}>
              <button type="button" onClick={saveScene} disabled={sceneSaving || !sceneDirty}
                style={{ ...styles.smallButton, background: THEME.teal, opacity: sceneSaving || !sceneDirty ? 0.6 : 1, display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Save size={14} /> {sceneSaving ? t("commonSaving") : t("lpSaveScene")}
              </button>
              <span style={{ fontSize: 11.5, color: sceneDirty ? THEME.warn : THEME.text3 }}>
                {sceneDirty ? t("lpSceneUnsaved") : t("lpSceneSavedHint")}
              </span>
            </div>
          )}
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
