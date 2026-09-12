import React, { useState, useEffect } from "react";
import { AlertTriangle, Plus, Trash2, UploadCloud, X } from "lucide-react";
import { styles, THEME } from "../shared.js";
import { toJalaliSafe, JalaliDateInput } from "../personnel/jalaliDate.jsx";
import { fileToBase64 } from "../personnel/fileHelpers.js";
import { uploadBase64ToStorage } from "../offline/storageUpload.js";
import {
  INCIDENT_TYPES, INCIDENT_CATEGORIES, BODY_PARTS, INCIDENT_CAUSES, INCIDENT_MECHANISMS,
  INCIDENT_CONSEQUENCES, PPE_ITEMS, FORM_CODE, loadIncidents, createIncident, deleteIncident,
} from "./incidentsApi.js";
import IncidentDetailPage from "./IncidentDetailPage.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";

const inputStyle = styles.input;

// همان «فرمِ گزارشِ حادثه» رسمیِ شرکت (کدِ فرم MD1QM-FSW22/01-01) —
// جایگزینِ فرمِ سابقِ ۹ فیلدی، ولی فیلدهایِ قراردادیِ Tripod Beta
// (incidentNo/occurredAt/location/incidentType/isDisabling/
// injuredPersonName/lostDays/financialCost/description/employerOrg/
// contractorOrg) دقیقاً با همان نام‌ها نگه داشته شده‌اند.
function emptyForm() {
  return {
    incidentNo: "", occurredAt: "", location: "", incidentType: "fatality", isDisabling: false,
    injuredPersonName: "", lostDays: "", financialCost: "", description: "", employerOrg: "", contractorOrg: "",
    workplaceName: "", occurredPhase: "", employerManagerName: "", activityType: "", workersCount: "", workplaceAddressPhone: "",
    incidentCategory: [], occurredTime: "",
    injuredAge: "", injuredJobTitle: "", injuredEducation: "", injuredWorkExperience: "", restDuration: "", injuredBodyParts: [], humanNotes: "",
    equipmentDamaged: "", equipmentDowntime: "", delayDuration: "",
    environmentalImpact: "",
    causes: [], causesNotes: "",
    incidentMechanism: [], incidentMechanismNotes: "",
    consequences: [],
    ppeUsed: [], ppeNotes: "",
    preventionSuggestions: "",
    witnesses: [],
    actionsTaken: "",
    sketchImageUrl: "",
    contractorSupervisorName: "", contractorSupervisorDate: "",
    hseSupervisorName: "", hseSupervisorDate: "",
  };
}

export default function IncidentsListPage({ currentUser, role, readOnly, wide }) {
  const { t, dir } = useLanguage();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [uploadingSketch, setUploadingSketch] = useState(false);

  const load = async () => {
    setLoading(true);
    setList(await loadIncidents());
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  if (selectedId) {
    return <IncidentDetailPage incidentId={selectedId} currentUser={currentUser} role={role} readOnly={readOnly} onBack={() => { setSelectedId(null); load(); }} />;
  }

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const toggleArr = (key, value) => setForm((f) => ({
    ...f, [key]: f[key].includes(value) ? f[key].filter((x) => x !== value) : [...f[key], value],
  }));

  const handleCreate = async () => {
    setError("");
    if (!form.incidentNo.trim() || !form.occurredAt) {
      setError(t("incErrNoAndDateRequired"));
      return;
    }
    setSaving(true);
    const result = await createIncident(form, currentUser?.name);
    setSaving(false);
    if (result?.__error) { setError(result.message); return; }
    setForm(emptyForm());
    setShowForm(false);
    await load();
  };

  const handleDelete = async (id, incidentNo) => {
    if (!confirm(t("incDeleteConfirm", { no: incidentNo }))) return;
    const result = await deleteIncident(id);
    if (result?.__error) { alert(result.message); return; }
    await load();
  };

  const pickSketch = async (file) => {
    if (!file) return;
    setError("");
    setUploadingSketch(true);
    try {
      const data = await fileToBase64(file);
      const mime = file.type || "image/jpeg";
      const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
      const url = await uploadBase64ToStorage("incident-sketches", `${form.incidentNo || "draft"}-${Date.now()}.${ext}`, data, mime);
      set({ sketchImageUrl: url });
    } catch (e) {
      setError(e?.message || t("docUploadError"));
    }
    setUploadingSketch(false);
  };

  const addWitness = () => set({ witnesses: [...form.witnesses, { name: "", date: "" }] });
  const setWitness = (i, patch) => set({ witnesses: form.witnesses.map((w, idx) => (idx === i ? { ...w, ...patch } : w)) });
  const removeWitness = (i) => set({ witnesses: form.witnesses.filter((_, idx) => idx !== i) });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: wide ? "flex-end" : "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        {!wide && (
          <h2 style={{ fontSize: 18, color: THEME.heading, fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle size={20} color={THEME.teal} /> {t("incTitle")}
          </h2>
        )}
        {!readOnly && (
          <button type="button" style={{ ...styles.smallButton, display: "flex", alignItems: "center", gap: 6 }} onClick={() => { setShowForm((v) => !v); setError(""); }}>
            <Plus size={14} /> {t("incNewIncident")}
          </button>
        )}
      </div>

      {showForm && (
        <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 12, padding: 18, marginBottom: 18 }}>
          <p style={{ fontSize: 10.5, color: THEME.text3, lineHeight: 1.9, marginTop: 0, marginBottom: 16 }}>
            {t("incFormCodeNote", { code: FORM_CODE })}
          </p>

          <FormSection title={t("incSec1")}>
            <Row>
              <Field label={t("incWorkplaceName")}><input style={inputStyle} value={form.workplaceName} onChange={(e) => set({ workplaceName: e.target.value })} dir={dir} /></Field>
              <Field label={t("incOccurredPhase")}><input style={inputStyle} value={form.occurredPhase} onChange={(e) => set({ occurredPhase: e.target.value })} dir={dir} /></Field>
              <Field label={t("incEmployerManagerName")}><input style={inputStyle} value={form.employerManagerName} onChange={(e) => set({ employerManagerName: e.target.value })} dir={dir} /></Field>
              <Field label={t("incActivityType")}><input style={inputStyle} value={form.activityType} onChange={(e) => set({ activityType: e.target.value })} dir={dir} /></Field>
              <Field label={t("incWorkersCount")}><input type="number" style={inputStyle} value={form.workersCount} onChange={(e) => set({ workersCount: e.target.value })} dir="ltr" /></Field>
            </Row>
            <Field label={t("incWorkplaceAddressPhone")}><input style={inputStyle} value={form.workplaceAddressPhone} onChange={(e) => set({ workplaceAddressPhone: e.target.value })} dir={dir} /></Field>
          </FormSection>

          <FormSection title={t("incSec2")}>
            <CheckGroup options={INCIDENT_CATEGORIES} selected={form.incidentCategory} onToggle={(v) => toggleArr("incidentCategory", v)} />
          </FormSection>

          <FormSection title={t("incSec3")}>
            <Row>
              <Field label={t("incNo")}><input style={inputStyle} value={form.incidentNo} onChange={(e) => set({ incidentNo: e.target.value })} dir={dir} /></Field>
              <Field label={t("incOccurredAt")}><JalaliDateInput value={form.occurredAt} onChange={(v) => set({ occurredAt: v })} /></Field>
              <Field label={t("incOccurredTime")}><input type="time" style={inputStyle} value={form.occurredTime} onChange={(e) => set({ occurredTime: e.target.value })} dir="ltr" /></Field>
              <Field label={t("incLocation")}><input style={inputStyle} value={form.location} onChange={(e) => set({ location: e.target.value })} dir={dir} /></Field>
              <Field label={t("incType")}>
                <select style={inputStyle} value={form.incidentType} onChange={(e) => set({ incidentType: e.target.value })} dir={dir}>
                  {INCIDENT_TYPES.map((it) => <option key={it.value} value={it.value}>{t(it.labelKey)}</option>)}
                </select>
              </Field>
            </Row>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
              <input type="checkbox" id="isDisabling" checked={form.isDisabling} onChange={(e) => set({ isDisabling: e.target.checked })} />
              <label htmlFor="isDisabling" style={{ fontSize: 13, color: THEME.text2, cursor: "pointer" }}>{t("incIsDisablingLabel")}</label>
            </div>
          </FormSection>

          <FormSection title={t("incSec31")}>
            <Row>
              <Field label={t("incInjuredName")}><input style={inputStyle} value={form.injuredPersonName} onChange={(e) => set({ injuredPersonName: e.target.value })} dir={dir} /></Field>
              <Field label={t("incInjuredAge")}><input type="number" style={inputStyle} value={form.injuredAge} onChange={(e) => set({ injuredAge: e.target.value })} dir="ltr" /></Field>
              <Field label={t("incInjuredJobTitle")}><input style={inputStyle} value={form.injuredJobTitle} onChange={(e) => set({ injuredJobTitle: e.target.value })} dir={dir} /></Field>
              <Field label={t("incInjuredEducation")}><input style={inputStyle} value={form.injuredEducation} onChange={(e) => set({ injuredEducation: e.target.value })} dir={dir} /></Field>
              <Field label={t("incInjuredWorkExperience")}><input style={inputStyle} value={form.injuredWorkExperience} onChange={(e) => set({ injuredWorkExperience: e.target.value })} dir={dir} /></Field>
              <Field label={t("incRestDuration")}><input style={inputStyle} value={form.restDuration} onChange={(e) => set({ restDuration: e.target.value })} dir={dir} /></Field>
              <Field label={t("incLostDays")}><input type="number" style={inputStyle} value={form.lostDays} onChange={(e) => set({ lostDays: e.target.value })} dir="ltr" /></Field>
            </Row>
            <div style={{ marginTop: 8 }}>
              <label style={styles.label}>{t("incBodyParts")}</label>
              <CheckGroup options={BODY_PARTS} selected={form.injuredBodyParts} onToggle={(v) => toggleArr("injuredBodyParts", v)} />
            </div>
            <Field label={t("incHumanNotes")}><textarea style={{ ...inputStyle, minHeight: 50 }} value={form.humanNotes} onChange={(e) => set({ humanNotes: e.target.value })} dir={dir} /></Field>
          </FormSection>

          <FormSection title={t("incSec32")}>
            <Row>
              <Field label={t("incEquipmentDamaged")}><input style={inputStyle} value={form.equipmentDamaged} onChange={(e) => set({ equipmentDamaged: e.target.value })} dir={dir} /></Field>
              <Field label={t("incEquipmentDowntime")}><input style={inputStyle} value={form.equipmentDowntime} onChange={(e) => set({ equipmentDowntime: e.target.value })} dir={dir} /></Field>
              <Field label={t("incDelayDuration")}><input style={inputStyle} value={form.delayDuration} onChange={(e) => set({ delayDuration: e.target.value })} dir={dir} /></Field>
              <Field label={t("incFinancialCost")}><input type="number" style={inputStyle} value={form.financialCost} onChange={(e) => set({ financialCost: e.target.value })} dir="ltr" /></Field>
            </Row>
          </FormSection>

          <FormSection title={t("incSec33")}>
            <Field label={t("incEnvironmentalImpact")}><textarea style={{ ...inputStyle, minHeight: 60 }} value={form.environmentalImpact} onChange={(e) => set({ environmentalImpact: e.target.value })} dir={dir} /></Field>
          </FormSection>

          <FormSection title={t("incSec4")}>
            <CheckGroup options={INCIDENT_CAUSES} selected={form.causes} onToggle={(v) => toggleArr("causes", v)} />
            <Field label={t("incCausesNotes")}><textarea style={{ ...inputStyle, minHeight: 50, marginTop: 8 }} value={form.causesNotes} onChange={(e) => set({ causesNotes: e.target.value })} dir={dir} /></Field>
          </FormSection>

          <FormSection title={t("incSec5")}>
            <Field label={t("incDescription")}><textarea style={{ ...inputStyle, minHeight: 80 }} value={form.description} onChange={(e) => set({ description: e.target.value })} dir={dir} /></Field>
          </FormSection>

          <FormSection title={t("incSec6")}>
            <CheckGroup options={INCIDENT_MECHANISMS} selected={form.incidentMechanism} onToggle={(v) => toggleArr("incidentMechanism", v)} />
            <Field label={t("incMechanismNotes")}><textarea style={{ ...inputStyle, minHeight: 50, marginTop: 8 }} value={form.incidentMechanismNotes} onChange={(e) => set({ incidentMechanismNotes: e.target.value })} dir={dir} /></Field>
          </FormSection>

          <FormSection title={t("incSec7")}>
            <CheckGroup options={INCIDENT_CONSEQUENCES} selected={form.consequences} onToggle={(v) => toggleArr("consequences", v)} />
          </FormSection>

          <FormSection title={t("incSec8")}>
            <CheckGroup options={PPE_ITEMS} selected={form.ppeUsed} onToggle={(v) => toggleArr("ppeUsed", v)} />
            <Field label={t("incHumanNotes")}><input style={{ ...inputStyle, marginTop: 8 }} value={form.ppeNotes} onChange={(e) => set({ ppeNotes: e.target.value })} dir={dir} /></Field>
          </FormSection>

          <FormSection title={t("incSec9")}>
            <Field label={t("incPreventionSuggestions")}><textarea style={{ ...inputStyle, minHeight: 60 }} value={form.preventionSuggestions} onChange={(e) => set({ preventionSuggestions: e.target.value })} dir={dir} /></Field>
          </FormSection>

          <FormSection title={t("incSec10")}>
            {form.witnesses.map((w, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <input style={{ ...inputStyle, flex: 2 }} placeholder={t("incWitnessName")} value={w.name} onChange={(e) => setWitness(i, { name: e.target.value })} dir={dir} />
                <div style={{ flex: 1 }}><JalaliDateInput value={w.date} onChange={(v) => setWitness(i, { date: v })} allowEmpty /></div>
                <button type="button" onClick={() => removeWitness(i)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}><Trash2 size={14} color={THEME.danger} /></button>
              </div>
            ))}
            <button type="button" onClick={addWitness} style={{ ...styles.smallButton, background: THEME.surface2, color: THEME.text, display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Plus size={13} /> {t("incAddWitness")}
            </button>
          </FormSection>

          <FormSection title={t("incSec11")}>
            <Field label={t("incActionsTaken")}><textarea style={{ ...inputStyle, minHeight: 60 }} value={form.actionsTaken} onChange={(e) => set({ actionsTaken: e.target.value })} dir={dir} /></Field>
          </FormSection>

          <FormSection title={t("incSec12")}>
            <Row>
              <Field label={t("incContractorSupervisorName")}><input style={inputStyle} value={form.contractorSupervisorName} onChange={(e) => set({ contractorSupervisorName: e.target.value })} dir={dir} /></Field>
              <Field label={t("incSupervisorDate")}><JalaliDateInput value={form.contractorSupervisorDate} onChange={(v) => set({ contractorSupervisorDate: v })} allowEmpty /></Field>
              <Field label={t("incHseSupervisorName")}><input style={inputStyle} value={form.hseSupervisorName} onChange={(e) => set({ hseSupervisorName: e.target.value })} dir={dir} /></Field>
              <Field label={t("incSupervisorDate")}><JalaliDateInput value={form.hseSupervisorDate} onChange={(v) => set({ hseSupervisorDate: v })} allowEmpty /></Field>
            </Row>
            <div style={{ marginTop: 8 }}>
              <label style={styles.label}>{t("incSketchImage")}</label>
              {form.sketchImageUrl ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <img src={form.sketchImageUrl} alt="" style={{ width: 90, height: 90, objectFit: "cover", borderRadius: 8, border: `1px solid ${THEME.border}` }} />
                  <button type="button" onClick={() => set({ sketchImageUrl: "" })} style={{ ...styles.smallButton, background: THEME.surface2, color: THEME.danger, display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <X size={13} /> {t("incRemoveSketch")}
                  </button>
                </div>
              ) : (
                <label style={{ ...styles.smallButton, background: THEME.surface2, color: THEME.text, display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", width: "fit-content" }}>
                  <UploadCloud size={13} /> {uploadingSketch ? t("incUploading") : t("incUploadSketch")}
                  <input type="file" accept="image/*" style={{ display: "none" }} disabled={uploadingSketch} onChange={(e) => pickSketch(e.target.files?.[0])} />
                </label>
              )}
            </div>
          </FormSection>

          <FormSection title={t("incEmployerOrg") + " / " + t("incContractorOrg")}>
            <Row>
              <Field label={t("incEmployerOrg")}><input style={inputStyle} value={form.employerOrg} onChange={(e) => set({ employerOrg: e.target.value })} dir={dir} /></Field>
              <Field label={t("incContractorOrg")}><input style={inputStyle} value={form.contractorOrg} onChange={(e) => set({ contractorOrg: e.target.value })} dir={dir} /></Field>
            </Row>
          </FormSection>

          {error && <p style={styles.error}>{error}</p>}
          <button type="button" style={{ ...styles.smallButton, marginTop: 12 }} onClick={handleCreate} disabled={saving}>
            {saving ? t("saSubmittingEllipsis") : t("incSubmit")}
          </button>
        </div>
      )}

      {loading && <p style={{ color: THEME.text3, textAlign: "center", padding: 30 }}>{t("commonLoading")}</p>}
      {!loading && list.length === 0 && <p style={{ color: THEME.text3, textAlign: "center", padding: 30 }}>{t("incNoneYet")}</p>}

      {!loading && list.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, background: THEME.surface, borderRadius: 10, overflow: "hidden" }}>
            <thead>
              <tr style={{ borderBottom: `1.5px solid ${THEME.border}`, color: THEME.text3 }}>
                <th style={{ textAlign: "start", padding: "10px" }}>{t("incColNo")}</th>
                <th style={{ textAlign: "center", padding: "10px" }}>{t("incColDate")}</th>
                <th style={{ textAlign: "center", padding: "10px" }}>{t("incColType")}</th>
                <th style={{ textAlign: "center", padding: "10px" }}>{t("incColDisabling")}</th>
                <th style={{ textAlign: "center", padding: "10px" }}>{t("incColLocation")}</th>
                <th style={{ padding: "10px" }} />
              </tr>
            </thead>
            <tbody>
              {list.map((inc) => (
                <tr key={inc.id} style={{ borderBottom: `1px solid ${THEME.border}`, cursor: "pointer" }} onClick={() => setSelectedId(inc.id)}>
                  <td style={{ padding: "10px", fontWeight: 700, color: THEME.heading }}>{inc.incidentNo}</td>
                  <td style={{ padding: "10px", textAlign: "center" }}>{toJalaliSafe(inc.occurredAt)}</td>
                  <td style={{ padding: "10px", textAlign: "center" }}>{(() => { const it = INCIDENT_TYPES.find((x) => x.value === inc.incidentType); return it ? t(it.labelKey) : inc.incidentType; })()}</td>
                  <td style={{ padding: "10px", textAlign: "center" }}>
                    {inc.isDisabling && <span style={{ fontSize: 10.5, padding: "3px 10px", borderRadius: 999, background: THEME.dangerBg, color: THEME.danger, fontWeight: 600 }}>{t("commonYes")}</span>}
                  </td>
                  <td style={{ padding: "10px", textAlign: "center" }}>{inc.location || "—"}</td>
                  <td style={{ padding: "10px", textAlign: "left" }}>
                    {!readOnly && (
                      <button type="button" onClick={(e) => { e.stopPropagation(); handleDelete(inc.id, inc.incidentNo); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                        <Trash2 size={14} color={THEME.danger} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FormSection({ title, children }) {
  return (
    <div style={{ borderTop: `1px solid ${THEME.borderSoft}`, paddingTop: 14, marginTop: 14 }}>
      <b style={{ fontSize: 12.5, color: THEME.heading, display: "block", marginBottom: 10 }}>{title}</b>
      {children}
    </div>
  );
}
function Row({ children }) {
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 10 }}>{children}</div>;
}
function Field({ label, children }) {
  return (
    <div>
      <label style={styles.label}>{label}</label>
      {children}
    </div>
  );
}
function CheckGroup({ options, selected, onToggle }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
      {options.map((opt) => {
        const on = selected.includes(opt);
        return (
          <button key={opt} type="button" onClick={() => onToggle(opt)}
            style={{
              fontSize: 11.5, fontWeight: 600, padding: "6px 12px", borderRadius: 999, cursor: "pointer",
              border: `1.5px solid ${on ? THEME.teal : THEME.border}`,
              background: on ? THEME.tealSoft : "transparent",
              color: on ? THEME.tealDeep : THEME.text2,
              fontFamily: THEME.font,
            }}>
            {opt}
          </button>
        );
      })}
    </div>
  );
}
