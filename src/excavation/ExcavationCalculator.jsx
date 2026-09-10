import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Mountain, Plus, Trash2, Archive, ArchiveRestore, Save, X, SlidersHorizontal,
  Camera, History, ChevronDown, ChevronRight, AlertTriangle,
} from "lucide-react";
import { THEME, styles } from "../shared.js";
import { resizeImageFile } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import ModuleSubHeader from "../shared/ModuleSubHeader.jsx";
import InfoHint from "../shared/InfoHint.jsx";
import { JalaliDateInput, toJalaliSafe } from "../personnel/jalaliDate.jsx";
import {
  loadExcavationAssessments, createExcavationAssessment, updateExcavationAssessment,
  archiveExcavationAssessment, restoreExcavationAssessment, deleteExcavationAssessment,
  loadExcavationAudit, uploadExcavationPhoto, saveExcavationPhotoIds,
  loadStandardProfile, SOIL_TYPE_LABEL_KEYS, PROTECTION_METHOD_LABEL_KEYS,
} from "./excavationApi.js";
import { computeExcavation, SOIL_TYPES, PROTECTION_METHODS, DEFAULT_PROFILE } from "./excavationCalcEngine.js";
import ExcavationStandardProfileManager from "./ExcavationStandardProfileManager.jsx";

/* ============================================================================ *
 * Excavation Slope & Width Calculator — فهرست + فرم + محاسبه‌ی لحظه‌ای (OSHA
 * 29 CFR 1926 Subpart P, Appendix B) + مقطعِ گرافیکی + Save to IHMS + عکس +
 * Audit Trail. دقیقاً هم‌معماریِ Lifting Plan Designer: local draft تا کلیکِ
 * صریحِ ذخیره، company-scoped، offlineWrite، Standard Profile قابلِ‌تنظیم.
 * ============================================================================ */

const EMPTY_FORM = {
  project: "", contractorId: "", contractorName: "", title: "", assessmentDate: "",
  depthM: "", bottomWidthM: "", lengthM: "", soilType: "type_b",
  hasWater: false, edgeLoad: false, adjacentStructure: false, vibration: false,
  protectionMethod: "sloping", notes: "",
};

const headerIconBtn = {
  ...styles.smallButton,
  background: THEME.surface2, color: THEME.text,
  display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", flexShrink: 0,
};

function Field({ label, children, full }) {
  return (
    <div style={{ gridColumn: full ? "1 / -1" : undefined }}>
      <label style={{ ...styles.label, marginTop: 0 }}>{label}</label>
      {children}
    </div>
  );
}

const toneColor = (tone) => (tone === "bad" ? THEME.danger : tone === "warn" ? THEME.warn : THEME.ok);
const toneBg = (tone) => (tone === "bad" ? THEME.dangerBg : tone === "warn" ? THEME.warnBg : THEME.okBg);
const toneDot = (tone) => (tone === "bad" ? "🔴" : tone === "warn" ? "🟡" : "🟢");
const fmt = (n, d = 2) => (n == null || !Number.isFinite(n) ? "—" : Number(n.toFixed(d)).toLocaleString());

// مقطعِ گرافیکیِ گود — دیوارهای شیب‌دار در دو طرف (نمای عرض)، یا دیواره‌ی
// نزدیک‌به‌قائم برای Shoring/Shield (شیب اینجا اصلاً اعمال نمی‌شود).
function ExcavationCrossSection({ calc, t }) {
  const VW = 360, VH = 220, padB = 30, padSide = 20;
  if (!calc || !calc.depthM) {
    return (
      <svg viewBox={`0 0 ${VW} ${VH}`} style={{ width: "100%", height: "auto", display: "block" }}>
        <text x={VW / 2} y={VH / 2} fill={THEME.text3} fontSize="12" textAnchor="middle" fontFamily={THEME.font}>{t("excFillInputsForDiagram")}</text>
      </svg>
    );
  }
  const depth = calc.depthM;
  const bottomW = calc.applicable ? Math.max(0.5, calc.bottomWidthM) : Math.max(0.5, calc.bottomWidthM || 2);
  const setback = calc.applicable ? calc.setbackM : Math.max(0.15, depth * 0.05); // نمادین برای Shoring/Shield
  const topW = bottomW + 2 * setback;
  const groundY = VH - padB;
  const usableW = VW - padSide * 2;
  const scale = Math.min((usableW) / Math.max(topW, 0.1), (groundY - 20) / Math.max(depth, 0.1));
  const bx0 = VW / 2 - (bottomW * scale) / 2, bx1 = VW / 2 + (bottomW * scale) / 2;
  const tx0 = VW / 2 - (topW * scale) / 2, tx1 = VW / 2 + (topW * scale) / 2;
  const bottomY = groundY - depth * scale;
  const dashed = !calc.applicable;
  const col = calc.verdict === "bad" ? THEME.danger : calc.verdict === "warn" ? THEME.warn : THEME.teal;

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} style={{ width: "100%", height: "auto", display: "block" }}>
      {/* زمین */}
      <line x1={0} y1={groundY} x2={VW} y2={groundY} stroke={THEME.text2} strokeWidth="2" />
      {Array.from({ length: 18 }).map((_, i) => (
        <line key={i} x1={i * 22} y1={groundY} x2={i * 22 - 7} y2={groundY + 7} stroke={THEME.text3} strokeWidth="1" />
      ))}
      {/* دیواره‌ها + کف */}
      <polygon
        points={`${tx0},${groundY} ${bx0},${bottomY} ${bx1},${bottomY} ${tx1},${groundY}`}
        fill={col} fillOpacity="0.12" stroke={col} strokeWidth="2" strokeDasharray={dashed ? "6 4" : ""}
      />
      <line x1={bx0} y1={bottomY} x2={bx1} y2={bottomY} stroke={col} strokeWidth="2.5" />
      {/* بعدِ عمق */}
      <line x1={padSide - 6} y1={groundY} x2={padSide - 6} y2={bottomY} stroke={THEME.text3} strokeWidth="1" />
      <text x={padSide - 10} y={(groundY + bottomY) / 2} fill={THEME.text2} fontSize="9.5" textAnchor="end" fontFamily={THEME.font}>{fmt(depth, 1)}m</text>
      {/* بعدِ عرضِ کف */}
      <text x={(bx0 + bx1) / 2} y={bottomY - 6} fill={THEME.text} fontSize="9.5" textAnchor="middle" fontFamily={THEME.font}>{fmt(bottomW, 1)}m</text>
      {/* بعدِ عرضِ بالا */}
      <text x={(tx0 + tx1) / 2} y={groundY + 16} fill={THEME.text2} fontSize="9.5" textAnchor="middle" fontFamily={THEME.font}>{t("excTopWidthShort")} {fmt(topW, 1)}m</text>
      {calc.applicable && (
        <text x={(bx0 + tx0) / 2} y={(bottomY + groundY) / 2} fill={THEME.text3} fontSize="9" textAnchor="middle" fontFamily={THEME.font}>
          {fmt(calc.angleDeg, 0)}°
        </text>
      )}
    </svg>
  );
}

export default function ExcavationCalculator({ currentUser, role, onBack, wide, readOnly = false }) {
  const { t, dir } = useLanguage();
  const actor = currentUser?.name || currentUser?.username || "";
  const isSupervisor = currentUser?.role === "HSE_SUPERVISOR";
  const card = wide ? styles.cardWide : styles.card;

  const [mode, setMode] = useState("list"); // list | edit | profile
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [baseline, setBaseline] = useState(EMPTY_FORM);
  const [existingPhotoIds, setExistingPhotoIds] = useState([]);
  const [newPhotos, setNewPhotos] = useState([]); // data URLs, local-only تا ذخیره
  const [photoBusy, setPhotoBusy] = useState(false);
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [audit, setAudit] = useState([]);
  const [showAudit, setShowAudit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    const [list, prof] = await Promise.all([
      loadExcavationAssessments({ includeArchived: true }).catch(() => []),
      loadStandardProfile().catch(() => null),
    ]);
    setItems(Array.isArray(list) ? list : []);
    if (prof?.profile) setProfile({ ...DEFAULT_PROFILE, ...prof.profile, slopes: { ...DEFAULT_PROFILE.slopes, ...(prof.profile.slopes || {}) } });
    setLoading(false);
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(baseline) || newPhotos.length > 0, [form, baseline, newPhotos]);

  const calc = useMemo(() => computeExcavation({
    depthM: form.depthM, bottomWidthM: form.bottomWidthM, lengthM: form.lengthM,
    soilType: form.soilType, hasWater: form.hasWater, edgeLoad: form.edgeLoad,
    adjacentStructure: form.adjacentStructure, vibration: form.vibration, protectionMethod: form.protectionMethod,
  }, profile), [form, profile]);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const openNew = () => {
    setForm(EMPTY_FORM); setBaseline(EMPTY_FORM); setEditId(null);
    setExistingPhotoIds([]); setNewPhotos([]); setAudit([]); setShowAudit(false); setErr("");
    setMode("edit");
  };
  const openEdit = (rec) => {
    const f = {
      project: rec.project, contractorId: rec.contractorId, contractorName: rec.contractorName, title: rec.title,
      assessmentDate: rec.assessmentDate, depthM: rec.depthM, bottomWidthM: rec.bottomWidthM, lengthM: rec.lengthM,
      soilType: rec.soilType, hasWater: rec.hasWater, edgeLoad: rec.edgeLoad, adjacentStructure: rec.adjacentStructure,
      vibration: rec.vibration, protectionMethod: rec.protectionMethod, notes: rec.notes,
    };
    setForm(f); setBaseline(f); setEditId(rec.id);
    setExistingPhotoIds(rec.photoIds || []); setNewPhotos([]); setShowAudit(false); setErr("");
    loadExcavationAudit(rec.id).then(setAudit);
    setMode("edit");
  };

  const handlePickPhotos = async (fileList) => {
    const files = Array.from(fileList || []).slice(0, 4 - newPhotos.length - existingPhotoIds.length);
    if (files.length === 0) return;
    setPhotoBusy(true);
    try {
      const results = await Promise.all(files.map((f) => resizeImageFile(f)));
      setNewPhotos((p) => [...p, ...results]);
    } catch { /* بی‌اهمیت — کاربر می‌تواند دوباره امتحان کند */ }
    setPhotoBusy(false);
  };

  const save = async () => {
    setSaving(true); setErr("");
    const rec = { ...form, calc: { ...calc, standardProfileNote: profile.note || "" } };
    const res = editId ? await updateExcavationAssessment(editId, rec, actor) : await createExcavationAssessment(rec, actor);
    if (res?.__error) { setSaving(false); setErr(res.message || t("commonErrorSave")); return; }
    const id = res.id;
    let photoIds = existingPhotoIds;
    if (newPhotos.length > 0) {
      const uploaded = [];
      for (const dataUrl of newPhotos) {
        const commaIdx = dataUrl.indexOf(",");
        const contentType = (dataUrl.slice(5, dataUrl.indexOf(";")) || "image/jpeg");
        const base64Data = dataUrl.slice(commaIdx + 1);
        const up = await uploadExcavationPhoto(id, base64Data, contentType);
        if (up?.url) uploaded.push(up.url);
      }
      photoIds = [...existingPhotoIds, ...uploaded];
      await saveExcavationPhotoIds(id, photoIds, actor);
    }
    setSaving(false);
    setEditId(id); setBaseline(form); setNewPhotos([]); setExistingPhotoIds(photoIds);
    await refresh();
    loadExcavationAudit(id).then(setAudit);
  };

  const doArchive = async (rec) => {
    setBusyId(rec.id);
    const res = rec.archivedAt ? await restoreExcavationAssessment(rec.id, actor) : await archiveExcavationAssessment(rec.id, actor);
    setBusyId("");
    if (res?.__error) { setErr(res.message); return; }
    await refresh();
  };
  const doDelete = async (rec) => {
    if (!window.confirm(t("excConfirmDelete"))) return;
    setBusyId(rec.id);
    const res = await deleteExcavationAssessment(rec.id, actor);
    setBusyId("");
    if (res?.__error) { setErr(res.message); return; }
    await refresh();
  };

  if (mode === "profile") {
    return <ExcavationStandardProfileManager onBack={() => setMode("list")} wide={wide} currentUser={currentUser} />;
  }

  // ---------- render: edit/new ----------
  if (mode === "edit") {
    const isNew = editId == null;
    return (
      <div style={{ direction: dir }}>
        <ModuleSubHeader icon={Mountain} title={isNew ? t("excNewTitle") : t("excEditTitle")} note={t("excSubHeaderNote")}
          onBack={() => setMode("list")} backLabel={t("commonBackPlain")} />

        <div style={card}>
          <h3 style={{ margin: "0 0 10px", fontSize: 14.5, fontWeight: 800, color: THEME.heading }}>{t("excMetaSection")}</h3>
          <div style={styles.formGridWide}>
            <Field label={t("excFieldProject")}><input style={styles.input} disabled={readOnly} value={form.project} onChange={(e) => set("project", e.target.value)} /></Field>
            <Field label={t("excFieldContractor")}><input style={styles.input} disabled={readOnly} value={form.contractorName} onChange={(e) => set("contractorName", e.target.value)} /></Field>
            <Field label={t("excFieldDate")}><JalaliDateInput value={form.assessmentDate} allowEmpty disabled={readOnly} onChange={(v) => set("assessmentDate", v)} style={styles.input} /></Field>
            <Field label={t("excFieldTitle")} full><input style={styles.input} disabled={readOnly} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder={t("excFieldTitleHint")} /></Field>
          </div>
        </div>

        <div style={card}>
          <h3 style={{ margin: "0 0 10px", fontSize: 14.5, fontWeight: 800, color: THEME.heading, display: "flex", alignItems: "center", gap: 6 }}>
            {t("excInputsSection")}
            {isSupervisor && (
              <button type="button" onClick={() => setMode("profile")} title={t("excStandardProfileTitle")} style={{ ...headerIconBtn, marginInlineStart: "auto" }}>
                <SlidersHorizontal size={13} /> {t("excBtnStandardProfile")}
              </button>
            )}
          </h3>
          <div style={styles.formGridWide}>
            <Field label={<>{t("excFieldDepth")} (m) <InfoHint text={t("excHintDepth")} /></>}>
              <input style={styles.input} type="number" step="any" min="0" disabled={readOnly} value={form.depthM} onChange={(e) => set("depthM", e.target.value)} />
            </Field>
            <Field label={t("excFieldBottomWidth")} full={false}>
              <input style={styles.input} type="number" step="any" min="0" disabled={readOnly} value={form.bottomWidthM} onChange={(e) => set("bottomWidthM", e.target.value)} />
            </Field>
            <Field label={t("excFieldLength")}>
              <input style={styles.input} type="number" step="any" min="0" disabled={readOnly} value={form.lengthM} onChange={(e) => set("lengthM", e.target.value)} />
            </Field>
            <Field label={<>{t("excFieldSoilType")} <InfoHint text={t("excHintSoilType")} /></>}>
              <select style={styles.input} disabled={readOnly} value={form.soilType} onChange={(e) => set("soilType", e.target.value)}>
                {SOIL_TYPES.map((s) => <option key={s} value={s}>{t(SOIL_TYPE_LABEL_KEYS[s])}</option>)}
              </select>
            </Field>
            <Field label={t("excFieldProtectionMethod")}>
              <select style={styles.input} disabled={readOnly} value={form.protectionMethod} onChange={(e) => set("protectionMethod", e.target.value)}>
                {PROTECTION_METHODS.map((m) => <option key={m} value={m}>{t(PROTECTION_METHOD_LABEL_KEYS[m])}</option>)}
              </select>
            </Field>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 14 }}>
            {[
              ["hasWater", "excFieldWater"], ["edgeLoad", "excFieldEdgeLoad"],
              ["adjacentStructure", "excFieldAdjacentStructure"], ["vibration", "excFieldVibration"],
            ].map(([k, labelKey]) => (
              <label key={k} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: THEME.text2, cursor: "pointer" }}>
                <input type="checkbox" disabled={readOnly} checked={!!form[k]} onChange={(e) => set(k, e.target.checked)} />
                {t(labelKey)}
              </label>
            ))}
          </div>
        </div>

        {/* ---------- پنلِ محاسبه‌ی لحظه‌ای ---------- */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 20 }}>{toneDot(calc.verdict)}</span>
            <span style={{ fontSize: 13.5, fontWeight: 800, color: toneColor(calc.verdict) }}>
              {calc.verdict === "bad" ? t("excVerdictBad") : calc.verdict === "warn" ? t("excVerdictWarn") : t("excVerdictOk")}
            </span>
          </div>

          {calc.warnings?.includes("pe_required") && (
            <div style={{ display: "flex", gap: 8, background: THEME.dangerBg, border: `1px solid ${THEME.danger}55`, borderRadius: 9, padding: "10px 12px", marginBottom: 10 }}>
              <AlertTriangle size={16} color={THEME.danger} style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 12, color: THEME.danger, fontWeight: 700, lineHeight: 1.8 }}>{t("excPeRequiredMsg", { m: fmt(calc.peRequiredDepthM ?? profile.peRequiredDepthM, 1) })}</span>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
            <div>
              {!calc.applicable ? (
                <p style={{ fontSize: 12.5, color: THEME.text2, lineHeight: 1.9 }}>{t("excNotSlopeBasedMsg")}</p>
              ) : (
                <>
                  <Row k={t("excOutSlopeRatio")} v={`${fmt(calc.hRatio, 2)} : 1`} />
                  <Row k={t("excOutAngle")} v={`${fmt(calc.angleDeg, 0)}°`} />
                  <Row k={t("excOutSetback")} v={`${fmt(calc.setbackM, 2)} m`} />
                  <Row k={t("excOutBottomWidth")} v={`${fmt(calc.bottomWidthM, 2)} m`} />
                  <Row k={t("excOutTopWidth")} v={`${fmt(calc.topWidthM, 2)} m`} strong />
                  <Row k={t("excOutVolume")} v={`${fmt(calc.volumeM3, 1)} m³`} />
                </>
              )}
              <ExcavationCrossSection calc={calc} t={t} />
            </div>
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 800, color: THEME.text2, marginBottom: 6 }}>{t("excWarningsSection")}</div>
              {(!calc.warnings || calc.warnings.length === 0) ? (
                <p style={{ fontSize: 12, color: THEME.text3 }}>{t("excNoWarnings")}</p>
              ) : calc.warnings.map((code) => (
                <div key={code} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 0", borderBottom: `1px solid ${THEME.borderSoft}`, fontSize: 11.5 }}>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", marginTop: 3, flexShrink: 0, background: code === "pe_required" || code === "benching_not_allowed_type_c" ? THEME.danger : THEME.warn }} />
                  <span style={{ color: THEME.text2 }}>{t(`excWarn_${code}`)}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 14, background: THEME.surface2, border: `1px solid ${THEME.border}`, borderRadius: 10, padding: "10px 12px" }}>
            <p style={{ fontSize: 10.5, color: THEME.text3, margin: 0, lineHeight: 1.8 }}>
              <b>{t("excRefLabel")}</b> {t("excRefText")}<br />
              {t("excDisclaimer")}
            </p>
          </div>
        </div>

        {/* ---------- عکس ---------- */}
        <div style={card}>
          <h3 style={{ margin: "0 0 10px", fontSize: 14.5, fontWeight: 800, color: THEME.heading, display: "flex", alignItems: "center", gap: 6 }}>
            <Camera size={16} color={THEME.teal} /> {t("excPhotosSection")}
          </h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {existingPhotoIds.map((url, i) => (
              <img key={`ex-${i}`} src={url} alt="" style={{ width: 84, height: 84, objectFit: "cover", borderRadius: 9, border: `1px solid ${THEME.border}` }} />
            ))}
            {newPhotos.map((url, i) => (
              <div key={`new-${i}`} style={{ position: "relative" }}>
                <img src={url} alt="" style={{ width: 84, height: 84, objectFit: "cover", borderRadius: 9, border: `1px solid ${THEME.border}` }} />
                {!readOnly && (
                  <button type="button" onClick={() => setNewPhotos((p) => p.filter((_, j) => j !== i))}
                    style={{ position: "absolute", top: -6, insetInlineEnd: -6, width: 20, height: 20, borderRadius: "50%", border: "none", background: THEME.danger, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
            {!readOnly && existingPhotoIds.length + newPhotos.length < 4 && (
              <label style={{ width: 84, height: 84, borderRadius: 9, border: `1.5px dashed ${THEME.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: THEME.text3 }}>
                {photoBusy ? "…" : <Camera size={20} />}
                <input type="file" accept="image/*" capture="environment" multiple hidden onChange={(e) => handlePickPhotos(e.target.files)} disabled={photoBusy} />
              </label>
            )}
          </div>
        </div>

        <div style={card}>
          <Field label={t("excFieldNotes")}>
            <textarea style={{ ...styles.input, minHeight: 60 }} disabled={readOnly} value={form.notes} onChange={(e) => set("notes", e.target.value)} dir={dir} />
          </Field>
          {err && <p style={styles.error}>{err}</p>}
          {!readOnly && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
              <button type="button" onClick={save} disabled={saving || !dirty}
                style={{ ...styles.smallButton, background: THEME.teal, opacity: saving || !dirty ? 0.6 : 1, display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Save size={14} /> {saving ? t("commonSaving") : t("excSaveToIhms")}
              </button>
            </div>
          )}
        </div>

        {!isNew && (
          <div style={{ ...card, paddingTop: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => setShowAudit((v) => !v)}>
              {showAudit ? <ChevronDown size={15} /> : (dir === "rtl" ? <ChevronRight size={15} style={{ transform: "rotate(180deg)" }} /> : <ChevronRight size={15} />)}
              <History size={15} color={THEME.tealDeep} />
              <span style={{ fontSize: 13, fontWeight: 800, color: THEME.heading }}>{t("lpAuditSection")} ({audit.length})</span>
            </div>
            {showAudit && (
              audit.length === 0
                ? <p style={{ fontSize: 12, color: THEME.text3, margin: "10px 0 0" }}>{t("lpNoAudit")}</p>
                : audit.map((a) => (
                  <div key={a.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "7px 0", borderBottom: `1px solid ${THEME.borderSoft}`, fontSize: 12, marginTop: 8 }}>
                    <span style={{ fontWeight: 700, color: THEME.text }}>{t("lpAudit_" + a.action) || a.action}</span>
                    <span style={{ color: THEME.text3, whiteSpace: "nowrap" }}>{a.actor || "—"} · {toJalaliSafe(a.createdAt)}</span>
                  </div>
                ))
            )}
          </div>
        )}
      </div>
    );
  }

  // ---------- render: list ----------
  return (
    <div style={{ direction: dir }}>
      <ModuleSubHeader icon={Mountain} title={t("excModuleTitle")} note={t("excSubHeaderNote")} onBack={onBack} backLabel={t("commonBackPlain")}
        actions={isSupervisor && (
          <button type="button" onClick={() => setMode("profile")} title={t("excStandardProfileTitle")} style={headerIconBtn}>
            <SlidersHorizontal size={14} /> {t("excBtnStandardProfile")}
          </button>
        )}
      />
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <span style={{ fontSize: 12, color: THEME.text3 }}>{t("excCount", { n: items.length })}</span>
          {!readOnly && (
            <button type="button" onClick={openNew} style={{ ...styles.smallButton, background: THEME.teal, display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Plus size={14} /> {t("excNewAssessment")}
            </button>
          )}
        </div>
        {err && <p style={styles.error}>{err}</p>}
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
          {loading ? <p style={{ fontSize: 12.5, color: THEME.text3 }}>{t("commonLoading")}</p>
            : items.length === 0 ? <p style={{ fontSize: 12.5, color: THEME.text3 }}>{t("excEmpty")}</p>
              : items.map((r) => {
                const c = computeExcavation(r, profile);
                return (
                  <div key={r.id} style={{ border: `1px solid ${THEME.cardBorder}`, borderRadius: THEME.radiusCard, padding: "12px 14px", background: THEME.cardBg, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", opacity: r.archivedAt ? 0.6 : 1 }}>
                    <button type="button" onClick={() => openEdit(r)} style={{ border: "none", background: "transparent", textAlign: "start", cursor: "pointer", flex: 1, minWidth: 0, padding: 0, fontFamily: THEME.font }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span>{toneDot(c.verdict)}</span>
                        <span style={{ fontSize: 13.5, fontWeight: 800, color: THEME.text }}>{r.title || t("excUntitled")}</span>
                      </div>
                      <div style={{ fontSize: 11.5, color: THEME.text3, marginTop: 3 }}>
                        {[r.project, t(SOIL_TYPE_LABEL_KEYS[r.soilType]), `${fmt(r.depthM, 1)}m`, toJalaliSafe(r.assessmentDate)].filter(Boolean).join("  ·  ")}
                      </div>
                    </button>
                    {!readOnly && (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button type="button" title={r.archivedAt ? t("excRestore") : t("excArchive")} onClick={() => doArchive(r)} disabled={busyId === r.id}
                          style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${THEME.border}`, background: THEME.surface, color: THEME.text2, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                          {r.archivedAt ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                        </button>
                        <button type="button" title={t("commonDelete")} onClick={() => doDelete(r)} disabled={busyId === r.id}
                          style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${THEME.border}`, background: THEME.surface, color: THEME.danger, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
        </div>
      </div>
    </div>
  );
}

function Row({ k, v, strong }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: `1px solid ${THEME.borderSoft}`, fontSize: 12.5 }}>
      <span style={{ color: THEME.text3 }}>{k}</span>
      <span style={{ color: THEME.text, fontWeight: strong ? 800 : 600 }}>{v}</span>
    </div>
  );
}
