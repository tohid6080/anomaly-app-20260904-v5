import React, { useState, useEffect } from "react";
import { Plus, Star, Trash2, X } from "lucide-react";
import { styles, THEME } from "../shared.js";
import { PSSR_DISCIPLINES, ORG_ROLES, disciplineLabel } from "./pssrModel.js";
import { loadContractorAccountsForSigning, loadEmployerAccountsForSigning, addTeamMember, setResponsible, removeTeamMember } from "./pssrTeamApi.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";

const inputStyle = styles.input;

export default function PSSRTeamPanel({ pssrId, teamMembers, readOnly, onChanged }) {
  const { t } = useLanguage();
  const [contractorAccounts, setContractorAccounts] = useState([]);
  const [employerAccounts, setEmployerAccounts] = useState([]);
  const [addingFor, setAddingFor] = useState(null); // discipline value
  const [pickKey, setPickKey] = useState("");
  const [orgRole, setOrgRole] = useState("employer");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      setContractorAccounts(await loadContractorAccountsForSigning());
      setEmployerAccounts(await loadEmployerAccountsForSigning());
    })();
  }, []);

  const openAdd = (discipline) => { setAddingFor(discipline); setPickKey(""); setOrgRole("employer"); setError(""); };

  const handleAdd = async () => {
    if (!pickKey) { setError(t("pssrErrPickAccount")); return; }
    const [accountType, accountId] = pickKey.split(":");
    setSaving(true);
    const res = await addTeamMember({ pssrId, discipline: addingFor, orgRole, accountType, accountId }, null);
    setSaving(false);
    if (res?.__error) { setError(res.message); return; }
    setAddingFor(null);
    onChanged();
  };

  const handleRemove = async (id) => {
    if (!confirm(t("pssrConfirmRemoveMember"))) return;
    await removeTeamMember(id);
    onChanged();
  };

  const handleSetResponsible = async (discipline, memberId) => {
    await setResponsible(pssrId, discipline, memberId);
    onChanged();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {PSSR_DISCIPLINES.map((d) => {
        const members = teamMembers.filter((m) => m.discipline === d.value);
        return (
          <div key={d.value} style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 12, padding: "12px 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: members.length ? 8 : 0 }}>
              <b style={{ fontSize: 12.5, color: THEME.heading }}>{disciplineLabel(d.value, t)}</b>
              {!readOnly && (
                <button type="button" onClick={() => openAdd(d.value)} style={{ background: "none", border: `1.5px dashed ${THEME.border}`, borderRadius: 8, padding: "4px 10px", fontSize: 11.5, color: THEME.teal, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                  <Plus size={12} /> {t("pssrAddMember")}
                </button>
              )}
            </div>

            {members.map((m) => (
              <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 0", borderTop: `1px solid ${THEME.borderSoft}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button type="button" title={t("pssrMarkResponsible")} onClick={() => !readOnly && handleSetResponsible(d.value, m.id)}
                    style={{ background: "none", border: "none", cursor: readOnly ? "default" : "pointer", padding: 0, display: "flex" }}>
                    <Star size={14} color={m.isResponsible ? THEME.warn : THEME.border} fill={m.isResponsible ? THEME.warn : "none"} />
                  </button>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: THEME.text }}>{m.fullName || "—"}</div>
                    <div style={{ fontSize: 10.5, color: THEME.text3 }}>{m.companyName} · {t(ORG_ROLES.find((r) => r.value === m.orgRole)?.labelKey)} {m.jobTitle ? `· ${m.jobTitle}` : ""}</div>
                  </div>
                </div>
                {!readOnly && (
                  <button type="button" onClick={() => handleRemove(m.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                    <Trash2 size={13} color={THEME.text3} />
                  </button>
                )}
              </div>
            ))}

            {addingFor === d.value && (
              <div style={{ marginTop: 10, background: THEME.surface2, border: `1px solid ${THEME.border}`, borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <b style={{ fontSize: 11.5, color: THEME.heading }}>{t("pssrAddMember")}</b>
                  <X size={14} style={{ cursor: "pointer" }} onClick={() => setAddingFor(null)} />
                </div>
                <select style={inputStyle} value={pickKey} onChange={(e) => setPickKey(e.target.value)}>
                  <option value="">{t("pssrPickAccount")}</option>
                  <optgroup label={t("pssrOrgEmployer")}>
                    {employerAccounts.map((a) => <option key={a.id} value={`employer:${a.id}`}>{a.fullName}{a.jobTitle ? ` — ${a.jobTitle}` : ""}</option>)}
                  </optgroup>
                  <optgroup label={t("pssrOrgContractor")}>
                    {contractorAccounts.map((a) => <option key={a.id} value={`contractor:${a.id}`}>{a.fullName} ({a.groupName}){a.jobTitle ? ` — ${a.jobTitle}` : ""}</option>)}
                  </optgroup>
                </select>
                <select style={inputStyle} value={orgRole} onChange={(e) => setOrgRole(e.target.value)}>
                  {ORG_ROLES.map((r) => <option key={r.value} value={r.value}>{t(r.labelKey)}</option>)}
                </select>
                {error && <p style={styles.error}>{error}</p>}
                <button type="button" style={styles.smallButton} disabled={saving} onClick={handleAdd}>{saving ? t("pssrSaving") : t("pssrAddMember")}</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
