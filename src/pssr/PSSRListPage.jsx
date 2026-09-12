import React, { useState, useEffect } from "react";
import { ClipboardCheck, Plus } from "lucide-react";
import { styles, THEME } from "../shared.js";
import { JalaliDateInput } from "../personnel/jalaliDate.jsx";
import { loadPssrs, createPssr } from "./pssrApi.js";
import { PSSR_STATUS_META } from "./pssrModel.js";
import { StatusBadge, Row, Field } from "./pssrUi.jsx";
import PSSRWorkspace from "./PSSRWorkspace.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";

const inputStyle = styles.input;

function emptyForm() {
  return { reportNo: "", revisionNo: "00", reportDate: "", companyOrganization: "", unitTrain: "", systemNo: "", subsystemNo: "" };
}

export default function PSSRListPage({ currentUser, role, readOnly, wide }) {
  const { t, dir } = useLanguage();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  const load = async () => {
    setLoading(true);
    setList(await loadPssrs());
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  if (selectedId) {
    return <PSSRWorkspace pssrId={selectedId} currentUser={currentUser} role={role} readOnly={readOnly} onBack={() => { setSelectedId(null); load(); }} />;
  }

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const handleCreate = async () => {
    setError("");
    if (!form.reportNo.trim()) { setError(t("pssrErrReportNoRequired")); return; }
    setSaving(true);
    const result = await createPssr(form, currentUser?.name);
    setSaving(false);
    if (result?.__error) { setError(result.message); return; }
    setForm(emptyForm());
    setShowForm(false);
    await load();
  };

  const counts = { draft: 0, in_progress: 0, closed: 0 };
  list.forEach((p) => { counts[p.status] = (counts[p.status] || 0) + 1; });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: wide ? "flex-end" : "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        {!wide && (
          <h2 style={{ fontSize: 18, color: THEME.heading, fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <ClipboardCheck size={20} color={THEME.teal} /> {t("pssrTitle")}
          </h2>
        )}
        {!readOnly && (
          <button type="button" style={{ ...styles.smallButton, display: "flex", alignItems: "center", gap: 6 }} onClick={() => { setShowForm((v) => !v); setError(""); }}>
            <Plus size={14} /> {t("pssrNewPssr")}
          </button>
        )}
      </div>

      <div style={styles.statsRow}>
        <div style={styles.statBox}><div style={styles.statNum}>{list.length}</div><div style={styles.statLabel}>{t("pssrStatTotal")}</div></div>
        <div style={styles.statBox}><div style={{ ...styles.statNum, color: THEME.teal }}>{counts.in_progress || 0}</div><div style={styles.statLabel}>{t("pssrStInProgress")}</div></div>
        <div style={styles.statBox}><div style={{ ...styles.statNum, color: THEME.text3 }}>{counts.draft || 0}</div><div style={styles.statLabel}>{t("pssrStDraft")}</div></div>
        <div style={styles.statBox}><div style={{ ...styles.statNum, color: THEME.ok }}>{counts.closed || 0}</div><div style={styles.statLabel}>{t("pssrStClosed")}</div></div>
      </div>

      {showForm && (
        <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 12, padding: 18, marginTop: 16 }}>
          <Row>
            <Field label={t("pssrReportNo")}><input style={inputStyle} value={form.reportNo} onChange={(e) => set({ reportNo: e.target.value })} dir="ltr" /></Field>
            <Field label={t("pssrRevisionNo")}><input style={inputStyle} value={form.revisionNo} onChange={(e) => set({ revisionNo: e.target.value })} dir="ltr" /></Field>
            <Field label={t("pssrReportDate")}><JalaliDateInput value={form.reportDate} onChange={(v) => set({ reportDate: v })} /></Field>
          </Row>
          <Row>
            <Field label={t("pssrCompanyOrganization")}><input style={inputStyle} value={form.companyOrganization} onChange={(e) => set({ companyOrganization: e.target.value })} dir={dir} /></Field>
            <Field label={t("pssrUnitTrain")}><input style={inputStyle} value={form.unitTrain} onChange={(e) => set({ unitTrain: e.target.value })} dir={dir} /></Field>
            <Field label={t("pssrSystemNo")}><input style={inputStyle} value={form.systemNo} onChange={(e) => set({ systemNo: e.target.value })} dir={dir} /></Field>
            <Field label={t("pssrSubsystemNo")}><input style={inputStyle} value={form.subsystemNo} onChange={(e) => set({ subsystemNo: e.target.value })} dir={dir} /></Field>
          </Row>
          {error && <p style={styles.error}>{error}</p>}
          <button type="button" style={{ ...styles.smallButton, marginTop: 6 }} disabled={saving} onClick={handleCreate}>
            {saving ? t("pssrSaving") : t("pssrCreate")}
          </button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
        {loading && <p style={{ color: THEME.text3, fontSize: 13 }}>{t("pssrLoading")}</p>}
        {!loading && list.length === 0 && <p style={{ color: THEME.text3, fontSize: 13 }}>{t("pssrEmptyList")}</p>}
        {list.map((p) => {
          const meta = PSSR_STATUS_META[p.status] || PSSR_STATUS_META.draft;
          return (
            <div key={p.id} onClick={() => setSelectedId(p.id)}
              style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 12, padding: "14px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 13.5, color: THEME.heading }}>{p.reportNo} <span style={{ color: THEME.text3, fontWeight: 600 }}>/ Rev {p.revisionNo}</span></div>
                <div style={{ fontSize: 11.5, color: THEME.text2, marginTop: 3 }}>{p.companyOrganization || "—"} · {p.unitTrain || "—"}</div>
              </div>
              <StatusBadge tone={meta.tone}>{t(meta.key)}</StatusBadge>
            </div>
          );
        })}
      </div>
    </div>
  );
}
