import { toJalaliSafe, toJalaliDateTime } from "../personnel/jalaliDate.jsx";
import { exportHtmlReportNativeAware } from "../offline/nativeFile.js";
import { translate, getCurrentLang } from "../i18n/translations.js";
import { STATUS_META } from "./permitModel.js";

// همان الگوی personnelExport.js/bowtieExport.js: یک HTML مستقل و کامل
// می‌سازیم (نه چاپِ خامِ صفحه‌ی وب با دکمه/نوار کناری) تا مدرکِ چاپی یک
// برگه‌ی رسمی با سربرگِ شرکت باشد، نه اسکرین‌شاتِ فرم.

function escapeHtml(s) {
  return String(s || "")
    .split("&").join("&amp;")
    .split("<").join("&lt;")
    .split(">").join("&gt;")
    .split('"').join("&quot;")
    .split("'").join("&#39;");
}

function fieldValueHtml(field, value, lang, t, riskOptions) {
  const empty = '<span class="pp-empty">—</span>';
  if (value == null || value === "") {
    if (field.type === "checkgroup" && Array.isArray(value) && value.length) { /* fallthrough */ } else return empty;
  }
  if (field.bindTo === "riskRef") {
    const hit = (riskOptions || []).find((o) => o.id === value);
    return hit ? escapeHtml(hit.title) : escapeHtml(String(value));
  }
  switch (field.type) {
    case "date":
      return value ? escapeHtml(toJalaliSafe(value)) : empty;
    case "daterange": {
      const d = value && typeof value === "object" ? value : {};
      if (!d.from && !d.to) return empty;
      return `${d.from ? escapeHtml(toJalaliSafe(d.from)) : "—"} ${lang === "en" ? "to" : "تا"} ${d.to ? escapeHtml(toJalaliSafe(d.to)) : "—"}`;
    }
    case "yes_no":
      return value === "yes" ? escapeHtml(t("commonYes")) : value === "no" ? escapeHtml(t("commonNo")) : empty;
    case "checkgroup":
      return Array.isArray(value) && value.length ? value.map(escapeHtml).join("، ") : empty;
    case "signature": {
      const sig = value && typeof value === "object" ? value : null;
      return sig?.name ? `${escapeHtml(sig.name)}${sig.at ? ` <span class="pp-mono">(${escapeHtml(toJalaliDateTime(sig.at))})</span>` : ""}` : `<span class="pp-signline"></span>`;
    }
    case "table": {
      const cols = field.config?.columns || [];
      const rows = Array.isArray(value) ? value : [];
      if (!rows.length) return empty;
      const head = cols.map((c) => `<th>${escapeHtml(c.label)}</th>`).join("");
      const body = rows.map((r) => `<tr>${cols.map((c) => `<td>${escapeHtml(r[c.id] || "")}</td>`).join("")}</tr>`).join("");
      return `<table class="pp-tbl"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
    }
    default:
      return escapeHtml(String(value));
  }
}

function renderSchema(schema, formData, lang, t, riskOptions) {
  return (schema?.sections || []).map((s) => {
    const rows = (s.rows || []).map((r) => {
      const cells = (r.cells || []).map((c) => {
        if (c.kind !== "field" || !c.field) return `<div class="pp-cell" style="grid-column:span ${Math.min(12, Math.max(1, c.span || 12))}"><span class="pp-lbl">${escapeHtml(c.label || "")}</span></div>`;
        const f = c.field;
        if (f.type === "terms") return `<div class="pp-cell pp-terms" style="grid-column:span 12">${escapeHtml(f.config?.text || "").replace(/\n/g, "<br/>")}</div>`;
        if (f.type === "approval") return "";
        return `<div class="pp-cell" style="grid-column:span ${Math.min(12, Math.max(1, c.span || 12))}">
          <div class="pp-flbl">${escapeHtml(f.label || f.id)}</div>
          <div class="pp-fval">${fieldValueHtml(f, formData?.[f.id], lang, t, riskOptions)}</div>
        </div>`;
      }).join("");
      return `<div class="pp-row">${cells}</div>`;
    }).join("");
    return `<div class="pp-sec"><div class="pp-sec-h">${escapeHtml(s.title || "")}</div>${rows}</div>`;
  }).join("");
}

/**
 * صادر و چاپِ یک برگه‌ی رسمیِ مجوز کار — برندینگِ قالب (لوگو/سربرگ/کد فرم)
 * را (اگر تنظیم شده باشد) بالای برگه می‌گذارد؛ در غیرِ این‌صورت فقط عنوانِ
 * ساده. جایگزینِ window.print() خامِ روی خودِ صفحه‌ی وب.
 */
export async function printPermit(permit, template, riskOptions) {
  const lang = getCurrentLang();
  const isEn = lang === "en";
  const t = (k, p) => translate(lang, k, p);
  const branding = template?.branding && typeof template.branding === "object" ? template.branding : {};
  const sm = STATUS_META[permit.status] || {};
  const title = `${permit.permitNo || t("pmNewPermit")}${permit.title ? " — " + permit.title : ""}`;

  const stdRows = [
    [t("pmTitle"), permit.title],
    [t("pmApplicant"), permit.applicantName],
    [t("pmPerformer"), permit.performerName],
    [t("pmIssuer"), permit.issuerName],
    [t("pmStart"), permit.startAt ? toJalaliDateTime(permit.startAt) : ""],
    [t("pmPlannedEnd"), permit.endAt ? toJalaliDateTime(permit.endAt) : ""],
    [t("pmValidUntil"), permit.validUntil ? toJalaliSafe(permit.validUntil) : ""],
    [t("commonStatus"), t(sm.key || permit.status)],
  ].filter((r) => r[1]);

  const html = `<!doctype html><html lang="${lang}" dir="${isEn ? "ltr" : "rtl"}"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Tahoma, Arial, sans-serif; direction: ${isEn ? "ltr" : "rtl"}; padding: 18px; color: #1a2a33; }
    .pp-head { display: flex; align-items: center; gap: 12px; border-bottom: 2px solid #0f2a3a; padding-bottom: 10px; margin-bottom: 14px; }
    .pp-head img { max-height: 56px; max-width: 160px; object-fit: contain; }
    .pp-head-txt { flex: 1; }
    .pp-head-txt h2 { margin: 0; font-size: 16px; }
    .pp-head-txt p { margin: 2px 0 0; font-size: 11px; color: #555; }
    .pp-code { font-size: 10.5px; color: #555; font-family: ui-monospace, Menlo, Consolas, monospace; }
    .pp-std { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px 16px; font-size: 11.5px; margin-bottom: 14px; }
    .pp-std b { color: #555; font-weight: 700; margin-inline-end: 4px; }
    .pp-sec { border: 1px solid #ccc; border-radius: 6px; overflow: hidden; margin-bottom: 10px; page-break-inside: avoid; }
    .pp-sec-h { background: #0f2a3a; color: #fff; font-size: 11.5px; font-weight: 800; padding: 6px 10px; }
    .pp-row { display: grid; grid-template-columns: repeat(12, 1fr); gap: 1px; background: #ddd; }
    .pp-cell { background: #fff; padding: 6px 9px; min-width: 0; }
    .pp-lbl { font-size: 10.5px; font-weight: 700; color: #777; }
    .pp-flbl { font-size: 10px; font-weight: 700; color: #666; margin-bottom: 2px; }
    .pp-fval { font-size: 11.5px; }
    .pp-empty { color: #aaa; }
    .pp-terms { font-size: 10.5px; color: #444; line-height: 1.9; white-space: pre-wrap; }
    .pp-mono { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 9.5px; color: #777; }
    .pp-signline { display: inline-block; width: 120px; border-bottom: 1px solid #999; }
    .pp-tbl { width: 100%; border-collapse: collapse; font-size: 10.5px; }
    .pp-tbl th, .pp-tbl td { border: 1px solid #ccc; padding: 4px 6px; text-align: ${isEn ? "left" : "right"}; }
    .pp-tbl th { background: #f1f5f9; }
    @media print { @page { margin: 12mm; } }
  </style></head>
  <body>
    <div class="pp-head">
      ${branding.logoUrl ? `<img src="${escapeHtml(branding.logoUrl)}" alt="logo" />` : ""}
      <div class="pp-head-txt">
        <h2>${escapeHtml(branding.header || template?.name || t("modulePermitToWork"))}</h2>
        ${template?.name && branding.header ? `<p>${escapeHtml(template.name)}</p>` : ""}
      </div>
      ${branding.formCode ? `<div class="pp-code">${escapeHtml(branding.formCode)}</div>` : ""}
    </div>
    <div class="pp-std">${stdRows.map(([k, v]) => `<div><b>${escapeHtml(k)}:</b>${escapeHtml(v)}</div>`).join("")}</div>
    ${renderSchema(template?.schema, permit.formData, lang, t, riskOptions)}
  </body></html>`;

  if (await exportHtmlReportNativeAware(html, title)) return;

  const win = window.open("", "_blank");
  if (!win) { alert(t("errPopupBlocked")); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
}
