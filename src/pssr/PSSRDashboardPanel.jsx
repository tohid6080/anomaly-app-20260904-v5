import React, { useState, useEffect, useMemo } from "react";
import { styles, THEME } from "../shared.js";
import { toJalaliSafe } from "../personnel/jalaliDate.jsx";
import { loadCurrentChecklists } from "./pssrApi.js";
import { loadLatestResponsePerRequirement } from "./pssrMeetingsApi.js";
import { disciplineLabel } from "./pssrModel.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";

const DUE_SOON_DAYS = 3;

export default function PSSRDashboardPanel({ pssrId, meetings, actionItems }) {
  const { t } = useLanguage();
  const [checklists, setChecklists] = useState(null);
  const [latest, setLatest] = useState({});

  useEffect(() => {
    (async () => {
      setChecklists(await loadCurrentChecklists());
      setLatest(await loadLatestResponsePerRequirement(pssrId));
    })();
  }, [pssrId]);

  const today = new Date().toISOString().slice(0, 10);
  const dueSoonLimit = new Date(Date.now() + DUE_SOON_DAYS * 86400000).toISOString().slice(0, 10);

  const actionStats = useMemo(() => {
    const open = actionItems.filter((a) => a.status === "open").length;
    const inProgress = actionItems.filter((a) => a.status === "in_progress").length;
    const closed = actionItems.filter((a) => a.status === "closed").length;
    const overdue = actionItems.filter((a) => a.status !== "closed" && a.dueDate && a.dueDate < today).length;
    const dueSoon = actionItems.filter((a) => a.status !== "closed" && a.dueDate && a.dueDate >= today && a.dueDate <= dueSoonLimit).length;
    const catA = actionItems.filter((a) => a.status !== "closed" && a.cat === "CAT_A").length;
    const catB = actionItems.filter((a) => a.status !== "closed" && a.cat === "CAT_B").length;
    const catC = actionItems.filter((a) => a.status !== "closed" && a.cat === "CAT_C").length;
    return { open, inProgress, closed, overdue, dueSoon, catA, catB, catC };
  }, [actionItems, today, dueSoonLimit]);

  const totals = useMemo(() => {
    let total = 0, answered = 0, yes = 0, no = 0, na = 0;
    (checklists || []).forEach((c) => {
      total += c.requirements.length;
      c.requirements.forEach((r) => {
        const resp = latest[r.id];
        if (resp) {
          answered++;
          if (resp.status === "yes") yes++;
          else if (resp.status === "no") no++;
          else na++;
        }
      });
    });
    return { total, answered, yes, no, na };
  }, [checklists, latest]);

  if (checklists === null) return <p style={{ color: THEME.text3, fontSize: 13 }}>{t("pssrLoading")}</p>;

  return (
    <div>
      <div style={styles.statsRow}>
        <div style={styles.statBox}><div style={styles.statNum}>{meetings.length}</div><div style={styles.statLabel}>{t("pssrTabMeetings")}</div></div>
        <div style={styles.statBox}><div style={{ ...styles.statNum, color: THEME.ok }}>{totals.yes}</div><div style={styles.statLabel}>{t("pssrYes")}</div></div>
        <div style={styles.statBox}><div style={{ ...styles.statNum, color: THEME.danger }}>{totals.no}</div><div style={styles.statLabel}>{t("pssrNo")}</div></div>
        <div style={styles.statBox}><div style={{ ...styles.statNum, color: THEME.text3 }}>{totals.na}</div><div style={styles.statLabel}>{t("pssrNa")}</div></div>
        <div style={styles.statBox}><div style={styles.statNum}>{totals.answered}/{totals.total}</div><div style={styles.statLabel}>{t("pssrReviewProgress")}</div></div>
      </div>

      <div style={{ ...styles.statsRow, marginTop: 8 }}>
        <div style={styles.statBox}><div style={{ ...styles.statNum, color: THEME.warn }}>{actionStats.open}</div><div style={styles.statLabel}>{t("pssrActionOpen")}</div></div>
        <div style={styles.statBox}><div style={{ ...styles.statNum, color: THEME.teal }}>{actionStats.inProgress}</div><div style={styles.statLabel}>{t("pssrActionInProgress")}</div></div>
        <div style={styles.statBox}><div style={{ ...styles.statNum, color: THEME.ok }}>{actionStats.closed}</div><div style={styles.statLabel}>{t("pssrActionClosed")}</div></div>
        <div style={styles.statBox}><div style={{ ...styles.statNum, color: THEME.danger }}>{actionStats.overdue}</div><div style={styles.statLabel}>{t("pssrOverdue")}</div></div>
        <div style={styles.statBox}><div style={{ ...styles.statNum, color: THEME.warn }}>{actionStats.dueSoon}</div><div style={styles.statLabel}>{t("pssrDueSoon")}</div></div>
        <div style={styles.statBox}><div style={{ ...styles.statNum, color: THEME.danger }}>{actionStats.catA}</div><div style={styles.statLabel}>{t("pssrCatAOpen")}</div></div>
        <div style={styles.statBox}><div style={{ ...styles.statNum, color: THEME.warn }}>{actionStats.catB}</div><div style={styles.statLabel}>{t("pssrCatBOpen")}</div></div>
        <div style={styles.statBox}><div style={{ ...styles.statNum, color: THEME.teal }}>{actionStats.catC}</div><div style={styles.statLabel}>{t("pssrCatCOpen")}</div></div>
      </div>

      <b style={{ fontSize: 12.5, color: THEME.heading, display: "block", marginTop: 20, marginBottom: 10 }}>{t("pssrDisciplineStatus")}</b>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {(checklists || []).map((c) => {
          let yes = 0, no = 0, na = 0;
          c.requirements.forEach((r) => {
            const resp = latest[r.id];
            if (resp) { if (resp.status === "yes") yes++; else if (resp.status === "no") no++; else na++; }
          });
          const total = c.requirements.length;
          const answered = yes + no + na;
          const pct = (n) => (total > 0 ? (n / total) * 100 : 0);
          return (
            <div key={c.id} style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                <span>{disciplineLabel(c.discipline, t)}</span>
                <span style={{ color: THEME.text3, fontWeight: 600 }}>{answered}/{total}</span>
              </div>
              <div style={{ display: "flex", height: 8, borderRadius: 999, overflow: "hidden", background: THEME.surface2 }}>
                <div style={{ width: `${pct(yes)}%`, background: THEME.ok }} />
                <div style={{ width: `${pct(no)}%`, background: THEME.danger }} />
                <div style={{ width: `${pct(na)}%`, background: THEME.text3 }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
