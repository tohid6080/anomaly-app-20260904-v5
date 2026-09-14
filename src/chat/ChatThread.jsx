import React, { useState, useEffect, useRef } from "react";
import { Send, Paperclip, Users as UsersIcon, Check, CheckCheck, LogOut, Reply, Pin, Settings, X, UserMinus, UserPlus } from "lucide-react";
import { styles, THEME } from "../shared.js";
import { toJalaliDateTime } from "../personnel/jalaliDate.jsx";
import { isPdfDataUrl, fileToBase64 } from "../personnel/fileHelpers.js";
import DocumentViewerModal from "../personnel/DocumentViewerModal.jsx";
import {
  loadMessages, loadParticipants, loadConversation, sendMessage, markConversationRead, leaveConversation,
  pinMessage, unpinMessage, renameConversation, removeParticipant, addParticipant, loadChatDirectory, notifyChatPush,
} from "./chatApi.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";

const MSG_POLL_MS = 4000;

export default function ChatThread({ conversationId, currentUser, onBack }) {
  const { t, dir } = useLanguage();
  const [conv, setConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [leaving, setLeaving] = useState(false);
  const [viewerSrc, setViewerSrc] = useState(null);
  const [replyTarget, setReplyTarget] = useState(null);
  const [showManage, setShowManage] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [savingTitle, setSavingTitle] = useState(false);
  const [addDirectory, setAddDirectory] = useState(null);
  const bottomRef = useRef(null);
  const me = { username: currentUser?.username, name: currentUser?.name, role: currentUser?.role };

  const handleLeave = async () => {
    if (!confirm(t("confirmLeaveConversation"))) return;
    setLeaving(true);
    const result = await leaveConversation(conversationId, me);
    setLeaving(false);
    if (result?.__error) { alert(result.message); return; }
    onBack();
  };

  const load = async (scrollToBottom) => {
    console.log("[chat-ui] ChatThread.load: شروع برای مکالمه", conversationId);
    const [msgs, parts, convRow] = await Promise.all([loadMessages(conversationId), loadParticipants(conversationId), loadConversation(conversationId)]);
    console.log("[chat-ui] ChatThread.load: پیام‌ها =", msgs.length, "شرکت‌کنندگان =", parts.length, { msgs, parts });
    setMessages(msgs);
    setParticipants(parts);
    setConv(convRow);
    markConversationRead(conversationId, me.username);
    if (scrollToBottom) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  useEffect(() => { load(true); }, [conversationId]);
  useEffect(() => {
    const timer = setInterval(() => load(false), MSG_POLL_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  const handleSend = async (attachment) => {
    if (!attachment && !text.trim()) return;
    if (sending) return;
    console.log("[chat-ui] handleSend: شروع", { conversationId, hasAttachment: !!attachment, textLength: text.trim().length, replyToId: replyTarget?.id || null });
    setSending(true);
    setError("");
    const body = text.trim();
    const replyToId = replyTarget?.id || null;
    setText("");
    setReplyTarget(null);
    const result = await sendMessage(conversationId, me, body, attachment, replyToId);
    console.log("[chat-ui] handleSend: نتیجه", result);
    setSending(false);
    if (result?.__error) { console.error("[chat-ui] handleSend: خطا", result.message); setError(result.message); return; }
    notifyChatPush(conversationId, result.id);
    await load(true);
  };

  const handleAttach = async (file) => {
    if (!file) return;
    let base64;
    try {
      base64 = await fileToBase64(file);
    } catch (e) {
      setError(e?.message || t("errReadingFileGeneric"));
      return;
    }
    await handleSend({ data: base64, mimeType: file.type, name: file.name });
  };

  const handlePinToggle = async (messageId) => {
    const result = messageId ? await pinMessage(conversationId, messageId, me) : await unpinMessage(conversationId, me);
    if (result?.__error) { alert(result.message); return; }
    await load(false);
  };

  const openManage = () => {
    setTitleDraft(conv?.title || "");
    setAddDirectory(null);
    setShowManage(true);
  };

  const handleSaveTitle = async () => {
    setSavingTitle(true);
    const result = await renameConversation(conversationId, titleDraft, me);
    setSavingTitle(false);
    if (result?.__error) { alert(result.message); return; }
    await load(false);
  };

  const handleRemoveMember = async (person) => {
    if (!confirm(t("confirmRemoveMember", { name: person.fullName || person.username }))) return;
    const result = await removeParticipant(conversationId, person.username, person.fullName, me);
    if (result?.__error) { alert(result.message); return; }
    await load(false);
  };

  const openAddMember = async () => {
    const dir = await loadChatDirectory(currentUser.role, currentUser.jobPositionId);
    setAddDirectory(dir.filter((p) => !participants.some((pp) => pp.username === p.username)));
  };

  const handleAddMember = async (person) => {
    const result = await addParticipant(conversationId, person, me);
    if (result?.__error) { alert(result.message); return; }
    setAddDirectory(null);
    await load(false);
  };

  const other = participants.find((p) => p.username !== me.username);
  const isGroup = participants.length > 2;
  const canManageGroup = isGroup && currentUser?.role === "HSE_SUPERVISOR";
  const title = isGroup ? (conv?.title || t("chatGroupWithCount", { count: participants.length })) : (other?.fullName || t("chatFallbackTitle"));
  const pinnedMessage = conv?.pinnedMessageId ? messages.find((m) => m.id === conv.pinnedMessageId) : null;

  // آخرین پیام هرکس دیگری که last_read_at آن بعد از این پیام باشد یعنی خوانده
  const isReadByOthers = (msg) => participants.some((p) => p.username !== me.username && p.lastReadAt && new Date(p.lastReadAt) >= new Date(msg.createdAt));

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 24, display: "flex", flexDirection: "column", height: "calc(100vh - 48px)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={styles.backLink} onClick={onBack}>{t("commonBack")}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginRight: "auto" }}>
          {isGroup && <UsersIcon size={15} color={THEME.text3} />}
          <span style={{ fontWeight: 700, color: THEME.heading, fontSize: 14.5 }}>{title}</span>
        </div>
        {canManageGroup && (
          <button type="button" onClick={openManage} title={t("chatManageGroupTitle")} style={{ background: "none", border: "none", cursor: "pointer", padding: 6, display: "flex", alignItems: "center" }}>
            <Settings size={16} color={THEME.text3} />
          </button>
        )}
        <button type="button" onClick={handleLeave} disabled={leaving} title={t("chatLeaveConversationTitle")} style={{ background: "none", border: "none", cursor: "pointer", padding: 6, display: "flex", alignItems: "center" }}>
          <LogOut size={16} color={THEME.danger} />
        </button>
      </div>

      {pinnedMessage && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: THEME.tealSoft, border: `1px solid ${THEME.teal}`, borderRadius: 10, padding: "7px 10px", marginBottom: 8 }}>
          <Pin size={13} color={THEME.tealDeep} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, color: THEME.tealDeep, fontWeight: 700 }}>{t("chatPinnedBannerLabel")}</div>
            <div style={{ fontSize: 12, color: THEME.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {pinnedMessage.body || (pinnedMessage.attachmentUrl ? t("chatAttachment") : "")}
            </div>
          </div>
          <button type="button" onClick={() => handlePinToggle(null)} title={t("chatUnpinAction")} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, flexShrink: 0 }}>
            <X size={14} color={THEME.tealDeep} />
          </button>
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", background: THEME.bg, borderRadius: 10, padding: 14, marginBottom: 10 }}>
        {messages.length === 0 && <p style={{ color: THEME.text3, textAlign: "center", padding: 20 }}>{t("chatNoMessagesSentYet")}</p>}
        {messages.map((m) => {
          if (m.isSystem) {
            return (
              <div key={m.id} style={{ textAlign: "center", margin: "10px 0" }}>
                <span style={{ fontSize: 11, color: THEME.text3, background: THEME.surface2, padding: "4px 10px", borderRadius: 999 }}>{m.body}</span>
              </div>
            );
          }
          const isMine = m.senderUsername === me.username;
          const quoted = m.replyToId ? messages.find((x) => x.id === m.replyToId) : null;
          return (
            <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start", marginBottom: 10 }}>
              {!isMine && isGroup && <span style={{ fontSize: 10.5, color: THEME.text3, marginBottom: 2 }}>{m.senderName}</span>}
              <div style={{ maxWidth: "75%", background: isMine ? THEME.teal : "#fff", color: isMine ? "#fff" : THEME.text, borderRadius: 12, padding: "8px 12px", border: isMine ? "none" : `1px solid ${THEME.border}` }}>
                {quoted && (
                  <div style={{
                    borderInlineStart: `3px solid ${isMine ? "rgba(255,255,255,0.6)" : THEME.teal}`, opacity: 0.85,
                    padding: "3px 8px", marginBottom: 6, fontSize: 11.5, background: isMine ? "rgba(255,255,255,0.12)" : THEME.bg, borderRadius: 6,
                  }}>
                    <div style={{ fontWeight: 700, marginBottom: 1 }}>{quoted.senderName}</div>
                    <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{quoted.body || t("chatAttachment")}</div>
                  </div>
                )}
                {m.attachmentUrl && (
                  isPdfDataUrl(m.attachmentUrl) || (m.attachmentType || "").includes("pdf") ? (
                    <a href={m.attachmentUrl} target="_blank" rel="noreferrer" style={{ color: isMine ? "#fff" : THEME.teal, fontSize: 12.5, textDecoration: "underline" }}>📎 {m.attachmentName || t("chatPdfFile")}</a>
                  ) : (
                    <img src={m.attachmentUrl} alt={m.attachmentName} onClick={() => setViewerSrc(m.attachmentUrl)} style={{ maxWidth: 200, borderRadius: 8, cursor: "pointer", display: "block", marginBottom: m.body ? 6 : 0 }} />
                  )
                )}
                {m.body && <div style={{ fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{m.body}</div>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                <button type="button" onClick={() => setReplyTarget(m)} title={t("chatReplyAction")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}>
                  <Reply size={11} color={THEME.text3} />
                </button>
                <button type="button" onClick={() => handlePinToggle(m.id)} title={t("chatPinAction")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}>
                  <Pin size={11} color={conv?.pinnedMessageId === m.id ? THEME.teal : THEME.text3} />
                </button>
                <span style={{ fontSize: 9.5, color: THEME.text3 }}>{toJalaliDateTime(m.createdAt)}</span>
                {isMine && (isReadByOthers(m) ? <CheckCheck size={12} color={THEME.teal} /> : <Check size={12} color={THEME.text3} />)}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {error && <p style={{ ...styles.error, marginBottom: 8 }}>{error}</p>}

      {replyTarget && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: THEME.surface2, borderRadius: 8, padding: "6px 10px", marginBottom: 8 }}>
          <Reply size={13} color={THEME.teal} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10.5, color: THEME.teal, fontWeight: 700 }}>{replyTarget.senderName}</div>
            <div style={{ fontSize: 11.5, color: THEME.text3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{replyTarget.body || t("chatAttachment")}</div>
          </div>
          <button type="button" onClick={() => setReplyTarget(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, flexShrink: 0 }}>
            <X size={14} color={THEME.text3} />
          </button>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <label style={{ ...styles.smallButton, background: THEME.navyMid, display: "flex", alignItems: "center", justifyContent: "center", padding: "9px 11px", cursor: "pointer", position: "relative", overflow: "hidden" }}>
          <Paperclip size={15} />
          <input type="file" accept="image/*,application/pdf" style={{ position: "absolute", width: 1, height: 1, opacity: 0 }} onChange={(e) => { handleAttach(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
        <input
          style={{ ...styles.input, flex: 1 }} placeholder={t("chatMessagePlaceholder")} value={text}
          onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} dir={dir}
        />
        <button type="button" style={{ ...styles.smallButton, padding: "9px 14px" }} onClick={() => handleSend()} disabled={sending || !text.trim()}>
          <Send size={15} />
        </button>
      </div>

      {viewerSrc && <DocumentViewerModal src={viewerSrc} onClose={() => setViewerSrc(null)} />}

      {showManage && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(10,20,30,0.55)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setShowManage(false)}>
          <div style={{ ...styles.card, width: "min(420px, 100%)", maxHeight: "80vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <b style={{ fontSize: 14.5, color: THEME.heading }}>{t("chatManageGroupTitle")}</b>
              <button type="button" onClick={() => setShowManage(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                <X size={16} color={THEME.text3} />
              </button>
            </div>

            <div style={{ marginBottom: 6, fontSize: 12, color: THEME.text3 }}>{t("chatGroupNameLabel")}</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <input style={{ ...styles.input, flex: 1 }} value={titleDraft} onChange={(e) => setTitleDraft(e.target.value)} dir={dir} />
              <button type="button" style={styles.smallButton} onClick={handleSaveTitle} disabled={savingTitle || !titleDraft.trim()}>{t("commonSave")}</button>
            </div>

            <div style={{ marginBottom: 6, fontSize: 12, color: THEME.text3 }}>{t("chatMembersLabel")}</div>
            <div style={{ marginBottom: 10 }}>
              {participants.map((p) => (
                <div key={p.username} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${THEME.border}` }}>
                  <span style={{ fontSize: 13 }}>{p.fullName || p.username}</span>
                  {p.username !== me.username && (
                    <button type="button" onClick={() => handleRemoveMember(p)} title={t("chatRemoveMemberAction")} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                      <UserMinus size={14} color={THEME.danger} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {addDirectory === null ? (
              <button type="button" style={{ ...styles.smallButton, display: "flex", alignItems: "center", gap: 6 }} onClick={openAddMember}>
                <UserPlus size={14} /> {t("chatAddMemberBtn")}
              </button>
            ) : (
              <div style={{ maxHeight: 200, overflowY: "auto", border: `1px solid ${THEME.border}`, borderRadius: 8, padding: 8 }}>
                {addDirectory.length === 0 && <p style={{ fontSize: 12, color: THEME.text3 }}>{t("chatNoOneToAdd")}</p>}
                {addDirectory.map((p) => (
                  <div key={p.username} onClick={() => handleAddMember(p)} style={{ padding: "7px 4px", cursor: "pointer", fontSize: 13, borderBottom: `1px solid ${THEME.border}` }}>
                    {p.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
