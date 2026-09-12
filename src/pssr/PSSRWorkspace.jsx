import React, { useState, useEffect, useCallback } from "react";
import { ChevronRight } from "lucide-react";
import { THEME } from "../shared.js";
import { loadPssrById } from "./pssrApi.js";
import { loadTeamMembers } from "./pssrTeamApi.js";
import { loadMeetings, loadActionItems } from "./pssrMeetingsApi.js";
import { PSSR_STATUS_META } from "./pssrModel.js";
import { StatusBadge } from "./pssrUi.jsx";
import PSSRTeamPanel from "./PSSRTeamPanel.jsx";
import PSSRMeetingsPanel from "./PSSRMeetingsPanel.jsx";
import PSSRActionPlanPanel from "./PSSRActionPlanPanel.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";

export default function PSSRWorkspace({ pssrId, currentUser, role, readOnly, onBack }) {
  const { t, dir } = useLanguage();
  const [pssr, setPssr] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [actionItems, setActionItems] = useState([]);
  const [tab, setTab] = useState("team");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [p, tm, mt, ai] = await Promise.all([
      loadPssrById(pssrId), loadTeamMembers(pssrId), loadMeetings(pssrId), loadActionItems(pssrId),
    ]);
    setPssr(p); setTeamMembers(tm); setMeetings(mt); setActionItems(ai);
    setLoading(false);
  }, [pssrId]);

  useEffect(() => { refresh(); }, [refresh]);

  if (loading || !pssr) return <p style={{ color: THEME.text3, fontSize: 13 }}>{t("pssrLoading")}</p>;

  const meta = PSSR_STATUS_META[pssr.status] || PSSR_STATUS_META.draft;
  const openActions = actionItems.filter((a) => a.status !== "closed").length;

  const tabs = [
    { key: "team", label: t("pssrTabTeam"), count: teamMembers.length },
    { key: "meetings", label: t("pssrTabMeetings"), count: meetings.length },
    { key: "actionPlan", label: t("pssrTabActionPlan"), count: openActions },
  ];

  return (
    <div>
      <div onClick={onBack} style={{ cursor: "pointer", color: THEME.text3, marginBottom: 12, fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
        <ChevronRight size={14} style={{ transform: dir === "rtl" ? "none" : "rotate(180deg)" }} /> {t("pssrBackToList")}
      </div>

      <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 16, padding: "16px 18px", display: "flex", flexWrap: "wrap", gap: 18, alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 17, color: THEME.heading }}>{pssr.reportNo} <span style={{ color: THEME.text3, fontWeight: 600, fontSize: 13 }}>/ Rev {pssr.revisionNo}</span></div>
          <div style={{ fontSize: 12.5, color: THEME.text2, marginTop: 4 }}>{pssr.companyOrganization || "—"}</div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 18 }}>
          <MetaItem k={t("pssrUnitTrain")} v={pssr.unitTrain || "—"} />
          <MetaItem k={t("pssrSystemNo")} v={pssr.systemNo || "—"} />
          <MetaItem k={t("pssrTabMeetings")} v={meetings.length} />
          <MetaItem k={t("pssrOpenActions")} v={openActions} accent={openActions > 0} />
        </div>
        <StatusBadge tone={meta.tone}>{t(meta.key)}</StatusBadge>
      </div>

      <div style={{ display: "flex", gap: 6, borderBottom: `1px solid ${THEME.border}`, overflowX: "auto" }}>
        {tabs.map((tb) => (
          <div key={tb.key} onClick={() => setTab(tb.key)}
            style={{ padding: "10px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", color: tab === tb.key ? THEME.teal : THEME.text2, borderBottom: `2.5px solid ${tab === tb.key ? THEME.teal : "transparent"}` }}>
            {tb.label} {tb.count > 0 && <span style={{ marginInlineStart: 6, fontSize: 10.5, fontWeight: 800, background: THEME.surface2, color: THEME.text2, borderRadius: 999, padding: "1px 7px" }}>{tb.count}</span>}
          </div>
        ))}
      </div>

      <div style={{ paddingTop: 16 }}>
        {tab === "team" && <PSSRTeamPanel pssrId={pssrId} teamMembers={teamMembers} readOnly={readOnly} onChanged={refresh} />}
        {tab === "meetings" && (
          <PSSRMeetingsPanel pssrId={pssrId} meetings={meetings} teamMembers={teamMembers} actionItems={actionItems} currentUser={currentUser} role={role}
            readOnly={readOnly} onChanged={refresh} />
        )}
        {tab === "actionPlan" && <PSSRActionPlanPanel pssrId={pssrId} actionItems={actionItems} teamMembers={teamMembers} />}
      </div>
    </div>
  );
}

function MetaItem({ k, v, accent }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 90 }}>
      <span style={{ fontSize: 11, color: THEME.text3 }}>{k}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: accent ? THEME.warn : THEME.text }}>{v}</span>
    </div>
  );
}
