import React, { useState, useEffect } from "react";
import { ChevronRight, Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { styles, THEME } from "../shared.js";
import { arrMove } from "../permit/permitModel.js";
import { loadCurrentChecklists, createChecklistVersion } from "./pssrApi.js";
import { disciplineLabel } from "./pssrModel.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";

const inputStyle = styles.input;

function toDraft(requirements) {
  return requirements.map((r) => ({
    reqNo: r.reqNo, groupTitle: r.groupTitle, requirementText: r.requirementText,
    groupTitleFa: r.groupTitleFa, requirementTextFa: r.requirementTextFa,
  }));
}

/**
 * مدیریتِ چک‌لیست‌های مرجعِ PSSR — فقط سرپرستِ HSEِ کارفرما. ویرایش هرگز
 * نگارشِ فعلی را دستکاری نمی‌کند؛ ذخیره یک نگارشِ کاملاً جدید می‌سازد
 * (createChecklistVersion در pssrApi.js) تا سوابقِ PSSRهای قبلی که به
 * Requirementهای نگارشِ قبلی وصل‌اند، دست‌نخورده بمانند.
 */
export default function PSSRChecklistAdmin({ currentUser, onBack }) {
  const { t, dir } = useLanguage();
  const [checklists, setChecklists] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const load = async () => {
    const cl = await loadCurrentChecklists();
    setChecklists(cl);
    return cl;
  };
  useEffect(() => { load(); }, []);

  const selected = (checklists || []).find((c) => c.id === selectedId) || null;
  const baseline = selected ? toDraft(selected.requirements) : [];
  const isDirty = JSON.stringify(draft) !== JSON.stringify(baseline);

  const selectChecklist = (c) => {
    setSelectedId(c.id);
    setDraft(toDraft(c.requirements));
    setMsg(""); setErr("");
  };

  const setRow = (i, patch) => setDraft((d) => d.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const removeRow = (i) => setDraft((d) => d.filter((_, idx) => idx !== i));
  const moveRow = (i, dir2) => setDraft((d) => arrMove(d, i, dir2));
  const addRow = () => setDraft((d) => [...d, {
    reqNo: "", groupTitle: d.length > 0 ? d[d.length - 1].groupTitle : "", requirementText: "",
    groupTitleFa: d.length > 0 ? d[d.length - 1].groupTitleFa : "", requirementTextFa: "",
  }]);

  const handleSave = async () => {
    if (draft.some((r) => !r.requirementText.trim())) { setErr(t("pssrErrRequirementTextRequired")); return; }
    setSaving(true); setErr(""); setMsg("");
    const res = await createChecklistVersion(selected.id, draft, currentUser?.name);
    setSaving(false);
    if (res?.__error) { setErr(res.message); return; }
    const cl = await load();
    const updated = cl.find((c) => c.code === selected.code);
    if (updated) selectChecklist(updated);
    setMsg(t("pssrVersionSaved", { version: res.version }));
  };

  if (checklists === null) return <p style={{ color: THEME.text3, fontSize: 13 }}>{t("pssrLoading")}</p>;

  return (
    <div>
      <div onClick={onBack} style={{ cursor: "pointer", color: THEME.text3, marginBottom: 12, fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
        <ChevronRight size={14} style={{ transform: dir === "rtl" ? "none" : "rotate(180deg)" }} /> {t("pssrBackToList")}
      </div>
      <h3 style={{ fontSize: 15, color: THEME.heading, fontWeight: 800, margin: "0 0 4px" }}>{t("pssrChecklistAdminTitle")}</h3>
      <p style={{ fontSize: 11.5, color: THEME.text3, margin: "0 0 16px", lineHeight: 1.8 }}>{t("pssrChecklistAdminNote")}</p>

      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 14, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {checklists.map((c) => (
            <div key={c.id} onClick={() => selectChecklist(c)}
              style={{ border: `1px solid ${selectedId === c.id ? THEME.teal : THEME.border}`, background: selectedId === c.id ? THEME.tealSoft : THEME.surface, borderRadius: 10, padding: "9px 11px", cursor: "pointer" }}>
              <div style={{ fontSize: 12.5, fontWeight: 700 }}>{disciplineLabel(c.discipline, t)}</div>
              <div style={{ fontSize: 10.5, color: THEME.text3, marginTop: 2 }}>{t("pssrVersionLabel", { version: c.version })} · {c.requirements.length} {t("pssrItemsCount")}</div>
            </div>
          ))}
        </div>

        {!selected && <p style={{ fontSize: 12.5, color: THEME.text3 }}>{t("pssrPickChecklistHint")}</p>}

        {selected && (
          <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 14, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${THEME.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <b style={{ fontSize: 13.5 }}>{disciplineLabel(selected.discipline, t)} — {t("pssrVersionLabel", { version: selected.version })}</b>
              <button type="button" onClick={addRow} style={{ ...styles.smallButton, display: "flex", alignItems: "center", gap: 5 }}>
                <Plus size={13} /> {t("pssrAddRequirement")}
              </button>
            </div>

            <div>
              {draft.map((r, i) => (
                <div key={i} style={{ padding: "10px 16px", borderBottom: `1px solid ${THEME.borderSoft}`, display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input style={{ ...inputStyle, width: 56, flex: "none" }} value={r.reqNo} onChange={(e) => setRow(i, { reqNo: e.target.value })} dir="ltr" placeholder="#" />
                      <input style={{ ...inputStyle, flex: 1 }} value={r.groupTitle || ""} onChange={(e) => setRow(i, { groupTitle: e.target.value })} dir="ltr" placeholder={t("pssrGroupTitle")} />
                      <input style={{ ...inputStyle, flex: 1 }} value={r.groupTitleFa || ""} onChange={(e) => setRow(i, { groupTitleFa: e.target.value })} dir="rtl" placeholder={t("pssrGroupTitleFa")} />
                    </div>
                    <textarea style={{ ...inputStyle, minHeight: 40, resize: "vertical" }} value={r.requirementText} onChange={(e) => setRow(i, { requirementText: e.target.value })} dir="ltr" placeholder={t("pssrRequirementTextEn")} />
                    <textarea style={{ ...inputStyle, minHeight: 40, resize: "vertical" }} value={r.requirementTextFa || ""} onChange={(e) => setRow(i, { requirementTextFa: e.target.value })} dir="rtl" placeholder={t("pssrRequirementTextFaHint")} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <button type="button" onClick={() => moveRow(i, -1)} disabled={i === 0} style={iconBtn}><ArrowUp size={12} /></button>
                    <button type="button" onClick={() => moveRow(i, 1)} disabled={i === draft.length - 1} style={iconBtn}><ArrowDown size={12} /></button>
                    <button type="button" onClick={() => removeRow(i)} style={{ ...iconBtn, color: THEME.danger }}><Trash2 size={12} /></button>
                  </div>
                </div>
              ))}
              {draft.length === 0 && <p style={{ padding: 16, fontSize: 12, color: THEME.text3 }}>{t("pssrNoRequirementsYet")}</p>}
            </div>

            <div style={{ padding: "12px 16px", borderTop: `1px solid ${THEME.border}`, background: THEME.surface2, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11.5, color: err ? THEME.danger : THEME.ok }}>{err || msg}</span>
              <button type="button" style={{ ...styles.smallButton, opacity: isDirty ? 1 : 0.5 }} disabled={saving || !isDirty} onClick={handleSave}>
                {saving ? t("pssrSaving") : t("pssrSaveAsNewVersion")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const iconBtn = { display: "flex", alignItems: "center", justifyContent: "center", width: 24, height: 22, border: `1px solid ${THEME.border}`, background: THEME.surface, borderRadius: 6, cursor: "pointer", color: THEME.text2 };
