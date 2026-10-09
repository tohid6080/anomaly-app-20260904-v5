import React, { useState, useEffect } from "react";
import BackLink from "../shared/BackLink.jsx";
import { ShieldCheck, Plus, Trash2, X } from "lucide-react";
import { styles, THEME } from "../shared.js";
import { loadActiveJobPositions } from "../jobpositions/jobPositionsApi.js";
import {
  loadPpeItems, createPpeItem, updatePpeItem, deletePpeItem,
  loadPpeRequirementsMatrix, setPpeRequirement,
} from "./ppeApi.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";

/**
 * «مدیریت PPE» — زیرِ مدیریت سیستم. دقیقاً همان الگویِ TrainingManager.jsx:
 * (۱) CRUD روی فهرستِ اقلامِ PPE، (۲) ماتریسِ قلم × عنوانِ شغلی — کلیک روی
 * هر خانه، نیازِ آن پست به آن قلم را toggle می‌کند. PersonnelDetail.jsx این
 * ماتریس را زنده می‌خواند تا اقلامِ موردنیازِ هر پرسنل را نشان دهد.
 */
export default function PpeRequirementsManager({ onBack, wide }) {
  const { t, dir } = useLanguage();
  const [items, setItems] = useState([]);
  const [positions, setPositions] = useState([]);
  const [matrix, setMatrix] = useState([]);
  const [draftMatrix, setDraftMatrix] = useState([]);
  const [matrixSaving, setMatrixSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    const [i, p, m] = await Promise.all([loadPpeItems(true), loadActiveJobPositions(), loadPpeRequirementsMatrix()]);
    setItems(i);
    setPositions(p);
    setMatrix(m);
    setDraftMatrix(m);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const isRequiredIn = (list, ppeItemId, jobPositionId) => list.some((m) => m.ppeItemId === ppeItemId && m.jobPositionId === jobPositionId);
  const isRequired = (ppeItemId, jobPositionId) => isRequiredIn(draftMatrix, ppeItemId, jobPositionId);

  const toggleCell = (ppeItemId, jobPositionId) => {
    const currentlyRequired = isRequiredIn(draftMatrix, ppeItemId, jobPositionId);
    setDraftMatrix((prev) => (currentlyRequired ? prev.filter((m) => !(m.ppeItemId === ppeItemId && m.jobPositionId === jobPositionId)) : [...prev, { ppeItemId, jobPositionId }]));
  };

  const changedCells = () => {
    const cells = [];
    items.forEach((i) => {
      positions.forEach((p) => {
        const before = isRequiredIn(matrix, i.id, p.id);
        const after = isRequiredIn(draftMatrix, i.id, p.id);
        if (before !== after) cells.push({ ppeItemId: i.id, jobPositionId: p.id, required: after });
      });
    });
    return cells;
  };
  const isMatrixDirty = changedCells().length > 0;

  const handleSaveMatrix = async () => {
    setMatrixSaving(true);
    const results = await Promise.all(changedCells().map((cell) => setPpeRequirement(cell.ppeItemId, cell.jobPositionId, cell.required)));
    setMatrixSaving(false);
    if (results.some((r) => r?.__error)) alert(t("errSaveSomeMatrixItems"));
    await load();
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    setError("");
    const result = await createPpeItem(newName.trim());
    setSaving(false);
    if (result?.__error) { setError(result.message); return; }
    setNewName("");
    await load();
  };

  const handleToggleActive = async (item) => {
    await updatePpeItem(item.id, { isActive: !item.isActive });
    await load();
  };

  const handleDelete = async (item) => {
    if (!confirm(t("ppeDeleteConfirm", { name: item.name }))) return;
    const result = await deletePpeItem(item.id);
    if (result?.__error) { alert(result.message); return; }
    await load();
  };

  if (loading) return <div style={{ padding: 24, textAlign: "center", color: THEME.text3 }}>{t("commonLoading")}</div>;

  return (
    <div style={wide ? { direction: dir } : { maxWidth: 1000, margin: "0 auto", padding: 24, direction: dir }}>
      {!wide && onBack && <BackLink onClick={onBack}>{t("commonBackToSystemManagement")}</BackLink>}
      {!wide && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <ShieldCheck size={20} color={THEME.teal} />
            <h2 style={{ margin: 0, fontSize: 19, color: THEME.heading, fontWeight: 700 }}>{t("ppeTitle")}</h2>
          </div>
          <p style={{ color: THEME.text3, fontSize: 12.5, marginBottom: 18 }}>{t("ppeDesc")}</p>
        </>
      )}

      <div style={{ ...styles.card, width: "auto", marginBottom: 18, display: "flex", gap: 8 }}>
        <input style={{ ...styles.input, marginBottom: 0, flex: 1 }} placeholder={t("ppeNewItemPlaceholder")} value={newName} onChange={(e) => setNewName(e.target.value)} dir={dir} onKeyDown={(e) => e.key === "Enter" && handleCreate()} />
        <button type="button" style={{ ...styles.smallButton, display: "flex", alignItems: "center", gap: 6 }} onClick={handleCreate} disabled={saving || !newName.trim()}>
          <Plus size={14} /> {t("commonAdd")}
        </button>
      </div>
      {error && <p style={styles.error}>{error}</p>}

      <div style={{ ...styles.card, width: "auto", marginBottom: 18 }}>
        <h3 style={{ fontSize: 14, color: THEME.heading, margin: "0 0 10px", fontWeight: 700 }}>{t("ppeDefinedItems", { count: items.length })}</h3>
        {items.length === 0 && <p style={{ color: THEME.text3, fontSize: 12.5 }}>{t("ppeNoItemsYet")}</p>}
        {items.map((i) => (
          <div key={i.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${THEME.border}` }}>
            <span style={{ flex: 1, fontSize: 13, color: i.isActive ? THEME.text : THEME.text3, textDecoration: i.isActive ? "none" : "line-through" }}>{i.name}</span>
            <button type="button" style={{ ...styles.smallButton, background: i.isActive ? THEME.text3 : THEME.ok }} onClick={() => handleToggleActive(i)}>
              {i.isActive ? t("commonInactive") : t("commonActive")}
            </button>
            <button type="button" style={{ ...styles.smallButton, background: THEME.danger }} onClick={() => handleDelete(i)}>
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>

      <div style={{ ...styles.card, width: "auto" }}>
        <h3 style={{ fontSize: 14, color: THEME.heading, margin: "0 0 4px", fontWeight: 700 }}>{t("ppeMatrixTitle")}</h3>
        <p style={{ fontSize: 11.5, color: THEME.text3, margin: "0 0 12px" }}>{t("ppeMatrixHint")}</p>
        {(items.length === 0 || positions.length === 0) && (
          <p style={{ color: THEME.text3, fontSize: 12.5 }}>{t("ppeMatrixNeedsData")}</p>
        )}
        {items.length > 0 && positions.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", fontSize: 11, minWidth: "100%" }}>
              <thead>
                <tr>
                  <th style={{ position: "sticky", insetInlineStart: 0, background: THEME.surface, padding: "6px 10px", textAlign: dir === "rtl" ? "right" : "left", borderBottom: `1.5px solid ${THEME.border}`, whiteSpace: "nowrap" }}>{t("ppeColItemName")}</th>
                  {positions.map((p) => (
                    <th key={p.id} style={{ padding: "6px 8px", borderBottom: `1.5px solid ${THEME.border}`, minWidth: 70 }}>
                      <div style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", fontSize: 10.5, color: THEME.text2, whiteSpace: "nowrap", margin: "0 auto", height: 90 }}>{p.title}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.filter((i) => i.isActive).map((i) => (
                  <tr key={i.id} style={{ borderBottom: `1px solid ${THEME.border}` }}>
                    <td style={{ position: "sticky", insetInlineStart: 0, background: THEME.surface, padding: "6px 10px", fontWeight: 600, whiteSpace: "nowrap" }}>{i.name}</td>
                    {positions.map((p) => {
                      const req = isRequired(i.id, p.id);
                      const pending = isRequiredIn(matrix, i.id, p.id) !== req;
                      return (
                        <td key={p.id} style={{ padding: 2, textAlign: "center" }}>
                          <div
                            onClick={() => toggleCell(i.id, p.id)}
                            style={{ width: 26, height: 26, margin: "0 auto", borderRadius: 5, cursor: "pointer", background: req ? THEME.teal : THEME.surface2, border: pending ? "2px solid #f59e0b" : `1px solid ${THEME.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}
                          >
                            {req && <X size={13} color="#fff" style={{ transform: "rotate(45deg)" }} />}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {isMatrixDirty && (
          <div style={{ position: "sticky", bottom: 10, display: "flex", alignItems: "center", gap: 8, background: THEME.warnBg, border: "1px solid #f59e0b", borderRadius: 10, padding: "10px 14px", marginTop: 12 }}>
            <span style={{ fontSize: 11.5, color: THEME.warn, fontWeight: 600, flex: 1 }}>{t("draftUnsavedCellsBar", { count: changedCells().length })}</span>
            <button type="button" style={{ ...styles.smallButton, background: THEME.text3 }} onClick={() => setDraftMatrix(matrix)} disabled={matrixSaving}>{t("commonCancel")}</button>
            <button type="button" style={styles.smallButton} onClick={handleSaveMatrix} disabled={matrixSaving}>{matrixSaving ? t("saSavingEllipsis") : t("draftCommitChanges")}</button>
          </div>
        )}
      </div>
    </div>
  );
}
