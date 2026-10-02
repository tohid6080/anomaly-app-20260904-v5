import React, { useState, useEffect } from "react";
import BackLink from "../shared/BackLink.jsx";
import { UserPlus, Pencil, Power, Trash2, KeyRound, ListChecks, Users, ClipboardList } from "lucide-react";
import { styles, THEME } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { toJalaliSafe } from "../personnel/jalaliDate.jsx";
import {
  loadProjectHseAccounts, createProjectHseAccount, updateProjectHseAccount, setProjectHseAccountActive,
  resetProjectHseAccountPassword, deleteProjectHseAccount, loadActiveExpertsForProject, loadProjectMetricsBundle,
  PROJECT_TEMPLATES,
} from "./projectsApi.js";
import { loadCorrectiveActionsForProject, STATUS_META, isOverdue } from "../correctiveActions/correctiveActionsApi.js";

const primaryBtnStyle = { border: "none", background: THEME.teal, color: "#06231f", borderRadius: 9, padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" };
const iconBtnStyle = { display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, border: "none", borderRadius: 7, background: THEME.surface2, color: THEME.text2, cursor: "pointer" };

const EMPTY_HSE_FORM = { username: "", password: "", contactPersonName: "", phone: "", email: "" };

function Section({ icon, title, children }) {
  return (
    <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 12, padding: 14, marginBottom: 14 }}>
      <h3 style={{ fontSize: 13.5, fontWeight: 800, color: THEME.heading, margin: "0 0 10px", display: "flex", alignItems: "center", gap: 6 }}>
        {icon} {title}
      </h3>
      {children}
    </div>
  );
}

export default function ProjectWorkspace({ project, currentUser, wide, onBack }) {
  const { t, dir } = useLanguage();
  const [hseAccounts, setHseAccounts] = useState([]);
  const [activeExperts, setActiveExperts] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showAddForm, setShowAddForm] = useState(false);
  const [hseForm, setHseForm] = useState(EMPTY_HSE_FORM);
  const [editingId, setEditingId] = useState(null);
  const [resettingId, setResettingId] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    const [allHse, experts, metricsFn, projectTasks] = await Promise.all([
      loadProjectHseAccounts(),
      loadActiveExpertsForProject(project.name),
      loadProjectMetricsBundle(),
      loadCorrectiveActionsForProject(project.name),
    ]);
    setHseAccounts(allHse.filter((a) => a.name === project.name));
    setActiveExperts(experts);
    setMetrics(metricsFn(project.name));
    setTasks(projectTasks);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [project.id]);

  const template = PROJECT_TEMPLATES.find((pt) => pt.key === project.templateKey);

  const handleCreateHse = async () => {
    if (!hseForm.username.trim() || hseForm.password.length < 8) { setError(t("pwsErrHseFormRequired")); return; }
    setSaving(true);
    setError("");
    const result = await createProjectHseAccount({ name: project.name, ...hseForm });
    setSaving(false);
    if (result?.__error) { setError(result.message); return; }
    setHseForm(EMPTY_HSE_FORM);
    setShowAddForm(false);
    load();
  };

  const startEdit = (a) => { setEditingId(a.id); setHseForm({ username: a.username, password: "", contactPersonName: a.contactPersonName, phone: a.phone, email: a.email }); setError(""); };
  const handleSaveEdit = async (id) => {
    setSaving(true);
    setError("");
    const result = await updateProjectHseAccount(id, { contactPersonName: hseForm.contactPersonName, phone: hseForm.phone, email: hseForm.email });
    setSaving(false);
    if (result?.__error) { setError(result.message); return; }
    setEditingId(null);
    load();
  };

  const toggleActive = async (a) => {
    const result = await setProjectHseAccountActive(a.id, !a.isActive);
    if (result?.__error) { alert(result.message); return; }
    load();
  };

  const handleResetPassword = async (id) => {
    if (newPassword.length < 8) { setError(t("errPasswordMin8")); return; }
    setSaving(true);
    const result = await resetProjectHseAccountPassword(id, newPassword);
    setSaving(false);
    if (result?.__error) { setError(result.message); return; }
    setResettingId(null);
    setNewPassword("");
    alert(t("amPasswordResetSuccess"));
  };

  const handleDelete = async (a) => {
    if (!confirm(t("pwsDeleteHseConfirm", { name: a.contactPersonName || a.username }))) return;
    const result = await deleteProjectHseAccount(a.id);
    if (result?.__error) { alert(result.message); return; }
    load();
  };

  return (
    <div style={{ maxWidth: wide ? 980 : 720, margin: "0 auto", padding: 16 }} dir={dir}>
      <BackLink onClick={onBack}>{t("commonBack")}</BackLink>
      <h2 style={{ fontSize: 17, fontWeight: 800, color: THEME.heading, margin: "10px 0 2px" }}>{project.name}</h2>
      {project.description && <p style={{ fontSize: 12, color: THEME.text3, margin: "0 0 14px" }}>{project.description}</p>}

      {loading ? (
        <p style={{ color: THEME.text3, fontSize: 12, textAlign: "center", padding: 24 }}>{t("commonLoading")}</p>
      ) : (
        <>
          <Section icon={<ListChecks size={14} color={THEME.teal} />} title={t("pwsDashboardTitle")}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 8 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: THEME.warn }}>{metrics?.openAnomalies ?? 0}</div>
                <div style={{ fontSize: 10, color: THEME.text3 }}>{t("maapKpiOpenAnomalies")}</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: THEME.heading }}>{metrics?.openActions ?? 0}</div>
                <div style={{ fontSize: 10, color: THEME.text3 }}>{t("maapKpiOpenActions")}</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: THEME.danger }}>{metrics?.overdueActions ?? 0}</div>
                <div style={{ fontSize: 10, color: THEME.text3 }}>{t("maapKpiOverdue")}</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: THEME.danger }}>{metrics?.expiredInspections ?? 0}</div>
                <div style={{ fontSize: 10, color: THEME.text3 }}>{t("pwsKpiExpiredInspections")}</div>
              </div>
            </div>
          </Section>

          {template && (
            <Section icon={<ClipboardList size={14} color={THEME.teal} />} title={t("pwsTemplateChecklistTitle", { template: t(template.labelKey) })}>
              <p style={{ fontSize: 11, color: THEME.text3, margin: "0 0 8px" }}>{t("pwsTemplateChecklistHint")}</p>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 5 }}>
                {template.suggestedModuleLabelKeys.map((lk) => (
                  <li key={lk} style={{ fontSize: 12, color: THEME.text2, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: THEME.teal, flexShrink: 0 }} />
                    {t(lk)}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <Section icon={<Users size={14} color={THEME.teal} />} title={t("pwsHseTeamTitle")}>
            {hseAccounts.length === 0 && !showAddForm && <p style={{ fontSize: 11.5, color: THEME.text3 }}>{t("pwsNoHseYet")}</p>}
            {hseAccounts.map((a) => (
              <div key={a.id} style={{ borderBottom: `1px solid ${THEME.border}`, padding: "8px 0" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, color: THEME.heading, fontSize: 12.5 }}>{a.contactPersonName || "—"}</span>
                  <span style={{ direction: "ltr", color: THEME.text3, fontSize: 11 }}>({a.username})</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 999, background: a.isActive ? THEME.okBg : THEME.surface2, color: a.isActive ? THEME.ok : THEME.text3 }}>
                    {a.isActive ? t("commonActive") : t("commonInactive")}
                  </span>
                  <div style={{ marginInlineStart: "auto", display: "flex", gap: 4 }}>
                    <button type="button" onClick={() => startEdit(a)} style={iconBtnStyle} title={t("amEditTitle")}><Pencil size={12} /></button>
                    <button type="button" onClick={() => { setResettingId(resettingId === a.id ? null : a.id); setNewPassword(""); setError(""); }} style={{ ...iconBtnStyle, color: THEME.warn }} title={t("amResetPassword")}><KeyRound size={12} /></button>
                    <button type="button" onClick={() => toggleActive(a)} style={{ ...iconBtnStyle, color: a.isActive ? THEME.danger : THEME.ok }} title={a.isActive ? t("amDeactivate") : t("amActivate")}><Power size={12} /></button>
                    <button type="button" onClick={() => handleDelete(a)} style={{ ...iconBtnStyle, color: THEME.danger }} title={t("commonDelete")}><Trash2 size={12} /></button>
                  </div>
                </div>

                {editingId === a.id && (
                  <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                    <input style={styles.input} dir={dir} placeholder={t("amFullName")} value={hseForm.contactPersonName} onChange={(e) => setHseForm({ ...hseForm, contactPersonName: e.target.value })} />
                    <input style={styles.input} dir="ltr" placeholder={t("amPhone11Digit")} value={hseForm.phone} onChange={(e) => setHseForm({ ...hseForm, phone: e.target.value })} />
                    <input style={styles.input} dir="ltr" placeholder={t("email")} value={hseForm.email} onChange={(e) => setHseForm({ ...hseForm, email: e.target.value })} />
                    {error && <p style={{ color: THEME.danger, fontSize: 11 }}>{error}</p>}
                    <div style={{ display: "flex", gap: 6 }}>
                      <button type="button" onClick={() => handleSaveEdit(a.id)} disabled={saving} style={primaryBtnStyle}>{saving ? t("commonSaving") : t("commonSave")}</button>
                      <button type="button" onClick={() => setEditingId(null)} style={{ ...primaryBtnStyle, background: THEME.surface2, color: THEME.text2 }}>{t("commonCancel")}</button>
                    </div>
                  </div>
                )}
                {resettingId === a.id && (
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginTop: 8 }}>
                    <input type="password" style={{ ...styles.input, width: 200 }} placeholder={t("saNewPasswordMin8")} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} dir="ltr" />
                    <button type="button" onClick={() => handleResetPassword(a.id)} style={primaryBtnStyle} disabled={saving}>{saving ? t("commonSaving") : t("amResetPassword")}</button>
                    {error && <p style={{ color: THEME.danger, fontSize: 11, margin: 0 }}>{error}</p>}
                  </div>
                )}
              </div>
            ))}

            {showAddForm && (
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                <input style={styles.input} dir="ltr" placeholder={t("username")} value={hseForm.username} onChange={(e) => setHseForm({ ...hseForm, username: e.target.value })} />
                <input type="password" style={styles.input} dir="ltr" placeholder={t("saNewPasswordMin8")} value={hseForm.password} onChange={(e) => setHseForm({ ...hseForm, password: e.target.value })} />
                <input style={styles.input} dir={dir} placeholder={t("amFullName")} value={hseForm.contactPersonName} onChange={(e) => setHseForm({ ...hseForm, contactPersonName: e.target.value })} />
                <input style={styles.input} dir="ltr" placeholder={t("amPhone11Digit")} value={hseForm.phone} onChange={(e) => setHseForm({ ...hseForm, phone: e.target.value })} />
                <input style={styles.input} dir="ltr" placeholder={t("email")} value={hseForm.email} onChange={(e) => setHseForm({ ...hseForm, email: e.target.value })} />
                {error && <p style={{ color: THEME.danger, fontSize: 11 }}>{error}</p>}
                <div style={{ display: "flex", gap: 6 }}>
                  <button type="button" onClick={handleCreateHse} disabled={saving} style={primaryBtnStyle}>{saving ? t("commonSaving") : t("amCreateAccount")}</button>
                  <button type="button" onClick={() => { setShowAddForm(false); setError(""); }} style={{ ...primaryBtnStyle, background: THEME.surface2, color: THEME.text2 }}>{t("commonCancel")}</button>
                </div>
              </div>
            )}
            {!showAddForm && (
              <button type="button" onClick={() => { setShowAddForm(true); setHseForm(EMPTY_HSE_FORM); setError(""); }} style={{ ...primaryBtnStyle, display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
                <UserPlus size={13} /> {t("saAddHsePersonToProject")}
              </button>
            )}

            {activeExperts.length > 0 && (
              <div style={{ marginTop: 14, paddingTop: 10, borderTop: `1px solid ${THEME.border}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: THEME.text3, marginBottom: 6 }}>{t("pwsActiveExpertsTitle")}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {activeExperts.map((e) => (
                    <span key={e.id} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 999, background: THEME.surface2, color: THEME.text2 }}>{e.name}</span>
                  ))}
                </div>
              </div>
            )}
          </Section>

          <Section icon={<ClipboardList size={14} color={THEME.teal} />} title={t("pwsTasksTitle")}>
            {tasks.length === 0 ? (
              <p style={{ fontSize: 11.5, color: THEME.text3 }}>{t("pwsNoTasks")}</p>
            ) : (
              tasks.map((a) => (
                <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, borderInlineStart: `3px solid ${isOverdue(a) ? THEME.danger : THEME.border}`, background: THEME.bg || THEME.surface2, borderRadius: 8, padding: "8px 10px", marginBottom: 6, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: THEME.heading }}>{a.actionNumber ? `${a.actionNumber} — ` : ""}{(a.nonconformanceDescription || a.actionDescription || "—").slice(0, 80)}</div>
                    {a.dueDate && <div style={{ fontSize: 10.5, color: THEME.text3, marginTop: 2 }}>{t("maapDueLabel")} {toJalaliSafe(a.dueDate)}</div>}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: STATUS_META[a.status]?.bg, color: STATUS_META[a.status]?.color }}>
                    {t(STATUS_META[a.status]?.labelKey || "caStatusOpen")}
                  </span>
                </div>
              ))
            )}
          </Section>
        </>
      )}
    </div>
  );
}
