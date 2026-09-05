import React, { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import { Database, Plus, Search, Upload, Download, GitMerge, Trash2 } from "lucide-react";
import { styles, THEME } from "../shared.js";
import {
  loadAllKnowledgeRecords, createKnowledgeRecord, updateKnowledgeRecord, setKnowledgeRecordActive,
  mergeKnowledgeRecords, parseKnowledgeBaseSheet, bulkImportKnowledgeRecords, knowledgeRecordsToSheetRows,
  deleteKnowledgeRecord, bulkDeleteKnowledgeRecords,
} from "./riskKnowledgeApi.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";

const EMPTY_FORM = { activity: "", hazard: "", environmentalAspect: "", cause: "", consequence: "", existingControls: "", recommendedControls: "" };

export default function RiskKnowledgeManager({ onBack, currentUser }) {
  const { t, dir } = useLanguage();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [mergeSourceId, setMergeSourceId] = useState(null);
  const [importSummary, setImportSummary] = useState(null);
  const [importing, setImporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setRecords(await loadAllKnowledgeRecords(true));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;
    return records.filter((r) =>
      [r.activity, r.hazard, r.environmentalAspect, r.cause, r.consequence, r.existingControls, r.recommendedControls]
        .some((f) => (f || "").toLowerCase().includes(q))
    );
  }, [records, search]);

  const openNew = () => { setForm(EMPTY_FORM); setEditingId(null); setError(""); setShowForm(true); };
  const openEdit = (rec) => {
    setForm({
      activity: rec.activity, hazard: rec.hazard, environmentalAspect: rec.environmentalAspect,
      cause: rec.cause, consequence: rec.consequence, existingControls: rec.existingControls, recommendedControls: rec.recommendedControls,
    });
    setEditingId(rec.id);
    setError("");
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.hazard.trim()) { setError(t("errHazardFieldRequired")); return; }
    setSaving(true);
    setError("");
    const result = editingId ? await updateKnowledgeRecord(editingId, form) : await createKnowledgeRecord(form, currentUser?.name);
    setSaving(false);
    if (result?.__error) { setError(result.message); return; }
    setShowForm(false);
    await load();
  };

  const handleToggleActive = async (rec) => {
    await setKnowledgeRecordActive(rec.id, !rec.approved);
    await load();
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  const toggleSelectAll = () => {
    setSelectedIds((prev) => (prev.length === filtered.length ? [] : filtered.map((r) => r.id)));
  };

  const handleDeleteOne = async (rec) => {
    if (!confirm(t("confirmDeleteRecordFull", { hazard: rec.hazard }))) return;
    const result = await deleteKnowledgeRecord(rec.id);
    if (result?.__error) { alert(result.message); return; }
    setSelectedIds((prev) => prev.filter((id) => id !== rec.id));
    await load();
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(t("confirmBulkDeleteRecords", { count: selectedIds.length }))) return;
    setDeleting(true);
    const result = await bulkDeleteKnowledgeRecords(selectedIds);
    setDeleting(false);
    if (result?.__error) { alert(result.message); return; }
    setSelectedIds([]);
    await load();
  };

  const handleStartMerge = (id) => {
    if (mergeSourceId === id) { setMergeSourceId(null); return; }
    if (!mergeSourceId) { setMergeSourceId(id); return; }
    // دومین کلیک: رکورد دومی که انتخاب شد در رکورد اولی ادغام می‌شود
    handleConfirmMerge(mergeSourceId, id);
  };

  const handleConfirmMerge = async (keepId, mergeId) => {
    const keep = records.find((r) => r.id === keepId);
    const merge = records.find((r) => r.id === mergeId);
    if (!confirm(t("confirmMergeRecords", { merge: merge?.hazard, keep: keep?.hazard }))) { setMergeSourceId(null); return; }
    const result = await mergeKnowledgeRecords(keepId, mergeId);
    setMergeSourceId(null);
    if (result?.__error) { alert(result.message); return; }
    await load();
  };

  const handleImportFile = async (file) => {
    if (!file) return;
    setImporting(true);
    setImportSummary(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      const parsed = parseKnowledgeBaseSheet(rows);
      if (parsed.error) { setImportSummary({ error: parsed.error }); setImporting(false); return; }
      if (parsed.records.length === 0) { setImportSummary({ error: t("errNoValidRecordsInFile") }); setImporting(false); return; }
      const result = await bulkImportKnowledgeRecords(parsed.records, currentUser?.name);
      setImporting(false);
      if (result?.__error) { setImportSummary({ error: result.message }); return; }
      setImportSummary({ imported: result.count, skippedDuplicates: parsed.skippedDuplicates });
      await load();
    } catch (e) {
      setImporting(false);
      setImportSummary({ error: t("errReadingFile", { reason: e?.message || "" }) });
    }
  };

  const handleExport = () => {
    const sheetRows = knowledgeRecordsToSheetRows(records);
    const ws = XLSX.utils.aoa_to_sheet(sheetRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, t("rkExportSheetName"));
    XLSX.writeFile(wb, t("rkExportFileName"));
  };

  if (loading) return <div style={{ padding: 24, textAlign: "center", color: THEME.text3 }}>{t("commonLoading")}</div>;

  if (showForm) {
    return (
      <div style={{ maxWidth: 640, margin: "0 auto", padding: 24, direction: dir }}>
        <div style={styles.backLink} onClick={() => setShowForm(false)}>{t("rkCancel")}</div>
        <h2 style={{ fontSize: 17, color: THEME.navy, fontWeight: 700, marginBottom: 14 }}>{editingId ? t("rkEditRecord") : t("rkNewRecord")}</h2>
        <label style={styles.label}>{t("rkFieldActivity")}</label>
        <input style={styles.input} value={form.activity} onChange={(e) => setForm({ ...form, activity: e.target.value })} dir={dir} />
        <label style={styles.label}>{t("rkFieldHazardRequired")}</label>
        <input style={styles.input} value={form.hazard} onChange={(e) => setForm({ ...form, hazard: e.target.value })} dir={dir} />
        <label style={styles.label}>{t("rkFieldEnvironmentalAspect")}</label>
        <input style={styles.input} value={form.environmentalAspect} onChange={(e) => setForm({ ...form, environmentalAspect: e.target.value })} dir={dir} />
        <label style={styles.label}>{t("rkFieldCause")}</label>
        <textarea style={{ ...styles.input, minHeight: 70, fontFamily: "inherit" }} value={form.cause} onChange={(e) => setForm({ ...form, cause: e.target.value })} dir={dir} />
        <label style={styles.label}>{t("rkFieldConsequence")}</label>
        <textarea style={{ ...styles.input, minHeight: 50, fontFamily: "inherit" }} value={form.consequence} onChange={(e) => setForm({ ...form, consequence: e.target.value })} dir={dir} />
        <label style={styles.label}>{t("rkFieldExistingControls")}</label>
        <textarea style={{ ...styles.input, minHeight: 60, fontFamily: "inherit" }} value={form.existingControls} onChange={(e) => setForm({ ...form, existingControls: e.target.value })} dir={dir} />
        <label style={styles.label}>{t("rkFieldRecommendedControls")}</label>
        <textarea style={{ ...styles.input, minHeight: 60, fontFamily: "inherit" }} value={form.recommendedControls} onChange={(e) => setForm({ ...form, recommendedControls: e.target.value })} dir={dir} />
        {error && <p style={styles.error}>{error}</p>}
        <button type="button" style={styles.button} onClick={handleSave} disabled={saving}>{saving ? t("saSavingEllipsis") : t("commonSave")}</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: 24, direction: dir }}>
      {onBack && <div style={styles.backLink} onClick={onBack}>{t("rkBackToSystemManagement")}</div>}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Database size={20} color={THEME.teal} />
          <h2 style={{ margin: 0, fontSize: 19, color: THEME.navy, fontWeight: 700 }}>{t("rkManagementTitle")}</h2>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" style={{ ...styles.smallButton, display: "flex", alignItems: "center", gap: 6 }} onClick={openNew}>
            <Plus size={13} /> {t("rkNewRecordBtn")}
          </button>
          <label style={{ ...styles.smallButton, background: THEME.navyMid, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
            <Upload size={13} /> {importing ? t("rkImporting") : t("rkImportFromExcel")}
            <input type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={(e) => { handleImportFile(e.target.files?.[0]); e.target.value = ""; }} disabled={importing} />
          </label>
          <button type="button" style={{ ...styles.smallButton, background: THEME.text3, display: "flex", alignItems: "center", gap: 6 }} onClick={handleExport}>
            <Download size={13} /> {t("rkExportExcel")}
          </button>
        </div>
      </div>

      <p style={{ color: THEME.text3, fontSize: 12, marginBottom: 10 }}>
        {t("rkRecordsCountNote", { count: records.length })} <GitMerge size={11} style={{ display: "inline", verticalAlign: "middle" }} />
      </p>

      {importSummary && (
        <div style={{ ...styles.card, width: "auto", marginBottom: 14, background: importSummary.error ? "#fef2f2" : "#f0fdf4" }}>
          {importSummary.error
            ? <p style={{ color: THEME.danger, margin: 0, fontSize: 12.5 }}>{importSummary.error}</p>
            : <p style={{ color: "#166534", margin: 0, fontSize: 12.5 }}>{t("rkImportedCount", { count: importSummary.imported })} {importSummary.skippedDuplicates > 0 ? t("rkDuplicatesSkipped", { count: importSummary.skippedDuplicates }) : ""}</p>}
        </div>
      )}

      <div style={{ position: "relative", marginBottom: 14 }}>
        <Search size={14} color={THEME.text3} style={{ position: "absolute", insetInlineStart: 10, top: 11 }} />
        <input style={{ ...styles.input, paddingInlineStart: 32 }} placeholder={t("rkSearchPlaceholder")} value={search} onChange={(e) => setSearch(e.target.value)} dir={dir} />
      </div>

      {filtered.length === 0 && <p style={{ color: THEME.text3, textAlign: "center", padding: "30px 0" }}>{t("rkNoRecordFound")}</p>}

      {filtered.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, padding: "0 4px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: THEME.text2, cursor: "pointer" }}>
            <input type="checkbox" checked={selectedIds.length === filtered.length && filtered.length > 0} onChange={toggleSelectAll} />
            {t("rkSelectAllCount", { count: filtered.length })}
          </label>
          {selectedIds.length > 0 && (
            <button
              type="button"
              style={{ ...styles.smallButton, background: THEME.danger, display: "flex", alignItems: "center", gap: 6 }}
              onClick={handleBulkDelete}
              disabled={deleting}
            >
              <Trash2 size={12} /> {deleting ? t("rkDeletingEllipsis") : t("rkDeleteSelectedCount", { count: selectedIds.length })}
            </button>
          )}
        </div>
      )}

      {filtered.map((rec) => (
        <div key={rec.id} style={{ ...styles.card, width: "auto", marginBottom: 8, border: mergeSourceId === rec.id ? `2px solid ${THEME.teal}` : (selectedIds.includes(rec.id) ? `1.5px solid ${THEME.danger}` : undefined) }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, flex: 1, minWidth: 200 }}>
              <input
                type="checkbox"
                checked={selectedIds.includes(rec.id)}
                onChange={() => toggleSelect(rec.id)}
                onClick={(e) => e.stopPropagation()}
                style={{ marginTop: 4, flexShrink: 0 }}
              />
              <div style={{ flex: 1, cursor: "pointer" }} onClick={() => openEdit(rec)}>
                <div style={{ fontWeight: 700, color: THEME.navy, fontSize: 13.5 }}>
                  {rec.hazard}
                  {!rec.approved && <span style={{ fontSize: 10, background: "#f1f5f9", color: THEME.text3, padding: "2px 7px", borderRadius: 999, marginRight: 6 }}>{t("commonInactive")}</span>}
                  {rec.source === "user_approved" && <span style={{ fontSize: 10, background: "#e3f5f4", color: THEME.tealDeep, padding: "2px 7px", borderRadius: 999, marginRight: 6 }}>{t("rkAutoLearned")}</span>}
                </div>
                {rec.activity && <div style={{ fontSize: 11, color: THEME.text3, marginTop: 3 }}>{t("rkActivityInline", { value: rec.activity })}</div>}
                {rec.cause && <div style={{ fontSize: 11, color: THEME.text2, marginTop: 3, whiteSpace: "pre-line" }}>{t("rkCauseInline", { value: rec.cause.slice(0, 120) + (rec.cause.length > 120 ? "…" : "") })}</div>}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button type="button" title={t("rkMergeWithAnother")} style={{ ...styles.smallButton, background: mergeSourceId === rec.id ? THEME.teal : THEME.navyMid }} onClick={() => handleStartMerge(rec.id)}>
                <GitMerge size={12} />
              </button>
              <button type="button" style={{ ...styles.smallButton, background: rec.approved ? THEME.text3 : "#166534" }} onClick={() => handleToggleActive(rec)}>
                {rec.approved ? t("rkDeactivate") : t("rkActivate")}
              </button>
              <button type="button" title={t("rkDeleteRecordFull")} style={{ ...styles.smallButton, background: THEME.danger }} onClick={() => handleDeleteOne(rec)}>
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
