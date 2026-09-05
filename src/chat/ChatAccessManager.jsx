import React, { useState, useEffect } from "react";
import { ShieldOff, X, Plus } from "lucide-react";
import { styles, THEME } from "../shared.js";
import { loadActiveJobPositions } from "../jobpositions/jobPositionsApi.js";
import {
  loadVisibilityRules, setVisibilityRule, loadUsedJobPositionsByRole,
  loadExtraIdentities, addExtraIdentity, removeExtraIdentity,
} from "./chatApi.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";

const ROLE_LABEL_KEY = { ADMIN: "roleLabelAdmin", EMPLOYER: "roleLabelEmployer", CONTRACTOR: "roleLabelContractor" };

// ادمین معمولاً عنوان شغلی مشخصی ندارد، برای همین هویتش یک ردیف/ستون ثابت
// در ماتریس است (jobPositionId=null)، نه چیزی که از «مدیریت عناوین شغلی» بیاید.
const ADMIN_IDENTITY_TITLE_KEY = "camAdminIdentityLabel";

/**
 * "مدیریت دسترسی چت" — ماتریس (نقش + عنوان‌شغلی) × (نقش + عنوان‌شغلی).
 *
 * چرا نقش هم بخشی از هویته، نه فقط عنوان شغلی: یک عنوان شغلی مثل «سرپرست
 * کارگاه» می‌تواند هم سمت کارفرما هم سمت پیمانکار استفاده شود — این دو نفر
 * باید بتوانند مستقل از هم بلاک شوند.
 *
 * لیست پایه‌ی ماتریس، «ادمین» (همیشه ثابت) + عناوینی است که واقعاً حساب
 * واقعی با آن نقش دارند — اما چون گاهی لازم است عنوانی را زودتر از ساختن
 * حساب واقعی‌اش در ماتریس تنظیم کرد، امکان «افزودن دستی» هم هست (جدول
 * chat_matrix_extra_identities).
 *
 * برخلاف نسخه‌ی قبلی، ادمین دیگر از بلاک‌شدن معاف نیست — اگر خانه‌ی
 * تلاقی «ادمین» با یک (نقش+عنوان شغلی) خاص بلاک شود، آن افراد در «گفتگوی
 * جدید» ادمین را نمی‌بینند و برعکس.
 */
export default function ChatAccessManager({ onBack }) {
  const { t, dir } = useLanguage();
  const ADMIN_IDENTITY = { role: "ADMIN", jobPositionId: null, title: t(ADMIN_IDENTITY_TITLE_KEY) };
  const [positions, setPositions] = useState([]);
  const [rules, setRules] = useState([]); // آخرین نسخه‌ی واقعاً ذخیره‌شده در دیتابیس
  const [draftRules, setDraftRules] = useState([]); // پیش‌نویس محلی — کاربر هرچقدر بخواهد خانه کلیک می‌کند، بدون Write
  const [saving, setSaving] = useState(false);
  const [usedByRole, setUsedByRole] = useState({ employerJobPositionIds: new Set(), contractorJobPositionIds: new Set() });
  const [extraIdentities, setExtraIdentities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addPositionId, setAddPositionId] = useState("");
  const [addRole, setAddRole] = useState("EMPLOYER");

  const load = async () => {
    const [p, r, used, extra] = await Promise.all([loadActiveJobPositions(), loadVisibilityRules(), loadUsedJobPositionsByRole(), loadExtraIdentities()]);
    setPositions(p);
    setRules(r);
    setDraftRules(r);
    setUsedByRole(used);
    setExtraIdentities(extra);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  // پایه: «ادمین» (ثابت) + عناوینی که واقعاً حساب دارند + عناوینی که دستی اضافه شده‌اند
  const identities = [];
  const seen = new Set();
  const addIdentity = (role, jobPositionId, title) => {
    const key = `${role}-${jobPositionId}`;
    if (seen.has(key)) return;
    seen.add(key);
    identities.push({ role, jobPositionId, title });
  };
  addIdentity(ADMIN_IDENTITY.role, ADMIN_IDENTITY.jobPositionId, ADMIN_IDENTITY.title);
  positions.forEach((p) => {
    if (usedByRole.employerJobPositionIds.has(p.id)) addIdentity("EMPLOYER", p.id, p.title);
    if (usedByRole.contractorJobPositionIds.has(p.id)) addIdentity("CONTRACTOR", p.id, p.title);
  });
  extraIdentities.forEach((e) => {
    const pos = positions.find((p) => p.id === e.jobPositionId);
    if (pos) addIdentity(e.role, e.jobPositionId, pos.title);
  });

  const sameIdentity = (a, b) => a.role === b.role && a.jobPositionId === b.jobPositionId;

  const isBlockedIn = (list, a, b) => list.some((r) =>
    (r.roleA === a.role && r.jobPositionIdA === a.jobPositionId && r.roleB === b.role && r.jobPositionIdB === b.jobPositionId) ||
    (r.roleA === b.role && r.jobPositionIdA === b.jobPositionId && r.roleB === a.role && r.jobPositionIdB === a.jobPositionId)
  );
  const isBlocked = (a, b) => isBlockedIn(draftRules, a, b);

  // استاندارد سراسری ذخیره‌سازی: کلیک روی خانه‌ی ماتریس فقط پیش‌نویس محلی
  // را عوض می‌کند — کاربر می‌تواند چند خانه را جابه‌جا کند و فقط با کلیک
  // روی «ثبت تغییرات» همه‌ی تفاوت‌ها یک‌جا ذخیره می‌شوند
  const toggleCell = (a, b) => {
    const currentlyBlocked = isBlockedIn(draftRules, a, b);
    setDraftRules((prev) => (currentlyBlocked
      ? prev.filter((r) => !(
          (r.roleA === a.role && r.jobPositionIdA === a.jobPositionId && r.roleB === b.role && r.jobPositionIdB === b.jobPositionId) ||
          (r.roleA === b.role && r.jobPositionIdA === b.jobPositionId && r.roleB === a.role && r.jobPositionIdB === a.jobPositionId)
        ))
      : [...prev, { roleA: a.role, jobPositionIdA: a.jobPositionId, roleB: b.role, jobPositionIdB: b.jobPositionId }]));
  };

  const changedPairs = () => {
    const pairs = [];
    for (let i = 0; i < identities.length; i++) {
      for (let j = i + 1; j < identities.length; j++) {
        const a = identities[i], b = identities[j];
        const before = isBlockedIn(rules, a, b);
        const after = isBlockedIn(draftRules, a, b);
        if (before !== after) pairs.push({ a, b, blocked: after });
      }
    }
    return pairs;
  };
  const isDirty = changedPairs().length > 0;

  const handleSaveAll = async () => {
    setSaving(true);
    const results = await Promise.all(changedPairs().map((p) => setVisibilityRule(p.a.role, p.a.jobPositionId, p.b.role, p.b.jobPositionId, p.blocked)));
    setSaving(false);
    if (results.some((r) => r?.__error)) alert(t("errSaveSomeRules"));
    await load();
  };

  const handleAddIdentity = async () => {
    if (!addPositionId) return;
    const result = await addExtraIdentity(addPositionId, addRole);
    if (result?.__error) { alert(result.message); return; }
    setAddPositionId("");
    setShowAdd(false);
    await load();
  };

  const handleRemoveExtra = async (jobPositionId, role) => {
    if (!confirm(t("confirmRemoveFromMatrix"))) return;
    await removeExtraIdentity(jobPositionId, role);
    await load();
  };

  // آیا این هویت جزو «دستی‌اضافه‌شده»هاست (نه خودکار از روی حساب واقعی، نه خودِ ادمین)؟
  const isExtra = (id) => id.role !== "ADMIN" && extraIdentities.some((e) => e.jobPositionId === id.jobPositionId && e.role === id.role)
    && !((id.role === "EMPLOYER" && usedByRole.employerJobPositionIds.has(id.jobPositionId)) || (id.role === "CONTRACTOR" && usedByRole.contractorJobPositionIds.has(id.jobPositionId)));

  if (loading) return <div style={{ padding: 24, textAlign: "center", color: THEME.text3 }}>{t("commonLoading")}</div>;

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: 24, direction: dir }}>
      {onBack && <div style={styles.backLink} onClick={onBack}>{t("rkBackToSystemManagement")}</div>}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <ShieldOff size={20} color={THEME.teal} />
          <h2 style={{ margin: 0, fontSize: 19, color: THEME.navy, fontWeight: 700 }}>{t("camTitle")}</h2>
        </div>
        <button type="button" style={{ ...styles.smallButton, display: "flex", alignItems: "center", gap: 6 }} onClick={() => setShowAdd((v) => !v)}>
          <Plus size={14} /> {t("camAddTitleToMatrix")}
        </button>
      </div>
      <p style={{ color: THEME.text3, fontSize: 12.5, marginBottom: 14 }}>
        {t("camDesc")}
      </p>

      {showAdd && (
        <div style={{ ...styles.card, width: "auto", marginBottom: 16, display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label style={styles.label}>{t("camJobTitle")}</label>
            <select style={styles.input} value={addPositionId} onChange={(e) => setAddPositionId(e.target.value)} dir={dir}>
              <option value="">{t("fieldSelectPlaceholder")}</option>
              {positions.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>
          <div>
            <label style={styles.label}>{t("camPosition")}</label>
            <select style={styles.input} value={addRole} onChange={(e) => setAddRole(e.target.value)} dir={dir}>
              <option value="EMPLOYER">{t("roleLabelEmployer")}</option>
              <option value="CONTRACTOR">{t("roleLabelContractor")}</option>
            </select>
          </div>
          <button type="button" style={styles.button} onClick={handleAddIdentity} disabled={!addPositionId}>{t("commonAdd")}</button>
        </div>
      )}

      {identities.length < 2 && (
        <p style={{ color: THEME.text3, fontSize: 12.5 }}>{t("camNeedsTwoEntries")}</p>
      )}

      {identities.length >= 2 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", fontSize: 11, minWidth: "100%" }}>
            <thead>
              <tr>
                <th style={{ position: "sticky", insetInlineStart: 0, background: THEME.surface, padding: "6px 10px", textAlign: dir === "rtl" ? "right" : "left", borderBottom: `1.5px solid ${THEME.border}`, whiteSpace: "nowrap" }} />
                {identities.map((id) => (
                  <th key={`${id.role}-${id.jobPositionId}`} style={{ padding: "6px 8px", borderBottom: `1.5px solid ${THEME.border}`, minWidth: 70 }}>
                    <div style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", fontSize: 10, color: THEME.text2, whiteSpace: "nowrap", margin: "0 auto", height: 110 }}>
                      {id.title} {id.role !== "ADMIN" ? `(${t(ROLE_LABEL_KEY[id.role])})` : ""}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {identities.map((rowId) => (
                <tr key={`${rowId.role}-${rowId.jobPositionId}`} style={{ borderBottom: `1px solid ${THEME.border}` }}>
                  <td style={{ position: "sticky", insetInlineStart: 0, background: THEME.surface, padding: "6px 10px", fontWeight: 600, whiteSpace: "nowrap" }}>
                    {rowId.title} {rowId.role !== "ADMIN" ? `(${t(ROLE_LABEL_KEY[rowId.role])})` : ""}
                    {isExtra(rowId) && (
                      <button type="button" onClick={() => handleRemoveExtra(rowId.jobPositionId, rowId.role)} title={t("camRemoveFromMatrix")} style={{ background: "none", border: "none", cursor: "pointer", marginRight: 6, color: THEME.text3 }}>
                        <X size={11} />
                      </button>
                    )}
                  </td>
                  {identities.map((colId) => {
                    if (sameIdentity(rowId, colId)) {
                      return <td key={`${colId.role}-${colId.jobPositionId}`} style={{ padding: 2, textAlign: "center", background: "#f4f6f8" }} />;
                    }
                    const blocked = isBlocked(rowId, colId);
                    const pending = isBlockedIn(rules, rowId, colId) !== blocked;
                    return (
                      <td key={`${colId.role}-${colId.jobPositionId}`} style={{ padding: 2, textAlign: "center" }}>
                        <div
                          onClick={() => toggleCell(rowId, colId)}
                          title={blocked ? t("camBlockedClickToUnblock") : t("camClickToBlock")}
                          style={{ width: 26, height: 26, margin: "0 auto", borderRadius: 5, cursor: "pointer", background: blocked ? THEME.danger : "#eef1f5", border: pending ? "2px solid #f59e0b" : `1px solid ${THEME.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}
                        >
                          {blocked && <X size={13} color="#fff" />}
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

      {isDirty && (
        <div style={{ position: "sticky", bottom: 10, display: "flex", alignItems: "center", gap: 8, background: "#fef3c7", border: "1px solid #f59e0b", borderRadius: 10, padding: "10px 14px", marginTop: 12 }}>
          <span style={{ fontSize: 11.5, color: "#92400e", fontWeight: 600, flex: 1 }}>{t("draftUnsavedCellsBar", { count: changedPairs().length })}</span>
          <button type="button" style={{ ...styles.smallButton, background: THEME.text3 }} onClick={() => setDraftRules(rules)} disabled={saving}>{t("commonCancel")}</button>
          <button type="button" style={styles.smallButton} onClick={handleSaveAll} disabled={saving}>{saving ? t("saSavingEllipsis") : t("draftCommitChanges")}</button>
        </div>
      )}
    </div>
  );
}
