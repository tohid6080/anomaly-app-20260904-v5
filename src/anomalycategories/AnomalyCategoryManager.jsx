import React, { useState, useEffect } from "react";
import BackLink from "../shared/BackLink.jsx";
import { Tag as TagIcon, Plus, Hourglass, CheckCircle2, XCircle } from "lucide-react";
import { styles, THEME } from "../shared.js";
import { loadAllAnomalyCategories, createAnomalyCategory, updateAnomalyCategory, setAnomalyCategoryActive, approveAnomalyCategory, rejectAnomalyCategory } from "./anomalyCategoriesApi.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";

export default function AnomalyCategoryManager({ onBack, wide, currentUser }) {
  const { t, dir } = useLanguage();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectNote, setRejectNote] = useState("");

  const load = async () => {
    setCategories(await loadAllAnomalyCategories());
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const pending = categories.filter((c) => c.status === "pending_review");
  const mainList = categories.filter((c) => c.status !== "pending_review");

  const handleApprove = async (c) => {
    const result = await approveAnomalyCategory(c.id, currentUser?.name);
    if (result?.__error) { setError(result.message); return; }
    await load();
  };
  const handleReject = async (c) => {
    const result = await rejectAnomalyCategory(c.id, currentUser?.name, rejectNote);
    if (result?.__error) { setError(result.message); return; }
    setRejectingId(null); setRejectNote("");
    await load();
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    setError("");
    const result = await createAnomalyCategory(newName);
    setSaving(false);
    if (result?.__error) { setError(result.message); return; }
    setNewName("");
    await load();
  };

  const startEdit = (c) => { setEditingId(c.id); setEditingName(c.name); };
  const saveEdit = async () => {
    if (!editingName.trim()) return;
    const result = await updateAnomalyCategory(editingId, editingName);
    if (result?.__error) { alert(result.message); return; }
    setEditingId(null);
    await load();
  };

  const handleToggleActive = async (c) => {
    await setAnomalyCategoryActive(c.id, !c.isActive);
    await load();
  };

  if (loading) return <div style={{ padding: 24, textAlign: "center", color: THEME.text3 }}>{t("commonLoading")}</div>;

  return (
    <div style={wide ? { direction: dir } : { maxWidth: 560, margin: "0 auto", padding: 24, direction: dir }}>
      {!wide && onBack && <BackLink onClick={onBack}>{t("commonBackToSystemManagement")}</BackLink>}
      {!wide && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <TagIcon size={20} color={THEME.teal} />
            <h2 style={{ margin: 0, fontSize: 19, color: THEME.heading, fontWeight: 700 }}>{t("anomalyCategoriesTitle")}</h2>
          </div>
          <p style={{ color: THEME.text3, fontSize: 12.5, marginBottom: 16 }}>{t("anomalyCategoriesDesc")}</p>
        </>
      )}

      <div style={{ ...styles.card, width: "auto", marginBottom: 16, display: "flex", gap: 8 }}>
        <input style={{ ...styles.input, marginBottom: 0, flex: 1 }} placeholder={t("anomalyCategoryNewPlaceholder")} value={newName} onChange={(e) => setNewName(e.target.value)} dir={dir} onKeyDown={(e) => e.key === "Enter" && handleAdd()} />
        <button type="button" style={{ ...styles.smallButton, display: "flex", alignItems: "center", gap: 6 }} onClick={handleAdd} disabled={saving || !newName.trim()}>
          <Plus size={14} /> {t("commonAdd")}
        </button>
      </div>
      {error && <p style={styles.error}>{error}</p>}

      {pending.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <b style={{ fontSize: 12.5, color: THEME.heading, display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <Hourglass size={13} color={THEME.warn} /> {t("acatPendingTitle", { n: pending.length })}
          </b>
          {pending.map((c) => (
            <div key={c.id} style={{ ...styles.card, width: "auto", marginBottom: 8, border: `1.5px solid ${THEME.warn}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: THEME.heading, fontSize: 13 }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: THEME.text3, marginTop: 3 }}>{t("acatProposedByLabel", { name: c.proposedBy || "—" })}</div>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  <button type="button" style={{ ...styles.smallButton, background: THEME.ok, display: "inline-flex", alignItems: "center", gap: 5 }} onClick={() => handleApprove(c)}>
                    <CheckCircle2 size={12} /> {t("acatApprove")}
                  </button>
                  <button type="button" style={{ ...styles.smallButton, background: THEME.danger, display: "inline-flex", alignItems: "center", gap: 5 }} onClick={() => { setRejectingId(rejectingId === c.id ? null : c.id); setRejectNote(""); }}>
                    <XCircle size={12} /> {t("acatReject")}
                  </button>
                </div>
              </div>
              {rejectingId === c.id && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${THEME.border}` }}>
                  <textarea style={{ ...styles.input, minHeight: 50, resize: "vertical" }} placeholder={t("acatRejectReasonPlaceholder")}
                    value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} dir={dir} />
                  <button type="button" style={{ ...styles.smallButton, background: THEME.danger, marginTop: 6 }} disabled={!rejectNote.trim()} onClick={() => handleReject(c)}>{t("acatConfirmReject")}</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {mainList.map((c) => (
        <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${THEME.border}` }}>
          {editingId === c.id ? (
            <input style={{ ...styles.input, marginBottom: 0, flex: 1 }} value={editingName} onChange={(e) => setEditingName(e.target.value)} dir={dir} autoFocus onKeyDown={(e) => e.key === "Enter" && saveEdit()} />
          ) : (
            <span style={{ flex: 1, fontSize: 13, color: c.isActive ? THEME.text : THEME.text3, textDecoration: c.isActive ? "none" : "line-through" }}>
              {c.name}
              {c.status === "rejected" && <span style={{ marginRight: 8, fontSize: 10.5, padding: "2px 8px", borderRadius: 999, fontWeight: 700, background: THEME.dangerBg, color: THEME.danger }}>{t("acatStatusRejected")}</span>}
            </span>
          )}
          {editingId === c.id ? (
            <button type="button" style={styles.smallButton} onClick={saveEdit}>{t("commonSave")}</button>
          ) : (
            <button type="button" style={{ ...styles.smallButton, background: THEME.navyMid }} onClick={() => startEdit(c)}>{t("commonEdit")}</button>
          )}
          <button type="button" style={{ ...styles.smallButton, background: c.isActive ? THEME.text3 : THEME.ok }} onClick={() => handleToggleActive(c)}>
            {c.isActive ? t("commonInactive") : t("commonActive")}
          </button>
        </div>
      ))}
    </div>
  );
}
