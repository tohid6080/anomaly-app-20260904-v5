import React, { useState, useEffect } from "react";
import BackLink from "../shared/BackLink.jsx";
import { Plus, Pencil, Power, Trash2, FolderKanban, BarChart3, Check, X } from "lucide-react";
import { styles, THEME } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import {
  loadProjects, createProject, renameProject, updateProjectProfile, setProjectActive, deleteProject,
  PROJECT_TEMPLATES,
} from "./projectsApi.js";
import ProjectWorkspace from "./ProjectWorkspace.jsx";
import ProjectComparison from "./ProjectComparison.jsx";

const EMPTY_FORM = { name: "", description: "", templateKey: "" };

const primaryBtnStyle = { border: "none", background: THEME.teal, color: "#06231f", borderRadius: 9, padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" };
const secondaryBtnStyle = { border: `1px solid ${THEME.border}`, background: "transparent", color: THEME.text2, borderRadius: 9, padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" };
const iconBtnStyle = { display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, border: "none", borderRadius: 7, background: THEME.surface2, color: THEME.text2, cursor: "pointer" };

// پنلِ خودسرویسِ سرپرست برایِ مدیریتِ پروژه‌هایِ شرکتِ «مستقل/چندپروژه» —
// همان جدولِ contractor_companies که تا امروز فقط SuperAdmin می‌دید
// (نگاه کن به projectsApi.js برایِ توضیحِ کامل). این کامپوننت ناوبریِ
// داخلیِ خودش را دارد (فهرست/Workspace یک پروژه/مقایسه) تا view-switch
// بزرگِ App.jsx فقط با یک کلید («projects») بزرگ‌تر شود.
export default function ProjectsDashboard({ onBack, currentUser, wide }) {
  const { t, dir } = useLanguage();
  const [subView, setSubView] = useState("list"); // list | workspace | comparison
  const [activeProject, setActiveProject] = useState(null);

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");

  const load = async () => {
    setLoading(true);
    setProjects(await loadProjects());
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.name.trim()) { setError(t("projErrNameRequired")); return; }
    setSaving(true);
    setError("");
    const result = await createProject(form);
    setSaving(false);
    if (result?.__error) { setError(result.message); return; }
    setForm(EMPTY_FORM);
    setShowForm(false);
    load();
  };

  const startRename = (p) => { setRenamingId(p.id); setRenameValue(p.name); };
  const commitRename = async (id) => {
    if (!renameValue.trim()) return;
    const result = await renameProject(id, renameValue);
    if (result?.__error) { alert(result.message); return; }
    setRenamingId(null);
    load();
  };

  const toggleActive = async (p) => {
    const result = await setProjectActive(p.id, !p.isActive);
    if (result?.__error) { alert(result.message); return; }
    load();
  };

  const handleDelete = async (p) => {
    if (!confirm(t("projDeleteConfirm", { name: p.name }))) return;
    const result = await deleteProject(p.id);
    if (result?.__error) { alert(result.message); return; }
    load();
  };

  const setTemplateFor = async (p, templateKey) => {
    const result = await updateProjectProfile(p.id, { templateKey });
    if (result?.__error) { alert(result.message); return; }
    load();
  };

  if (subView === "workspace" && activeProject) {
    return (
      <ProjectWorkspace
        project={activeProject}
        currentUser={currentUser}
        wide={wide}
        onBack={() => { setSubView("list"); load(); }}
      />
    );
  }
  if (subView === "comparison") {
    return <ProjectComparison projects={projects} wide={wide} onBack={() => setSubView("list")} />;
  }

  return (
    <div style={{ maxWidth: wide ? 980 : 720, margin: "0 auto", padding: 16 }} dir={dir}>
      <BackLink onClick={onBack}>{t("commonBack")}</BackLink>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, margin: "10px 0 16px" }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: THEME.heading, display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
          <FolderKanban size={18} color={THEME.teal} /> {t("projTitle")}
        </h2>
        <div style={{ display: "flex", gap: 8 }}>
          {projects.length > 0 && (
            <button type="button" onClick={() => setSubView("comparison")} style={{ ...secondaryBtnStyle, display: "flex", alignItems: "center", gap: 6 }}>
              <BarChart3 size={14} /> {t("projCompareBtn")}
            </button>
          )}
          <button type="button" onClick={() => setShowForm((v) => !v)} style={{ ...primaryBtnStyle, display: "flex", alignItems: "center", gap: 6 }}>
            <Plus size={14} /> {t("projAddBtn")}
          </button>
        </div>
      </div>

      {showForm && (
        <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 12, padding: 14, marginBottom: 16 }}>
          <input
            style={{ ...styles.input, marginBottom: 8 }} dir={dir} placeholder={t("projNamePlaceholder")}
            value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <textarea
            style={{ ...styles.input, marginBottom: 8, minHeight: 60, resize: "vertical" }} dir={dir} placeholder={t("projDescPlaceholder")}
            value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <select style={{ ...styles.input, marginBottom: 10 }} value={form.templateKey} onChange={(e) => setForm({ ...form, templateKey: e.target.value })}>
            <option value="">{t("projTemplateNone")}</option>
            {PROJECT_TEMPLATES.map((pt) => <option key={pt.key} value={pt.key}>{t(pt.labelKey)}</option>)}
          </select>
          {error && <p style={{ color: THEME.danger, fontSize: 12, marginBottom: 8 }}>{error}</p>}
          <button type="button" onClick={handleCreate} disabled={saving} style={primaryBtnStyle}>
            {saving ? t("commonSaving") : t("projCreateSubmit")}
          </button>
        </div>
      )}

      {loading ? (
        <p style={{ color: THEME.text3, fontSize: 12, textAlign: "center", padding: 24 }}>{t("commonLoading")}</p>
      ) : projects.length === 0 ? (
        <p style={{ color: THEME.text3, fontSize: 12, textAlign: "center", padding: 24 }}>{t("projEmptyList")}</p>
      ) : (
        projects.map((p) => (
          <div key={p.id} style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 12, padding: 14, marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {renamingId === p.id ? (
                <>
                  <input autoFocus style={{ ...styles.input, flex: 1, minWidth: 140 }} dir={dir} value={renameValue} onChange={(e) => setRenameValue(e.target.value)} />
                  <button type="button" onClick={() => commitRename(p.id)} style={{ ...iconBtnStyle, color: THEME.ok }} title={t("commonSave")}><Check size={14} /></button>
                  <button type="button" onClick={() => setRenamingId(null)} style={{ ...iconBtnStyle, color: THEME.text3 }} title={t("commonCancel")}><X size={14} /></button>
                </>
              ) : (
                <>
                  <span
                    style={{ fontWeight: 700, color: THEME.heading, fontSize: 14, cursor: "pointer" }}
                    onClick={() => { setActiveProject(p); setSubView("workspace"); }}
                  >
                    {p.name}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 999, background: p.isActive ? THEME.okBg : THEME.surface2, color: p.isActive ? THEME.ok : THEME.text3 }}>
                    {p.isActive ? t("commonActive") : t("commonInactive")}
                  </span>
                  <div style={{ marginInlineStart: "auto", display: "flex", gap: 4 }}>
                    <button type="button" onClick={() => startRename(p)} style={iconBtnStyle} title={t("projRenameTitle")}><Pencil size={13} /></button>
                    <button type="button" onClick={() => toggleActive(p)} style={{ ...iconBtnStyle, color: p.isActive ? THEME.danger : THEME.ok }} title={p.isActive ? t("amDeactivate") : t("amActivate")}><Power size={13} /></button>
                    <button type="button" onClick={() => handleDelete(p)} style={{ ...iconBtnStyle, color: THEME.danger }} title={t("commonDelete")}><Trash2 size={13} /></button>
                  </div>
                </>
              )}
            </div>
            {p.description && <p style={{ fontSize: 11.5, color: THEME.text3, margin: "6px 0 0" }}>{p.description}</p>}
            <div style={{ marginTop: 8 }}>
              <select
                style={{ ...styles.input, fontSize: 11, padding: "4px 8px", width: "auto" }}
                value={p.templateKey} onChange={(e) => setTemplateFor(p, e.target.value)}
              >
                <option value="">{t("projTemplateNone")}</option>
                {PROJECT_TEMPLATES.map((pt) => <option key={pt.key} value={pt.key}>{t(pt.labelKey)}</option>)}
              </select>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
