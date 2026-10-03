import React, { useState, useEffect } from "react";
import { ShieldCheck, AlertTriangle, ClipboardList, FileSpreadsheet, CalendarClock, AlertOctagon, ChevronDown, ChevronUp } from "lucide-react";
import { THEME } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { loadGuestAuditorSummary, loadGuestAuditorList } from "./guestAuditorApi.js";
import { toJalaliSafe } from "../personnel/jalaliDate.jsx";

const STAT_META = {
  openAnomaliesCount: { icon: AlertTriangle, labelKey: "smFieldOpenAnomalies", color: THEME.warn },
  overdueCorrectiveActionsCount: { icon: ClipboardList, labelKey: "smFieldOverdueActions", color: THEME.danger },
  activePermitsCount: { icon: FileSpreadsheet, labelKey: "smFieldActivePermits", color: THEME.ok },
  daysSinceLastIncident: { icon: CalendarClock, labelKey: "smFieldDaysSinceIncident", color: THEME.heading },
};
const STAT_ORDER = ["daysSinceLastIncident", "openAnomaliesCount", "overdueCorrectiveActionsCount", "activePermitsCount"];

const LISTS = [
  { key: "openCorrectiveActions", labelKey: "gaListOpenActions", icon: ClipboardList },
  { key: "activePermits", labelKey: "gaListActivePermits", icon: FileSpreadsheet },
  { key: "recentAnomalies", labelKey: "gaListRecentAnomalies", icon: AlertOctagon },
];

function GuestListRow({ listKey, row, t }) {
  const rowStyle = { display: "flex", justifyContent: "space-between", gap: 8, fontSize: 11.5, color: THEME.heading, borderTop: `1px solid ${THEME.border}`, padding: "7px 0" };
  if (listKey === "openCorrectiveActions") {
    return (
      <div style={rowStyle}>
        <span style={{ direction: "ltr" }}>{row.action_number}</span>
        <span style={{ color: THEME.text3 }}>{toJalaliSafe(row.due_date)} · {row.priority}</span>
      </div>
    );
  }
  if (listKey === "activePermits") {
    return (
      <div style={rowStyle}>
        <span>{row.title}</span>
        <span style={{ color: THEME.text3 }}>{toJalaliSafe(row.valid_until)}</span>
      </div>
    );
  }
  return (
    <div style={rowStyle}>
      <span>{row.area} — {row.risk_level}</span>
      <span style={{ color: THEME.text3 }}>{toJalaliSafe(row.created_at)}</span>
    </div>
  );
}

// نمایِ عمومیِ «بازرسِ مهمان» — با لینکِ صادرشده باز می‌شود
// (#guest-auditor/<token> در App.jsx). فقط چندتا کارتِ آماری + چند فهرستِ
// فقط‌خواندنیِ تاشونده؛ هیچ لینکی به بقیه‌یِ اپ، هیچ امکانِ ویرایش.
export default function PublicGuestAuditorView({ guestToken }) {
  const { t, dir } = useLanguage();
  const [summary, setSummary] = useState(undefined);
  const [openList, setOpenList] = useState("");
  const [listData, setListData] = useState({});
  const [listLoading, setListLoading] = useState("");

  useEffect(() => { loadGuestAuditorSummary(guestToken).then(setSummary); }, [guestToken]);

  const toggleList = async (key) => {
    if (openList === key) { setOpenList(""); return; }
    setOpenList(key);
    if (!listData[key]) {
      setListLoading(key);
      const res = await loadGuestAuditorList(guestToken, key);
      setListLoading("");
      setListData((prev) => ({ ...prev, [key]: res.__error ? [] : (res.rows || []) }));
    }
  };

  const stats = summary && !summary.__error ? STAT_ORDER.filter((k) => summary[k] !== undefined) : [];

  return (
    <div style={{ minHeight: "100vh", background: THEME.bg, padding: "32px 16px", fontFamily: THEME.font }} dir={dir}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        {summary === undefined ? (
          <p style={{ color: THEME.text3, fontSize: 13, textAlign: "center", padding: 40 }}>{t("commonLoading")}</p>
        ) : summary.__error ? (
          <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 14, padding: 28, textAlign: "center" }}>
            <AlertTriangle size={30} color={THEME.danger} style={{ marginBottom: 10 }} />
            <p style={{ color: THEME.danger, fontSize: 13, fontWeight: 600 }}>{summary.message}</p>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center", marginBottom: 6 }}>
              <ShieldCheck size={24} color={THEME.ok} />
              <h1 style={{ fontSize: 17, fontWeight: 800, color: THEME.heading, margin: 0 }}>{t("gaPublicTitle")}</h1>
            </div>
            {summary.label && <p style={{ fontSize: 12, color: THEME.text3, textAlign: "center", marginBottom: 20 }}>{summary.label}</p>}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(200px, 100%), 1fr))", gap: 12, marginBottom: 20 }}>
              {stats.map((key) => {
                const meta = STAT_META[key];
                const Icon = meta.icon;
                const value = summary[key];
                const display = key === "daysSinceLastIncident"
                  ? (value === null ? t("smNoIncidentsYet") : t("smDaysValue", { days: value }))
                  : String(value);
                return (
                  <div key={key} style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 12, padding: 16, textAlign: "center" }}>
                    <Icon size={20} color={meta.color} style={{ marginBottom: 6 }} />
                    <div style={{ fontSize: key === "daysSinceLastIncident" && value === null ? 13 : 21, fontWeight: 800, color: THEME.heading }}>{display}</div>
                    <div style={{ fontSize: 11, color: THEME.text3, marginTop: 4 }}>{t(meta.labelKey)}</div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {LISTS.map((l) => {
                const Icon = l.icon;
                const isOpen = openList === l.key;
                return (
                  <div key={l.key} style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 10, overflow: "hidden" }}>
                    <button
                      onClick={() => toggleList(l.key)}
                      style={{ width: "100%", padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, color: THEME.heading }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: 8 }}><Icon size={15} /> {t(l.labelKey)}</span>
                      {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>
                    {isOpen && (
                      <div style={{ padding: "0 14px 14px" }}>
                        {listLoading === l.key ? (
                          <p style={{ fontSize: 11.5, color: THEME.text3 }}>{t("commonLoading")}</p>
                        ) : !listData[l.key] || listData[l.key].length === 0 ? (
                          <p style={{ fontSize: 11.5, color: THEME.text3 }}>{t("gaListEmpty")}</p>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            {listData[l.key].map((row, idx) => <GuestListRow key={idx} listKey={l.key} row={row} t={t} />)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
