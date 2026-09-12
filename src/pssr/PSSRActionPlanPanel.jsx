import React, { useState, useMemo } from "react";
import { styles, THEME } from "../shared.js";
import { toJalaliSafe } from "../personnel/jalaliDate.jsx";
import { PSSR_DISCIPLINES, CAT_TYPES, ACTION_STATUS_META, disciplineLabel, catLabel } from "./pssrModel.js";
import { StatusBadge } from "./pssrUi.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";

export default function PSSRActionPlanPanel({ actionItems }) {
  const { t } = useLanguage();
  const [fCat, setFCat] = useState("");
  const [fDiscipline, setFDiscipline] = useState("");
  const [fStatus, setFStatus] = useState("");

  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = (a) => a.status !== "closed" && a.dueDate && a.dueDate < today;

  const filtered = useMemo(() => actionItems.filter((a) =>
    (!fCat || a.cat === fCat) && (!fDiscipline || a.discipline === fDiscipline) && (!fStatus || a.status === fStatus)
  ), [actionItems, fCat, fDiscipline, fStatus]);

  const counts = {
    open: actionItems.filter((a) => a.status === "open").length,
    in_progress: actionItems.filter((a) => a.status === "in_progress").length,
    closed: actionItems.filter((a) => a.status === "closed").length,
    overdue: actionItems.filter(isOverdue).length,
    catA: actionItems.filter((a) => a.cat === "CAT_A" && a.status !== "closed").length,
    catB: actionItems.filter((a) => a.cat === "CAT_B" && a.status !== "closed").length,
  };

  return (
    <div>
      <div style={styles.statsRow}>
        <div style={styles.statBox}><div style={{ ...styles.statNum, color: THEME.warn }}>{counts.open}</div><div style={styles.statLabel}>{t("pssrActionOpen")}</div></div>
        <div style={styles.statBox}><div style={{ ...styles.statNum, color: THEME.teal }}>{counts.in_progress}</div><div style={styles.statLabel}>{t("pssrActionInProgress")}</div></div>
        <div style={styles.statBox}><div style={{ ...styles.statNum, color: THEME.ok }}>{counts.closed}</div><div style={styles.statLabel}>{t("pssrActionClosed")}</div></div>
        <div style={styles.statBox}><div style={{ ...styles.statNum, color: THEME.danger }}>{counts.overdue}</div><div style={styles.statLabel}>{t("pssrOverdue")}</div></div>
        <div style={styles.statBox}><div style={{ ...styles.statNum, color: THEME.danger }}>{counts.catA}</div><div style={styles.statLabel}>{t("pssrCatAOpen")}</div></div>
        <div style={styles.statBox}><div style={{ ...styles.statNum, color: THEME.warn }}>{counts.catB}</div><div style={styles.statLabel}>{t("pssrCatBOpen")}</div></div>
      </div>

      <div style={styles.filterBar}>
        <select style={styles.filterSelect} value={fCat} onChange={(e) => setFCat(e.target.value)}>
          <option value="">{t("pssrFilterAllCat")}</option>
          {CAT_TYPES.map((c) => <option key={c.value} value={c.value}>{t(c.labelKey)}</option>)}
        </select>
        <select style={styles.filterSelect} value={fDiscipline} onChange={(e) => setFDiscipline(e.target.value)}>
          <option value="">{t("pssrFilterAllDiscipline")}</option>
          {PSSR_DISCIPLINES.filter((d) => d.hasChecklist).map((d) => <option key={d.value} value={d.value}>{disciplineLabel(d.value, t)}</option>)}
        </select>
        <select style={styles.filterSelect} value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
          <option value="">{t("pssrFilterAllStatus")}</option>
          <option value="open">{t("pssrActionOpen")}</option>
          <option value="in_progress">{t("pssrActionInProgress")}</option>
          <option value="closed">{t("pssrActionClosed")}</option>
        </select>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
        {filtered.length === 0 && <p style={{ color: THEME.text3, fontSize: 13 }}>{t("pssrNoActions")}</p>}
        {filtered.map((a) => {
          const meta = ACTION_STATUS_META[a.status] || ACTION_STATUS_META.open;
          const overdue = isOverdue(a);
          return (
            <div key={a.id} style={{ background: THEME.surface, border: `1px solid ${overdue ? THEME.danger : THEME.border}`, borderRadius: 14, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <StatusBadge tone="gray">{disciplineLabel(a.discipline, t)}</StatusBadge>
                  {a.cat && <StatusBadge tone={CAT_TYPES.find((c) => c.value === a.cat)?.tone}>{catLabel(a.cat, t)}</StatusBadge>}
                  <StatusBadge tone={meta.tone}>{t(meta.key)}</StatusBadge>
                  {overdue && <StatusBadge tone="danger">{t("pssrOverdue")}</StatusBadge>}
                </div>
                <span style={{ fontSize: 11, color: THEME.text3 }} dir="ltr">Req #{a.reqNo}</span>
              </div>
              <div style={{ fontSize: 12.5 }} dir="ltr">{a.requirementText}</div>
              {a.actionComment && <div style={{ fontSize: 11.5, color: THEME.text2 }}>{a.actionComment}</div>}
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 11, color: THEME.text2 }}>
                <span>{t("pssrResponsible")}: <b style={{ color: THEME.text }}>{a.responsibleName || "—"}</b></span>
                <span>{t("pssrDeadline")}: <b dir="ltr" style={{ color: THEME.text }}>{toJalaliSafe(a.dueDate) || "—"}</b></span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
