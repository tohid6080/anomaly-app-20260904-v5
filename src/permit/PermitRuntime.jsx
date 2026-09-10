import React from "react";
import { Plus, Trash2, PenLine } from "lucide-react";
import { THEME, styles } from "../shared.js";
import { toJalaliDateTime } from "../personnel/jalaliDate.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";

/**
 * Renderer گرید/جدولیِ فرمِ مجوز کار — Section → Row(۱۲ ستون) → Cell(span) → Field.
 * props: schema, values, onChange(fieldId, value), errors, readOnly
 */
export default function PermitRuntime({ schema, values, onChange, errors, readOnly }) {
  const { t, dir } = useLanguage();
  const v = values || {};
  const err = errors || {};
  const set = (id, val) => { if (!readOnly && onChange) onChange(id, val); };

  return (
    <div style={{ direction: dir }}>
      <style>{CSS}</style>
      {(schema?.sections || []).map((s) => (
        <div key={s.id} className="pr-sec">
          <div className="pr-sec-h">{s.title || "—"}{s.locked && <span className="pr-lock">🔒</span>}</div>
          {(s.rows || []).map((r) => (
            <div key={r.id} className="pr-row">
              {(r.cells || []).map((c, ci) => (
                <div key={ci} className="pr-cell" style={{ gridColumn: `span ${Math.min(12, Math.max(1, c.span || 12))}` }}>
                  {c.kind === "field" && c.field
                    ? <Field f={c.field} value={v[c.field.id]} onChange={(val) => set(c.field.id, val)} error={err[c.field.id]} readOnly={readOnly} dir={dir} t={t} />
                    : <span className="pr-lbl">{c.label || ""}</span>}
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function Field({ f, value, onChange, error, readOnly, dir, t }) {
  const label = (
    <div className="pr-flbl">{f.label || f.id}{f.required && <span style={{ color: THEME.danger }}> *</span>}</div>
  );
  const box = (inner) => (
    <div className={"pr-fbox" + (error ? " pr-err" : "")}>{label}{inner}{error && <div className="pr-emsg">{error}</div>}</div>
  );

  if (f.type === "terms") {
    return <div className="pr-terms">{f.config?.text || ""}</div>;
  }
  if (f.type === "approval") {
    return <div className="pr-appr">{label}<div className="pr-appr-hint">{t("pmApprovalHint")}</div></div>;
  }
  if (f.type === "signature") {
    const sig = value && typeof value === "object" ? value : null;
    return box(
      readOnly || sig ? (
        <div className="pr-sig">{sig ? <><b>{sig.name || "—"}</b><span className="pr-mono">{sig.at ? toJalaliDateTime(sig.at) : ""}</span></> : <span style={{ color: THEME.text3 }}>—</span>}</div>
      ) : (
        <div style={{ display: "flex", gap: 6 }}>
          <input style={styles.input} placeholder={t("pmSigName")} value={sig?.name || ""} onChange={(e) => onChange({ name: e.target.value, at: sig?.at || "" })} dir={dir} />
          <button type="button" className="pr-btn" onClick={() => onChange({ name: sig?.name || "", at: new Date().toISOString() })}><PenLine size={13} /> {t("pmSign")}</button>
        </div>
      ),
    );
  }
  if (f.type === "text" || f.type === "person") {
    return box(<input style={styles.input} value={value || ""} disabled={readOnly} dir={dir} onChange={(e) => onChange(e.target.value)} />);
  }
  if (f.type === "long_text") {
    return box(<textarea style={{ ...styles.input, minHeight: 60, resize: "vertical" }} value={value || ""} disabled={readOnly} dir={dir} onChange={(e) => onChange(e.target.value)} />);
  }
  if (f.type === "number") {
    return box(<input type="number" style={styles.input} value={value ?? ""} disabled={readOnly} dir="ltr" onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} />);
  }
  if (f.type === "date") {
    return box(<input type="date" style={styles.input} value={value || ""} disabled={readOnly} dir="ltr" onChange={(e) => onChange(e.target.value)} />);
  }
  if (f.type === "daterange") {
    const d = value && typeof value === "object" ? value : { from: "", to: "" };
    return box(
      <div style={{ display: "flex", gap: 6 }}>
        <input type="date" style={styles.input} value={d.from || ""} disabled={readOnly} dir="ltr" onChange={(e) => onChange({ ...d, from: e.target.value })} />
        <input type="date" style={styles.input} value={d.to || ""} disabled={readOnly} dir="ltr" onChange={(e) => onChange({ ...d, to: e.target.value })} />
      </div>,
    );
  }
  if (f.type === "select" || f.type === "radio") {
    const opts = f.config?.options || [];
    if (f.type === "radio") {
      return box(
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {opts.map((o) => (
            <label key={o} className="pr-ck"><input type="radio" name={f.id} checked={value === o} disabled={readOnly} onChange={() => onChange(o)} /> {o}</label>
          ))}
        </div>,
      );
    }
    return box(
      <select style={styles.input} value={value || ""} disabled={readOnly} dir={dir} onChange={(e) => onChange(e.target.value)}>
        <option value="">{t("pmSelect")}</option>
        {opts.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>,
    );
  }
  if (f.type === "yes_no") {
    return box(
      <div style={{ display: "flex", gap: 8 }}>
        {[["yes", t("commonYes")], ["no", t("commonNo")]].map(([k, lbl]) => (
          <button key={k} type="button" disabled={readOnly} onClick={() => onChange(k)}
            className={"pr-pill" + (value === k ? " on" : "")}>{lbl}</button>
        ))}
      </div>,
    );
  }
  if (f.type === "checkgroup") {
    const arr = Array.isArray(value) ? value : [];
    const toggle = (o) => onChange(arr.includes(o) ? arr.filter((x) => x !== o) : [...arr, o]);
    return box(
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {(f.config?.options || []).map((o) => (
          <label key={o} className="pr-ck"><input type="checkbox" checked={arr.includes(o)} disabled={readOnly} onChange={() => toggle(o)} /> {o}</label>
        ))}
      </div>,
    );
  }
  if (f.type === "table") {
    const cols = f.config?.columns || [];
    const rows = Array.isArray(value) ? value : [];
    const setCell = (ri, cid, val) => onChange(rows.map((row, i) => (i === ri ? { ...row, [cid]: val } : row)));
    const addRow = () => onChange([...rows, {}]);
    const delRow = (ri) => onChange(rows.filter((_, i) => i !== ri));
    return box(
      <div style={{ overflowX: "auto" }}>
        <table className="pr-tbl">
          <thead><tr>{cols.map((c) => <th key={c.id}>{c.label}</th>)}{!readOnly && <th />}</tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={cols.length + 1} style={{ color: THEME.text3, textAlign: "center", fontSize: 11 }}>—</td></tr>}
            {rows.map((row, ri) => (
              <tr key={ri}>
                {cols.map((c) => (
                  <td key={c.id}><input value={row[c.id] || ""} disabled={readOnly} dir={dir} onChange={(e) => setCell(ri, c.id, e.target.value)} /></td>
                ))}
                {!readOnly && <td><button type="button" onClick={() => delRow(ri)} style={{ border: "none", background: "transparent", color: THEME.danger, cursor: "pointer" }}><Trash2 size={12} /></button></td>}
              </tr>
            ))}
          </tbody>
        </table>
        {!readOnly && <button type="button" className="pr-btn" style={{ marginTop: 6 }} onClick={addRow}><Plus size={12} /> {t("pmAddRow")}</button>}
      </div>,
    );
  }
  return box(<input style={styles.input} value={value || ""} disabled={readOnly} onChange={(e) => onChange(e.target.value)} />);
}

const CSS = `
.pr-sec{border:1px solid var(--ihms-border,#20404f);border-radius:10px;overflow:hidden;margin-bottom:12px}
.pr-sec-h{background:var(--ihms-navy,#0f2a3a);color:#e4eef2;font-size:11.5px;font-weight:800;padding:7px 12px}
.pr-lock{margin-inline-start:6px}
.pr-row{display:grid;grid-template-columns:repeat(12,1fr);gap:1px;background:var(--ihms-border-soft,#1a3543)}
.pr-cell{background:var(--ihms-surface,#0f2a3a);padding:8px 10px;min-width:0}
@media(max-width:640px){.pr-row{grid-template-columns:repeat(2,1fr)}.pr-cell{grid-column:span 2 !important}}
.pr-lbl{font-size:11px;font-weight:700;color:var(--ihms-text3,#6a8492)}
.pr-flbl{font-size:10.5px;font-weight:700;color:var(--ihms-text2,#9fb3bd);margin-bottom:4px}
.pr-fbox.pr-err .pr-flbl{color:var(--ihms-danger,#f87171)}
.pr-emsg{font-size:10px;color:var(--ihms-danger,#f87171);margin-top:3px}
.pr-terms{font-size:11px;color:var(--ihms-text3,#6a8492);white-space:pre-wrap;line-height:1.9}
.pr-appr-hint{font-size:10px;color:var(--ihms-text3,#6a8492)}
.pr-sig{font-size:12px;color:var(--ihms-text,#e9eff2)}
.pr-sig b{margin-inline-end:8px}
.pr-mono{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:10px;color:var(--ihms-text3,#6a8492)}
.pr-ck{display:inline-flex;align-items:center;gap:4px;font-size:11.5px;color:var(--ihms-text2,#9fb3bd);cursor:pointer}
.pr-btn{border:1px solid var(--ihms-border,#20404f);background:transparent;color:var(--ihms-text2,#9fb3bd);border-radius:7px;
  padding:5px 10px;font-family:inherit;font-size:11px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:5px}
.pr-pill{border:1.5px solid var(--ihms-border,#20404f);background:transparent;color:var(--ihms-text2,#9fb3bd);border-radius:8px;
  padding:6px 14px;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer}
.pr-pill.on{background:var(--ihms-teal,#14b8a6);border-color:var(--ihms-teal,#14b8a6);color:#fff}
.pr-tbl{width:100%;border-collapse:collapse;font-size:11px}
.pr-tbl th{background:var(--ihms-surface-2,#12313f);color:var(--ihms-text3,#6a8492);font-weight:800;padding:5px 7px;border:1px solid var(--ihms-border,#20404f);font-size:9.5px}
.pr-tbl td{border:1px solid var(--ihms-border-soft,#1a3543);padding:2px}
.pr-tbl td input{width:100%;border:none;background:transparent;color:var(--ihms-text,#e9eff2);padding:4px 6px;font-family:inherit;font-size:11px}
`;
