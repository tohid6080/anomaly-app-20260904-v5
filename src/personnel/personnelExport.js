import * as XLSX from "xlsx";
import { DOC_TYPES, personnelStatusMeta, docStatusMeta, loadPersonnelDocuments } from "./personnelApi.js";
import { isoToJalaliDisplay } from "./jalaliDate.jsx";
import { exportWorkbookNativeAware, exportHtmlReportNativeAware } from "../offline/nativeFile.js";
import { translate, getCurrentLang } from "../i18n/translations.js";

/**
 * Export helpers for the Personnel module.
 *
 * PDF: genuinely clickable document links work here — each link's href is
 * simply the document's base64 data URL, embedded as a normal HTML <a>,
 * rendered through the browser's print engine (same technique already used
 * for Anomaly Report / BowTie exports elsewhere in the app). Clicking it in
 * the resulting PDF opens the document directly.
 *
 * Excel: base64 data URLs for real photos/PDFs are typically tens of
 * thousands of characters long, and Excel's hyperlink target field has a
 * hard length limit (~255–2083 chars depending on version) — far short of
 * that. A "clickable link" to an embedded document is not reliably
 * achievable in .xlsx, so instead we list each document's name + review
 * status as readable text; opening the actual file still happens inside
 * the app (Personnel → detail → document preview).
 */

function escapeHtml(s) {
  return String(s || "")
    .split("&").join("&amp;")
    .split("<").join("&lt;")
    .split(">").join("&gt;")
    .split('"').join("&quot;")
    .split("'").join("&#39;");
}

async function fetchAllDocuments(personnelList) {
  const map = {};
  await Promise.all(
    personnelList.map(async (p) => {
      map[p.id] = await loadPersonnelDocuments(p.id);
    })
  );
  return map;
}

function docTypeLabel(docType) {
  const dt = DOC_TYPES.find((t) => t.value === docType);
  return dt ? translate(getCurrentLang(), dt.labelKey) : docType;
}

function docsSummaryText(docs) {
  if (!docs || docs.length === 0) return translate(getCurrentLang(), "noDocsUploaded");
  return docs.map((d) => `${docTypeLabel(d.docType)} (${translate(getCurrentLang(), docStatusMeta(d.status).labelKey)})`).join(" | ");
}

export async function exportPersonnelPdf(personnelList, title) {
  const documentsMap = await fetchAllDocuments(personnelList);

  const lang = getCurrentLang();
  const isEn = lang !== "fa";
  const headers = [
    translate(lang, "exportColRow"), translate(lang, "peColFullName"), translate(lang, "peColNationalCode"), translate(lang, "peColContractor"),
    translate(lang, "peColJobTitle"), translate(lang, "peColContact"), translate(lang, "peColStartDate"), translate(lang, "commonStatus"),
    translate(lang, "peColQualification"), translate(lang, "peColHealthExpiry"), translate(lang, "peColDocuments"),
  ];

  const rows = personnelList
    .map((p, idx) => {
      const sm = { ...personnelStatusMeta(p.status), label: translate(lang, personnelStatusMeta(p.status).labelKey) };
      const docs = documentsMap[p.id] || [];
      const docLinks =
        docs
          .map((d) => `<a href="${d.fileData}" target="_blank" rel="noopener">${escapeHtml(docTypeLabel(d.docType))}</a>`)
          .join("<br/>") || "—";
      return `<tr>
        <td>${idx + 1}</td>
        <td>${escapeHtml(p.fullName)}</td>
        <td>${escapeHtml(p.nationalCode)}</td>
        <td>${escapeHtml(p.contractorName)}</td>
        <td>${escapeHtml(p.jobTitle)}</td>
        <td>${escapeHtml(p.phone)}</td>
        <td>${isoToJalaliDisplay(p.startDate)}</td>
        <td>${escapeHtml(sm.label)}</td>
        <td>${p.qualificationRequired ? escapeHtml(translate(lang, docStatusMeta(p.qualificationStatus || "pending").labelKey)) : "—"}</td>
        <td>${p.occHealthExpiry ? isoToJalaliDisplay(p.occHealthExpiry) : "—"}</td>
        <td>${docLinks}</td>
      </tr>`;
    })
    .join("");

  const html = `<!doctype html><html lang="${lang}" dir="${isEn ? "ltr" : "rtl"}"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Tahoma, Arial, sans-serif; direction: ${isEn ? "ltr" : "rtl"}; padding: 16px; }
    h2 { text-align: center; margin-bottom: 4px; }
    p.meta { text-align: center; color: #666; font-size: 12px; margin-top: 0; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 14px; }
    th, td { border: 1px solid #ccc; padding: 5px; text-align: ${isEn ? "left" : "right"}; vertical-align: top; }
    th { background: #f1f5f9; }
    a { color: #0d8f8a; text-decoration: underline; }
    @media print { @page { size: landscape; margin: 10mm; } }
  </style></head>
  <body>
    <h2>${escapeHtml(title)}</h2>
    <p class="meta">${translate(lang, "peMetaLine", { count: personnelList.length })}</p>
    <table><thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table>
  </body></html>`;

  if (await exportHtmlReportNativeAware(html, title)) return;

  const win = window.open("", "_blank");
  if (!win) {
    alert(translate(lang, "errPopupBlocked"));
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
}

export async function exportPersonnelExcel(personnelList, title) {
  const documentsMap = await fetchAllDocuments(personnelList);
  const lang = getCurrentLang();

  const rows = personnelList.map((p, idx) => ({
    [translate(lang, "exportColRow")]: idx + 1,
    [translate(lang, "peColFullName")]: p.fullName,
    [translate(lang, "peColNationalCode")]: p.nationalCode,
    [translate(lang, "peColContractor")]: p.contractorName,
    [translate(lang, "peColJobTitle")]: p.jobTitle,
    [translate(lang, "peColContactNumber")]: p.phone,
    [translate(lang, "peColStartDateFull")]: isoToJalaliDisplay(p.startDate),
    [translate(lang, "commonStatus")]: translate(lang, personnelStatusMeta(p.status).labelKey),
    [translate(lang, "peColQualificationStatus")]: p.qualificationRequired ? translate(lang, docStatusMeta(p.qualificationStatus || "pending").labelKey) : "—",
    [translate(lang, "peColHealthVisitDate")]: p.occHealthDate ? isoToJalaliDisplay(p.occHealthDate) : "—",
    [translate(lang, "peColHealthExpiry")]: p.occHealthExpiry ? isoToJalaliDisplay(p.occHealthExpiry) : "—",
    [translate(lang, "peColUploadedDocs")]: docsSummaryText(documentsMap[p.id]),
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [{ wch: 5 }, { wch: 18 }, { wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 13 }, { wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 45 }];
  XLSX.utils.book_append_sheet(wb, ws, "Personnel");
  await exportWorkbookNativeAware(XLSX, wb, `${title}.xlsx`);
}
