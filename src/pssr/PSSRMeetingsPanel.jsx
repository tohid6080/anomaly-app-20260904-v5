import React, { useState, useEffect, useRef } from "react";
import { Plus, History, Radio, X } from "lucide-react";
import { styles, THEME } from "../shared.js";
import { JalaliDateInput, toJalaliSafe } from "../personnel/jalaliDate.jsx";
import { loadCurrentChecklists, hasAnyChecklists, seedOfficialChecklists } from "./pssrApi.js";
import { createMeeting, loadLatestResponsePerRequirement, loadActionHistory, submitMeetingResponses } from "./pssrMeetingsApi.js";
import { disciplineLabel, catLabel, ACTION_STATUS_META } from "./pssrModel.js";
import { Field, YnaToggle, CatPicker, StatusBadge } from "./pssrUi.jsx";
import { createMeetingChannel, subscribeMeetingChannel, sendDraftChange, sendFloorControl, leaveMeetingChannel } from "./pssrRealtime.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";

const inputStyle = styles.input;

export default function PSSRMeetingsPanel({ pssrId, meetings, teamMembers, actionItems, currentUser, role, readOnly, onChanged }) {
  const { t, dir } = useLanguage();
  const [checklists, setChecklists] = useState(null); // null = در حال بارگذاری
  const [seeding, setSeeding] = useState(false);
  const [selectedMeetingId, setSelectedMeetingId] = useState(meetings.length > 0 ? meetings[meetings.length - 1].id : null);
  const [activeDiscipline, setActiveDiscipline] = useState(null);
  const [draft, setDraft] = useState({}); // requirementTemplateId -> {status, comment, actionByText, cat, deadline}
  const [latest, setLatest] = useState({});
  const [presence, setPresence] = useState([]);
  const [floorControl, setFloorControl] = useState({});
  const [showNewMeeting, setShowNewMeeting] = useState(false);
  const [newMeetingDate, setNewMeetingDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [resultMsg, setResultMsg] = useState("");
  const [historyFor, setHistoryFor] = useState(null); // {reqId, text}
  const [historyRows, setHistoryRows] = useState([]);
  const channelRef = useRef(null);

  useEffect(() => {
    (async () => {
      const cl = await loadCurrentChecklists();
      setChecklists(cl);
      if (cl.length > 0) setActiveDiscipline(cl[0].discipline);
    })();
  }, []);

  useEffect(() => {
    if (!selectedMeetingId) return;
    (async () => setLatest(await loadLatestResponsePerRequirement(pssrId)))();
    setDraft({});
    setResultMsg("");
  }, [selectedMeetingId, pssrId]);

  const selectedMeeting = meetings.find((m) => m.id === selectedMeetingId) || null;

  // ---------- جلسه‌ی آنلاین (Supabase Realtime: Broadcast + Presence) ----------
  useEffect(() => {
    if (channelRef.current) { leaveMeetingChannel(channelRef.current); channelRef.current = null; }
    setPresence([]); setFloorControl({});
    if (!selectedMeetingId || !selectedMeeting || selectedMeeting.status !== "open") return;
    const presenceKey = `${currentUser?.name || "user"}-${Math.random().toString(36).slice(2, 8)}`;
    const channel = createMeetingChannel(selectedMeetingId, presenceKey);
    subscribeMeetingChannel(channel, {
      onDraftChange: ({ requirementTemplateId, patch }) => {
        setDraft((d) => ({ ...d, [requirementTemplateId]: { ...(d[requirementTemplateId] || {}), ...patch } }));
      },
      onFloorControl: ({ discipline, name }) => {
        setFloorControl((f) => ({ ...f, [discipline]: name }));
      },
      onPresenceSync: (list) => setPresence(list),
    }, { id: presenceKey, name: currentUser?.name || "—", role });
    channelRef.current = channel;
    return () => { leaveMeetingChannel(channel); channelRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMeetingId]);

  const setEntry = (reqId, patch) => {
    setDraft((d) => ({ ...d, [reqId]: { ...(d[reqId] || {}), ...patch } }));
    if (channelRef.current) sendDraftChange(channelRef.current, { requirementTemplateId: reqId, patch });
  };

  const requestFloor = (discipline) => {
    setActiveDiscipline(discipline);
    if (channelRef.current) sendFloorControl(channelRef.current, { discipline, name: currentUser?.name || "—" });
    setFloorControl((f) => ({ ...f, [discipline]: currentUser?.name || "—" }));
  };

  const handleSeed = async () => {
    setSeeding(true);
    await seedOfficialChecklists(currentUser?.name);
    setChecklists(await loadCurrentChecklists());
    setSeeding(false);
  };

  const handleNewMeeting = async () => {
    const m = await createMeeting(pssrId, newMeetingDate, "", currentUser?.name);
    if (m?.__error) { alert(m.message); return; }
    setShowNewMeeting(false); setNewMeetingDate("");
    await onChanged();
    setSelectedMeetingId(m.id);
  };

  const openHistory = async (reqId, text) => {
    setHistoryFor({ reqId, text });
    const action = actionItems.find((a) => a.requirementTemplateId === reqId);
    setHistoryRows(action ? await loadActionHistory(action.id) : []);
  };

  const handleSubmit = async () => {
    const entries = Object.entries(draft)
      .filter(([, v]) => v.status)
      .map(([reqId, v]) => {
        const req = findRequirement(checklists, reqId);
        return {
          requirementTemplateId: reqId, discipline: req?.discipline, reqNo: req?.reqNo, requirementText: req?.requirementText,
          status: v.status, comment: v.comment || "", actionByText: v.actionByText || "", cat: v.cat || "", deadline: v.deadline || "",
        };
      });
    if (entries.length === 0) { alert(t("pssrErrNoEntries")); return; }
    setSaving(true);
    const res = await submitMeetingResponses(pssrId, selectedMeetingId, entries, currentUser?.name);
    setSaving(false);
    if (res?.__error) { alert(res.message); return; }
    setDraft({});
    setResultMsg(t("pssrSubmitResult", { created: res.actionsCreated, updated: res.actionsUpdated, closed: res.actionsClosed }));
    setLatest(await loadLatestResponsePerRequirement(pssrId));
    await onChanged();
  };

  if (checklists === null) return <p style={{ color: THEME.text3, fontSize: 13 }}>{t("pssrLoading")}</p>;

  if (checklists.length === 0) {
    return (
      <div style={{ background: THEME.surface, border: `1px dashed ${THEME.border}`, borderRadius: 12, padding: 24, textAlign: "center" }}>
        <p style={{ fontSize: 13, color: THEME.text2, marginBottom: 14 }}>{t("pssrNoChecklistsYet")}</p>
        {!readOnly && (
          <button type="button" style={styles.smallButton} disabled={seeding} onClick={handleSeed}>
            {seeding ? t("pssrSaving") : t("pssrSeedChecklists")}
          </button>
        )}
      </div>
    );
  }

  const activeChecklist = checklists.find((c) => c.discipline === activeDiscipline);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "250px 1fr", gap: 14, alignItems: "start" }}>
        {/* ---- لیست جلسات ---- */}
        <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 14, padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          {!readOnly && !showNewMeeting && (
            <button type="button" onClick={() => setShowNewMeeting(true)} style={{ ...styles.smallButton, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <Plus size={13} /> {t("pssrNewMeeting")}
            </button>
          )}
          {showNewMeeting && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, background: THEME.surface2, borderRadius: 9, padding: 8 }}>
              <JalaliDateInput value={newMeetingDate} onChange={setNewMeetingDate} />
              <div style={{ display: "flex", gap: 6 }}>
                <button type="button" style={{ ...styles.smallButton, flex: 1 }} onClick={handleNewMeeting}>{t("pssrCreate")}</button>
                <button type="button" onClick={() => setShowNewMeeting(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={16} color={THEME.text3} /></button>
              </div>
            </div>
          )}
          {meetings.slice().reverse().map((m) => (
            <div key={m.id} onClick={() => setSelectedMeetingId(m.id)}
              style={{ border: `1px solid ${selectedMeetingId === m.id ? THEME.teal : THEME.border}`, background: selectedMeetingId === m.id ? THEME.tealSoft : THEME.surface, borderRadius: 12, padding: "9px 11px", cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 12.5 }}>
                <span>{t("pssrMeetingNo", { no: m.meetingNo })}</span>
                <span style={{ color: m.status === "open" ? THEME.teal : THEME.text3, fontWeight: 700, fontSize: 11 }}>{m.status === "open" ? t("pssrMeetingOpen") : t("pssrMeetingClosed")}</span>
              </div>
              <div style={{ fontSize: 10.5, color: THEME.text2, marginTop: 2 }} dir="ltr">{toJalaliSafe(m.meetingDate) || "—"}</div>
            </div>
          ))}
          {meetings.length === 0 && <p style={{ fontSize: 11.5, color: THEME.text3, textAlign: "center" }}>{t("pssrNoMeetingsYet")}</p>}
        </div>

        {/* ---- جزئیات جلسه ---- */}
        <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 14, overflow: "hidden" }}>
          {!selectedMeeting && <p style={{ padding: 20, fontSize: 13, color: THEME.text3 }}>{t("pssrPickMeetingHint")}</p>}

          {selectedMeeting && (
            <>
              <div style={{ padding: "12px 16px", borderBottom: `1px solid ${THEME.border}`, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                <b style={{ fontSize: 14 }}>{t("pssrMeetingNo", { no: selectedMeeting.meetingNo })}</b>
                {presence.length > 0 && (
                  <div style={{ display: "flex", gap: 5, alignItems: "center", fontSize: 11, color: THEME.teal }}>
                    <Radio size={13} /> {t("pssrOnlineCount", { count: presence.length })}
                    <span style={{ color: THEME.text3 }}>({presence.map((p) => p.name).join("، ")})</span>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: 4, padding: "10px 12px 0", overflowX: "auto", borderBottom: `1px solid ${THEME.border}` }}>
                {checklists.map((c) => {
                  const noCount = c.requirements.filter((r) => draft[r.id]?.status === "no").length;
                  return (
                    <div key={c.discipline} onClick={() => requestFloor(c.discipline)}
                      style={{
                        padding: "8px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", borderRadius: "9px 9px 0 0",
                        background: activeDiscipline === c.discipline ? THEME.surface : THEME.surface2,
                        color: activeDiscipline === c.discipline ? THEME.teal : THEME.text2,
                        border: `1px solid ${activeDiscipline === c.discipline ? THEME.teal : THEME.border}`, borderBottom: "none", position: "relative", top: 1,
                      }}>
                      {disciplineLabel(c.discipline, t)}
                      {noCount > 0 && <span style={{ marginInlineStart: 5, fontSize: 10, color: THEME.danger }}>({noCount})</span>}
                      {floorControl[c.discipline] && <div style={{ fontSize: 9, color: THEME.text3 }}>{t("pssrFloorControlBy", { name: floorControl[c.discipline] })}</div>}
                    </div>
                  );
                })}
              </div>

              <div>
                {activeChecklist?.requirements.map((r, i) => {
                  const prevGroup = i > 0 ? activeChecklist.requirements[i - 1].groupTitle : null;
                  const entry = draft[r.id] || {};
                  const latestForReq = latest[r.id];
                  const showHistoryHint = latestForReq && latestForReq.meetingNo && latestForReq.meetingNo !== selectedMeeting.meetingNo;
                  return (
                    <div key={r.id}>
                      {r.groupTitle && r.groupTitle !== prevGroup && (
                        <div style={{ padding: "8px 16px", background: THEME.surface2, fontSize: 10.5, fontWeight: 800, color: THEME.teal }}>{r.groupTitle}</div>
                      )}
                      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${THEME.borderSoft}`, display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                          <span style={{ flex: "0 0 auto", width: 24, height: 24, borderRadius: 7, background: THEME.surface2, color: THEME.text2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>{r.reqNo}</span>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: 13 }} dir="ltr">{r.requirementText}</span>
                            {showHistoryHint && (
                              <div onClick={() => openHistory(r.id, r.requirementText)} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10.5, color: THEME.warn, background: THEME.warnBg, borderRadius: 7, padding: "2px 7px", marginTop: 5, cursor: "pointer", fontWeight: 700 }}>
                                <History size={11} /> {t("pssrPreviouslyAnswered", { no: latestForReq.meetingNo, status: t(latestForReq.status === "no" ? "pssrNo" : latestForReq.status === "yes" ? "pssrYes" : "pssrNa") })}
                              </div>
                            )}
                          </div>
                          {!readOnly && <YnaToggle value={entry.status} onChange={(v) => setEntry(r.id, { status: v })} t={t} />}
                        </div>

                        {!readOnly && entry.status === "no" && (
                          <div style={{ background: THEME.dangerBg, border: `1px solid ${THEME.danger}`, borderRadius: 10, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8 }}>
                              <Field label={t("pssrActionComment")}><input style={inputStyle} value={entry.comment || ""} onChange={(e) => setEntry(r.id, { comment: e.target.value })} dir={dir} /></Field>
                              <Field label={t("pssrActionBy")}><input style={inputStyle} value={entry.actionByText || ""} onChange={(e) => setEntry(r.id, { actionByText: e.target.value })} dir={dir} /></Field>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8 }}>
                              <div>
                                <label style={styles.label}>{t("pssrCat")}</label>
                                <CatPicker value={entry.cat} onChange={(v) => setEntry(r.id, { cat: v })} t={t} />
                              </div>
                              <Field label={t("pssrDeadline")}><JalaliDateInput value={entry.deadline || ""} onChange={(v) => setEntry(r.id, { deadline: v })} /></Field>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {!readOnly && (
                <div style={{ padding: "12px 16px", borderTop: `1px solid ${THEME.border}`, background: THEME.surface2, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11.5, color: THEME.ok }}>{resultMsg}</span>
                  <button type="button" style={styles.smallButton} disabled={saving} onClick={handleSubmit}>{saving ? t("pssrSaving") : t("pssrSubmitMeeting")}</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {historyFor && (
        <ActionHistoryModal reqInfo={historyFor} rows={historyRows} onClose={() => setHistoryFor(null)} t={t} />
      )}
    </div>
  );
}

function findRequirement(checklists, reqId) {
  for (const c of checklists) {
    const r = c.requirements.find((x) => x.id === reqId);
    if (r) return { ...r, discipline: c.discipline };
  }
  return null;
}

function ActionHistoryModal({ reqInfo, rows, onClose, t }) {
  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, background: "rgba(7,15,22,.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }}>
      <div style={{ background: THEME.surface, borderRadius: 16, maxWidth: 460, width: "100%", padding: 18, maxHeight: "80vh", overflow: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, gap: 8 }}>
          <b style={{ fontSize: 13 }} dir="ltr">{reqInfo.text}</b>
          <X size={16} style={{ cursor: "pointer", flex: "0 0 auto" }} onClick={onClose} />
        </div>
        {rows.length === 0 && <p style={{ fontSize: 11.5, color: THEME.text3 }}>{t("pssrHistoryEmpty")}</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rows.map((h) => {
            const meta = ACTION_STATUS_META[h.newStatus] || ACTION_STATUS_META.open;
            return (
              <div key={h.id} style={{ borderInlineStart: `2.5px solid ${THEME.border}`, paddingInlineStart: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700 }}>
                  <span>{t("pssrMeetingNo", { no: h.meetingNo || "—" })} <span dir="ltr" style={{ color: THEME.text3, fontWeight: 500 }}>{toJalaliSafe(h.meetingDate)}</span></span>
                  <StatusBadge tone={meta.tone}>{t(meta.key)}{h.cat ? ` · ${catLabel(h.cat, t)}` : ""}</StatusBadge>
                </div>
                {h.comment && <div style={{ fontSize: 11.5, color: THEME.text2, marginTop: 3 }}>{h.comment}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
