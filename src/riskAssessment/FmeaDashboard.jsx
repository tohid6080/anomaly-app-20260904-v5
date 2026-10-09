import React, { useState, useEffect } from "react";
import BackLink from "../shared/BackLink.jsx";
import { ShieldCheck, Plus, Trash2 } from "lucide-react";
import { styles, THEME } from "../shared.js";
import { toJalaliSafe } from "../personnel/jalaliDate.jsx";
import { loadContractorOptions } from "../personnel/personnelApi.js";
import { loadFmeaAssessments, createFmeaAssessment, deleteFmeaAssessment } from "./fmeaApi.js";
import FmeaForm from "./FmeaForm.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";

export default function FmeaDashboard({ onBack, currentUser, role, readOnly, wide }) {
  const { t, dir } = useLanguage();
  const [list, setList] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [processOrComponent, setProcessOrComponent] = useState("");
  const [contractorName, setContractorName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  const load = async () => {
    setLoading(true);
    setList(await loadFmeaAssessments());
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { loadContractorOptions().then(setContractors); }, []);

  if (selectedId) {
    return <FmeaForm fmeaId={selectedId} currentUser={currentUser} readOnly={readOnly} onBack={() => { setSelectedId(null); load(); }} />;
  }

  const handleCreate = async () => {
    if (!title.trim()) { setError(t("fmeaErrTitleRequired")); return; }
    setSaving(true);
    setError("");
    const result = await createFmeaAssessment({ title: title.trim(), processOrComponent: processOrComponent.trim(), contractorName }, currentUser?.name);
    setSaving(false);
    if (result?.__error) { setError(result.message); return; }
    setTitle(""); setProcessOrComponent(""); setContractorName("");
    setShowForm(false);
    await load();
    setSelectedId(result.id);
  };

  const handleDelete = async (id) => {
    if (!confirm(t("fmeaDeleteConfirm"))) return;
    const result = await deleteFmeaAssessment(id);
    if (result?.__error) { alert(result.message); return; }
    await load();
  };

  return (
    <div style={wide ? { direction: dir } : { maxWidth: 720, margin: "0 auto", padding: 24, direction: dir }}>
      {!wide && onBack && <BackLink onClick={onBack}>{t("commonBackPlain")}</BackLink>}
      {!wide && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <ShieldCheck size={20} color={THEME.teal} />
          <h2 style={{ margin: 0, fontSize: 19, color: THEME.heading, fontWeight: 700 }}>{t("fmeaTitle")}</h2>
        </div>
      )}

      {!readOnly && !showForm && (
        <button type="button" style={{ ...styles.button, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 16 }} onClick={() => setShowForm(true)}>
          <Plus size={15} /> {t("fmeaNewBtn")}
        </button>
      )}

      {!readOnly && showForm && (
        <div style={{ ...styles.card, width: "auto", marginBottom: 18 }}>
          <div style={styles.formGrid}>
            <input style={styles.input} placeholder={t("fmeaFieldTitle")} value={title} onChange={(e) => setTitle(e.target.value)} dir={dir} />
            <input style={styles.input} placeholder={t("fmeaFieldProcessOrComponent")} value={processOrComponent} onChange={(e) => setProcessOrComponent(e.target.value)} dir={dir} />
            <select style={styles.input} value={contractorName} onChange={(e) => setContractorName(e.target.value)} dir={dir}>
              <option value="">{t("jhaFieldContractor")}</option>
              {contractors.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          {error && <p style={styles.error}>{error}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" style={styles.button} onClick={handleCreate} disabled={saving}>{saving ? t("saSubmittingEllipsis") : t("commonSave")}</button>
            <button type="button" style={{ ...styles.button, background: THEME.text3 }} onClick={() => setShowForm(false)}>{t("commonCancel")}</button>
          </div>
        </div>
      )}

      {loading && <p style={{ color: THEME.text3, textAlign: "center", padding: 30 }}>{t("commonLoading")}</p>}
      {!loading && list.length === 0 && <p style={{ color: THEME.text3, textAlign: "center", padding: 30 }}>{t("fmeaNoneYet")}</p>}

      {!loading && list.map((f) => (
        <div key={f.id} style={{ ...styles.card, width: "auto", marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => setSelectedId(f.id)}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, color: THEME.heading, fontSize: 13 }}>{f.title}</div>
            <div style={{ fontSize: 11, color: THEME.text3, marginTop: 3 }}>{f.processOrComponent} {f.contractorName ? `— ${f.contractorName}` : ""} — {toJalaliSafe(f.createdAt)}</div>
          </div>
          {!readOnly && (
            <button type="button" onClick={(e) => { e.stopPropagation(); handleDelete(f.id); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
              <Trash2 size={14} color={THEME.danger} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
