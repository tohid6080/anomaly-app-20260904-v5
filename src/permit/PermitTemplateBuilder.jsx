import React, { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, ArrowUp, ArrowDown, Lock, Unlock, Save, Eye, EyeOff, BookOpen } from "lucide-react";
import { THEME, styles } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import PermitRuntime from "./PermitRuntime.jsx";
import {
  FIELD_TYPES, isInput, BIND_TARGETS, defaultConfigFor,
  newField, newCell, newRow, newSection, arrMove,
  APPROVAL_STEPS, blankWorkflow, getStepApproval,
} from "./permitModel.js";
import { loadPermitTemplate, saveTemplate } from "./permitApi.js";
import { loadActiveJobPositions } from "../jobpositions/jobPositionsApi.js";

const clone = (v) => JSON.parse(JSON.stringify(v ?? null));
const genColId = () => `c_${Math.random().toString(36).slice(2, 7)}`;
const sumSpans = (row) => (row.cells || []).reduce((n, c) => n + (Number(c.span) || 0), 0);

const iconBtn = { border: `1px solid ${THEME.border}`, background: "transparent", color: THEME.text2, borderRadius: 6, width: 26, height: 26, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" };
const iconBtnSm = { ...iconBtn, width: 20, height: 20, border: "none" };
const ghostBtn = { border: `1px dashed ${THEME.border}`, background: "transparent", color: THEME.text2, borderRadius: 7, padding: "5px 10px", fontFamily: THEME.font, fontSize: 11, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 };

// نمونه‌ی ثابتِ آموزشی — فقط برای نمایش در پنلِ راهنما؛ هرگز ذخیره نمی‌شود.
const GUIDE_SCHEMA = {
  sections: [
    { id: "g_sec", title: "نمونه: شرحِ کار — این جعبه یک «بخش» است", locked: false, rows: [
      { id: "g_r1", cells: [
        { span: 4, kind: "field", field: { id: "g_f1", type: "text", label: "نام و نام خانوادگی", required: true } },
        { span: 4, kind: "field", field: { id: "g_f2", type: "select", label: "نوعِ عملیات", config: { options: ["برق", "مکانیک", "ساختمان"] } } },
        { span: 4, kind: "field", field: { id: "g_f3", type: "date", label: "تاریخ" } },
      ] },
      { id: "g_r2", cells: [
        { span: 12, kind: "field", field: { id: "g_f4", type: "long_text", label: "شرحِ عملیات — این فیلد تمامِ عرضِ ۱۲ را گرفته" } },
      ] },
      { id: "g_r3", cells: [
        { span: 6, kind: "field", field: { id: "g_f5", type: "checkgroup", label: "کنترل‌های ویژه", config: { options: ["کار در ارتفاع", "کارِ گرم"] } } },
        { span: 6, kind: "field", field: { id: "g_f6", type: "table", label: "فهرستِ نفرات", config: { columns: [{ id: "c1", label: "نام" }, { id: "c2", label: "سمت" }] } } },
      ] },
    ] },
  ],
};

const GUIDE_ITEMS = [
  ["pmGuideTermSection", "pmGuideDescSection"],
  ["pmGuideTermRow", "pmGuideDescRow"],
  ["pmGuideTermCell", "pmGuideDescCell"],
  ["pmGuideTermField", "pmGuideDescField"],
  ["pmGuideTermFieldType", "pmGuideDescFieldType"],
  ["pmGuideTermRequired", "pmGuideDescRequired"],
  ["pmGuideTermBind", "pmGuideDescBind"],
  ["pmGuideTermOptions", "pmGuideDescOptions"],
  ["pmGuideTermPreview", "pmGuideDescPreview"],
  ["pmGuideTermSave", "pmGuideDescSave"],
];

/**
 * فرم‌سازِ گرید/جدولیِ قالبِ مجوز کار — Section → Row(۱۲ستون) → Cell → Field.
 * فقط برایِ قالبِ اختصاصیِ شرکت (نه قالبِ سیستمی). پیش‌نویسِ محلی + یک دکمه‌ی
 * ذخیره‌ی صریح؛ چیزی به‌ازای هر تغییر نوشته نمی‌شود.
 */
export default function PermitTemplateBuilder({ templateId, currentUser, onBack, onSaved }) {
  const { t, dir } = useLanguage();
  const [tpl, setTpl] = useState(null);
  const [meta, setMeta] = useState(null);
  const [schema, setSchema] = useState(null);
  const [workflow, setWorkflow] = useState(null);
  const [positions, setPositions] = useState([]);
  const [baseline, setBaseline] = useState(null);
  const isHse = currentUser?.role === "HSE_SUPERVISOR";
  const [preview, setPreview] = useState(false);
  const [previewValues, setPreviewValues] = useState({});
  const [showGuide, setShowGuide] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const load = async () => {
    setErr(""); setOk("");
    const row = await loadPermitTemplate(templateId);
    if (!row || row.isSystem) { setErr(t("pmErrNotFound")); return; }
    setTpl(row);
    const m = { name: row.name, permitType: row.permitType, isActive: row.isActive };
    const s = row.schema && Array.isArray(row.schema.sections) ? row.schema : { sections: [] };
    const w = row.workflow && typeof row.workflow === "object" && row.workflow.approvals ? row.workflow : blankWorkflow();
    setMeta(m);
    setSchema(clone(s));
    setWorkflow(clone(w));
    setBaseline({ meta: m, schema: clone(s), workflow: clone(w) });
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [templateId]);
  useEffect(() => { loadActiveJobPositions().then(setPositions).catch(() => setPositions([])); }, []);

  const dirty = useMemo(() => {
    if (!baseline) return false;
    return JSON.stringify({ meta, schema, workflow }) !== JSON.stringify(baseline);
  }, [meta, schema, workflow, baseline]);

  const setStepApproval = (stepId, patch) => setWorkflow((w) => ({
    ...(w || blankWorkflow()),
    approvals: { ...((w || blankWorkflow()).approvals || {}), [stepId]: { ...getStepApproval(w, stepId), ...patch } },
  }));

  const updateSchema = (fn) => setSchema((s) => { const next = clone(s); fn(next); return next; });

  const addSection = () => updateSchema((s) => { s.sections.push(newSection()); });
  const removeSection = (si) => updateSchema((s) => { s.sections.splice(si, 1); });
  const moveSection = (si, dir2) => updateSchema((s) => { s.sections = arrMove(s.sections, si, dir2); });
  const setSectionTitle = (si, title) => updateSchema((s) => { s.sections[si].title = title; });
  const toggleSectionLock = (si) => updateSchema((s) => { s.sections[si].locked = !s.sections[si].locked; });

  const addRow = (si) => updateSchema((s) => { s.sections[si].rows.push(newRow()); });
  const removeRow = (si, ri) => updateSchema((s) => { s.sections[si].rows.splice(ri, 1); });
  const moveRow = (si, ri, dir2) => updateSchema((s) => { s.sections[si].rows = arrMove(s.sections[si].rows, ri, dir2); });

  const addCell = (si, ri, kind) => updateSchema((s) => { s.sections[si].rows[ri].cells.push(newCell(kind)); });
  const removeCell = (si, ri, ci) => updateSchema((s) => { s.sections[si].rows[ri].cells.splice(ci, 1); });
  const moveCell = (si, ri, ci, dir2) => updateSchema((s) => { s.sections[si].rows[ri].cells = arrMove(s.sections[si].rows[ri].cells, ci, dir2); });
  const setCellSpan = (si, ri, ci, span) => updateSchema((s) => { s.sections[si].rows[ri].cells[ci].span = Math.min(12, Math.max(1, span || 1)); });
  const setCellLabel = (si, ri, ci, label) => updateSchema((s) => { s.sections[si].rows[ri].cells[ci].label = label; });

  const setFieldPatch = (si, ri, ci, patch) => updateSchema((s) => { s.sections[si].rows[ri].cells[ci].field = { ...s.sections[si].rows[ri].cells[ci].field, ...patch }; });
  const setFieldConfigPatch = (si, ri, ci, patch) => updateSchema((s) => {
    const f = s.sections[si].rows[ri].cells[ci].field;
    f.config = { ...(f.config || {}), ...patch };
  });

  const doSave = async () => {
    setBusy(true); setErr(""); setOk("");
    const res = await saveTemplate({ ...tpl, ...meta, schema, workflow });
    setBusy(false);
    if (res?.__error) { setErr(res.message); return; }
    setOk(t("pmTemplateSaved"));
    await load();
    onSaved && onSaved();
  };

  if (err && !tpl) return (
    <div style={{ padding: 24 }}>
      {onBack && <div style={styles.backLink} onClick={onBack}>{t("commonBack")}</div>}
      <p style={styles.error}>{err}</p>
    </div>
  );
  if (!tpl || !schema) return <div style={{ padding: 24, color: THEME.text3 }}>{t("commonLoading")}</div>;

  return (
    <div style={{ direction: dir }}>
      {onBack && <div style={styles.backLink} onClick={onBack}>{t("commonBack")}</div>}

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: THEME.heading }}>{t("pmTemplateBuilder")}</h3>
        <div style={{ marginInlineStart: "auto", display: "flex", gap: 6 }}>
          <button type="button" onClick={() => setShowGuide((v) => !v)}
            style={{ ...styles.smallButton, background: THEME.surface2, color: THEME.text, display: "inline-flex", alignItems: "center", gap: 5 }}>
            <BookOpen size={13} /> {t("pmGuideBtn")}
          </button>
          <button type="button" onClick={() => setPreview((v) => !v)}
            style={{ ...styles.smallButton, background: THEME.surface2, color: THEME.text, display: "inline-flex", alignItems: "center", gap: 5 }}>
            {preview ? <EyeOff size={13} /> : <Eye size={13} />} {t("pmPreview")}
          </button>
          <button type="button" onClick={doSave} disabled={busy || !dirty}
            style={{ ...styles.smallButton, background: THEME.teal, opacity: busy || !dirty ? 0.55 : 1, display: "inline-flex", alignItems: "center", gap: 5 }}>
            <Save size={13} /> {t("pmSave")}
          </button>
        </div>
      </div>
      {err && <p style={styles.error}>{err}</p>}
      {ok && <p style={{ ...styles.error, color: THEME.ok }}>{ok}</p>}

      <div style={{ ...styles.cardWide, marginBottom: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          <div>
            <label style={styles.label}>{t("pmTemplateName")}</label>
            <input style={styles.input} value={meta.name} dir={dir} onChange={(e) => setMeta((m) => ({ ...m, name: e.target.value }))} />
          </div>
          <div>
            <label style={styles.label}>{t("pmPermitType")}</label>
            <input style={styles.input} value={meta.permitType} dir="ltr" onChange={(e) => setMeta((m) => ({ ...m, permitType: e.target.value }))} />
          </div>
          <div>
            <label style={styles.label}>{t("pmTemplateActive")}</label>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 6, fontSize: 12.5, color: THEME.text2 }}>
              <input type="checkbox" checked={meta.isActive} onChange={(e) => setMeta((m) => ({ ...m, isActive: e.target.checked }))} /> {t("pmTemplateActive")}
            </label>
          </div>
        </div>
      </div>

      <div style={{ ...styles.cardWide, marginBottom: 12 }}>
        <b style={{ fontSize: 12, color: THEME.heading }}>{t("pmWfTitle")}</b>
        <p style={{ fontSize: 10.5, color: THEME.text3, margin: "4px 0 10px", lineHeight: 1.8 }}>
          {isHse ? t("pmWfHint") : t("pmWfReadOnlyHint")}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {APPROVAL_STEPS.map((stepId) => {
            const cfg = getStepApproval(workflow, stepId);
            return (
              <div key={stepId} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8, alignItems: "end", border: `1px solid ${THEME.borderSoft}`, borderRadius: 8, padding: 8 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: THEME.text }}>{t("pmWfStep_" + stepId)}</div>
                <div>
                  <label style={styles.label}>{t("pmWfApprover")}</label>
                  <select style={styles.input} value={cfg.jobPositionId || ""} disabled={!isHse}
                    onChange={(e) => setStepApproval(stepId, { jobPositionId: e.target.value || undefined })}>
                    <option value="">{t("pmWfNone")}</option>
                    {positions.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                </div>
                <div>
                  <label style={styles.label}>{t("pmWfSubstitute")}</label>
                  <select style={styles.input} value={cfg.substituteJobPositionId || ""} disabled={!isHse || !cfg.jobPositionId}
                    onChange={(e) => setStepApproval(stepId, { substituteJobPositionId: e.target.value || undefined })}>
                    <option value="">{t("pmWfNone")}</option>
                    {positions.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showGuide && (
        <div style={{ ...styles.cardWide, marginBottom: 12 }}>
          <b style={{ fontSize: 12, color: THEME.heading }}>{t("pmGuideTitle")}</b>
          <p style={{ fontSize: 11.5, color: THEME.text3, margin: "4px 0 12px", lineHeight: 1.9 }}>{t("pmGuideIntro")}</p>
          <div style={{ border: `1px dashed ${THEME.border}`, borderRadius: 10, padding: 10, marginBottom: 14, background: THEME.bg }}>
            <PermitRuntime schema={GUIDE_SCHEMA} values={{}} onChange={() => {}} readOnly />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {GUIDE_ITEMS.map(([term, desc]) => (
              <div key={term} style={{ display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
                <span style={{ fontSize: 11.5, fontWeight: 800, color: THEME.tealDeep, minWidth: 150 }}>{t(term)}</span>
                <span style={{ fontSize: 11.5, color: THEME.text2, lineHeight: 1.9, flex: 1, minWidth: 200 }}>{t(desc)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {preview && (
        <div style={{ ...styles.cardWide, marginBottom: 12 }}>
          <b style={{ fontSize: 12, color: THEME.heading }}>{t("pmPreview")}</b>
          <div style={{ marginTop: 8 }}>
            <PermitRuntime schema={schema} values={previewValues} onChange={(id, val) => setPreviewValues((v) => ({ ...v, [id]: val }))} />
          </div>
        </div>
      )}

      {schema.sections.map((section, si) => (
        <SectionEditor
          key={section.id || si} si={si} section={section} total={schema.sections.length}
          t={t} dir={dir}
          moveSection={moveSection} removeSection={removeSection} setSectionTitle={setSectionTitle} toggleSectionLock={toggleSectionLock}
          addRow={addRow} removeRow={removeRow} moveRow={moveRow}
          addCell={addCell} removeCell={removeCell} moveCell={moveCell} setCellSpan={setCellSpan} setCellLabel={setCellLabel}
          setFieldPatch={setFieldPatch} setFieldConfigPatch={setFieldConfigPatch}
        />
      ))}

      <button type="button" onClick={addSection} style={{ ...ghostBtn, marginBottom: 20 }}><Plus size={13} /> {t("pmAddSection")}</button>
    </div>
  );
}

function SectionEditor({ si, section, total, t, dir, moveSection, removeSection, setSectionTitle, toggleSectionLock, addRow, ...rowProps }) {
  const locked = !!section.locked;
  return (
    <div style={{ ...styles.cardWide, marginBottom: 12, opacity: locked ? 0.85 : 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <input style={{ ...styles.input, flex: 1, minWidth: 160, fontWeight: 700 }} value={section.title || ""} disabled={locked} dir={dir}
          placeholder={t("pmSectionTitle")} onChange={(e) => setSectionTitle(si, e.target.value)} />
        <button type="button" onClick={() => toggleSectionLock(si)} title={locked ? t("pmUnlockSection") : t("pmLockSection")}
          style={{ ...iconBtn, color: locked ? THEME.warn : THEME.text3 }}>{locked ? <Lock size={13} /> : <Unlock size={13} />}</button>
        <button type="button" onClick={() => moveSection(si, -1)} disabled={si === 0} title={t("pmMoveUp")} style={iconBtn}><ArrowUp size={13} /></button>
        <button type="button" onClick={() => moveSection(si, 1)} disabled={si === total - 1} title={t("pmMoveDown")} style={iconBtn}><ArrowDown size={13} /></button>
        {!locked && <button type="button" onClick={() => removeSection(si)} title={t("pmRemoveSection")} style={{ ...iconBtn, color: THEME.danger }}><Trash2 size={13} /></button>}
      </div>

      {(section.rows || []).map((row, ri) => (
        <RowEditor key={row.id || ri} si={si} ri={ri} row={row} total={sumSpans(row)} rowCount={section.rows.length}
          locked={locked} t={t} dir={dir} {...rowProps} />
      ))}
      {!locked && <button type="button" onClick={() => addRow(si)} style={ghostBtn}><Plus size={12} /> {t("pmAddRow")}</button>}
    </div>
  );
}

function RowEditor({ si, ri, row, total, rowCount, locked, t, dir, removeRow, moveRow, addCell, removeCell, moveCell, setCellSpan, setCellLabel, setFieldPatch, setFieldConfigPatch }) {
  return (
    <div style={{ border: `1px dashed ${THEME.borderSoft}`, borderRadius: 8, padding: 8, marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 10, color: THEME.text3, fontWeight: 700 }}>{t("pmRow")} {ri + 1}</span>
        {!locked && (
          <div style={{ display: "flex", gap: 4 }}>
            <button type="button" onClick={() => moveRow(si, ri, -1)} disabled={ri === 0} title={t("pmMoveUp")} style={iconBtnSm}><ArrowUp size={12} /></button>
            <button type="button" onClick={() => moveRow(si, ri, 1)} disabled={ri === rowCount - 1} title={t("pmMoveDown")} style={iconBtnSm}><ArrowDown size={12} /></button>
            <button type="button" onClick={() => removeRow(si, ri)} title={t("pmRemoveRow")} style={{ ...iconBtnSm, color: THEME.danger }}><Trash2 size={12} /></button>
          </div>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(12, minmax(0, 1fr))", gap: 6 }}>
        {(row.cells || []).map((c, ci) => (
          <div key={ci} style={{ gridColumn: `span ${Math.min(12, Math.max(1, c.span || 12))}`, minWidth: 0, border: `1px solid ${THEME.border}`, borderRadius: 7, padding: 7, background: THEME.surface2 }}>
            {!locked && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5, gap: 4 }}>
                <input type="number" min={1} max={12} value={c.span || 12} title={t("pmCellSpan")}
                  style={{ width: 42, fontSize: 10.5, padding: "3px 4px", borderRadius: 5, border: `1px solid ${THEME.border}`, background: THEME.surface, color: THEME.text, fontFamily: THEME.font }}
                  onChange={(e) => setCellSpan(si, ri, ci, Number(e.target.value))} />
                <div style={{ display: "flex", gap: 3 }}>
                  <button type="button" onClick={() => moveCell(si, ri, ci, -1)} disabled={ci === 0} title={t("pmMoveUp")} style={iconBtnSm}><ArrowUp size={10} /></button>
                  <button type="button" onClick={() => moveCell(si, ri, ci, 1)} disabled={ci === row.cells.length - 1} title={t("pmMoveDown")} style={iconBtnSm}><ArrowDown size={10} /></button>
                  <button type="button" onClick={() => removeCell(si, ri, ci)} title={t("pmRemoveCell")} style={{ ...iconBtnSm, color: THEME.danger }}><Trash2 size={10} /></button>
                </div>
              </div>
            )}
            {c.kind === "field" && c.field
              ? <FieldEditor field={c.field} locked={locked} t={t} dir={dir}
                  onPatch={(p) => setFieldPatch(si, ri, ci, p)} onConfigPatch={(p) => setFieldConfigPatch(si, ri, ci, p)} />
              : <input style={{ ...styles.input, padding: "6px 9px", fontSize: 12 }} placeholder={t("pmLabelText")} value={c.label || ""} disabled={locked} dir={dir}
                  onChange={(e) => setCellLabel(si, ri, ci, e.target.value)} />}
          </div>
        ))}
      </div>
      {!locked && (
        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
          <button type="button" onClick={() => addCell(si, ri, "field")} style={ghostBtn}><Plus size={11} /> {t("pmAddField")}</button>
          <button type="button" onClick={() => addCell(si, ri, "label")} style={ghostBtn}><Plus size={11} /> {t("pmAddLabel")}</button>
        </div>
      )}
      {total !== 12 && <div style={{ fontSize: 9.5, color: THEME.warn, marginTop: 4 }}>{t("pmSpanWarning", { sum: total })}</div>}
    </div>
  );
}

function FieldEditor({ field, locked, onPatch, onConfigPatch, t, dir }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <input style={{ ...styles.input, padding: "7px 10px", fontSize: 12.5 }} placeholder={t("pmFieldLabel")} value={field.label || ""} disabled={locked} dir={dir}
        onChange={(e) => onPatch({ label: e.target.value })} />
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <select style={{ ...styles.input, padding: "6px 8px", fontSize: 11.5, width: "auto" }} value={field.type} disabled={locked}
          onChange={(e) => onPatch({ type: e.target.value, config: defaultConfigFor(e.target.value) })}>
          {FIELD_TYPES.map((ty) => <option key={ty} value={ty}>{t("pmFieldType_" + ty)}</option>)}
        </select>
        {isInput(field.type) && (
          <label style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: THEME.text2 }}>
            <input type="checkbox" checked={!!field.required} disabled={locked} onChange={(e) => onPatch({ required: e.target.checked })} /> {t("pmFieldRequired")}
          </label>
        )}
        {(field.type === "text" || field.type === "long_text") && (
          <select style={{ ...styles.input, padding: "6px 8px", fontSize: 11.5, width: "auto" }} value={field.bindTo || ""} disabled={locked}
            onChange={(e) => onPatch({ bindTo: e.target.value || undefined })}>
            <option value="">{t("pmBindNone")}</option>
            {BIND_TARGETS.map((b) => <option key={b} value={b}>{t("pmBind_" + b)}</option>)}
          </select>
        )}
      </div>
      {(field.type === "select" || field.type === "radio" || field.type === "checkgroup") &&
        <OptionsEditor field={field} locked={locked} onChange={onConfigPatch} t={t} dir={dir} />}
      {field.type === "table" && <ColumnsEditor field={field} locked={locked} onChange={onConfigPatch} t={t} dir={dir} />}
      {field.type === "terms" && (
        <textarea style={{ ...styles.input, minHeight: 70, fontSize: 12, resize: "vertical" }} placeholder={t("pmTermsText")} value={field.config?.text || ""} disabled={locked} dir={dir}
          onChange={(e) => onConfigPatch({ text: e.target.value })} />
      )}
      <div style={{ fontSize: 9.5, fontFamily: "monospace", color: THEME.text3 }}>{field.id}</div>
    </div>
  );
}

function OptionsEditor({ field, locked, onChange, t, dir }) {
  const opts = field.config?.options || [];
  const setOpts = (next) => onChange({ options: next });
  return (
    <div>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: THEME.text3, marginBottom: 4 }}>{t("pmOptions")}</div>
      {opts.map((o, i) => (
        <div key={i} style={{ display: "flex", gap: 6, marginBottom: 4 }}>
          <input style={{ ...styles.input, padding: "6px 9px", fontSize: 12 }} value={o} disabled={locked} dir={dir}
            onChange={(e) => setOpts(opts.map((x, j) => (j === i ? e.target.value : x)))} />
          {!locked && <button type="button" onClick={() => setOpts(opts.filter((_, j) => j !== i))} style={iconBtnSm}><Trash2 size={12} /></button>}
        </div>
      ))}
      {!locked && <button type="button" onClick={() => setOpts([...opts, ""])} style={ghostBtn}><Plus size={11} /> {t("pmAddOption")}</button>}
    </div>
  );
}

function ColumnsEditor({ field, locked, onChange, t, dir }) {
  const cols = field.config?.columns || [];
  const setCols = (next) => onChange({ columns: next });
  return (
    <div>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: THEME.text3, marginBottom: 4 }}>{t("pmColumns")}</div>
      {cols.map((c, i) => (
        <div key={c.id || i} style={{ display: "flex", gap: 6, marginBottom: 4 }}>
          <input style={{ ...styles.input, padding: "6px 9px", fontSize: 12 }} placeholder={t("pmColumnLabel")} value={c.label || ""} disabled={locked} dir={dir}
            onChange={(e) => setCols(cols.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
          {!locked && <button type="button" onClick={() => setCols(cols.filter((_, j) => j !== i))} style={iconBtnSm}><Trash2 size={12} /></button>}
        </div>
      ))}
      {!locked && <button type="button" onClick={() => setCols([...cols, { id: genColId(), label: "" }])} style={ghostBtn}><Plus size={11} /> {t("pmAddColumn")}</button>}
    </div>
  );
}
