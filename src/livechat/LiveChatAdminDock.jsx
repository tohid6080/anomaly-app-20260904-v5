import { useEffect, useRef, useState } from "react";
import { Headset, X, Send } from "lucide-react";
import { THEME } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { toJalaliDateTime } from "../personnel/jalaliDate.jsx";
import { loadLiveChatConversations, loadLiveChatMessages, sendLiveChatAdminMessage, markLiveChatConversationRead } from "../superadmin/superAdminApi.js";

const LIST_POLL_MS = 4000;
const THREAD_POLL_MS = 4000;

/**
 * کادرِ شناورِ «گفتگوهای بازدیدکنندگان» — پایین‌سمت‌راستِ پنلِ سوپرادمین،
 * روی هر صفحه‌ای که ادمین باز کرده باشد (نه فقط یک مسیرِ ناوبریِ خاص).
 * فهرستِ گفتگوها همیشه (باز/بسته بودنِ کادر) هر ۴ ثانیه poll می‌شود تا
 * نشانگرِ خوانده‌نشده روی دکمه زنده بماند؛ گفتگویِ بازِ فعلی هم با همان
 * فاصله — دقیقاً همان الگویِ MSG_POLL_MS در ChatThread.jsx.
 */
export default function LiveChatAdminDock({ currentAdmin }) {
  const { t, dir } = useLanguage();
  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const poll = () => {
      loadLiveChatConversations().then((rows) => { if (!cancelled) setConversations(rows); });
    };
    poll();
    const timer = setInterval(poll, LIST_POLL_MS);
    return () => { cancelled = true; clearInterval(timer); };
  }, []);

  useEffect(() => {
    if (!open || !selectedId) return;
    let cancelled = false;
    const poll = () => {
      loadLiveChatMessages(selectedId).then((rows) => { if (!cancelled) setMessages(rows); });
    };
    poll();
    const timer = setInterval(poll, THREAD_POLL_MS);
    return () => { cancelled = true; clearInterval(timer); };
  }, [open, selectedId]);

  useEffect(() => {
    if (open && selectedId) bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages, open, selectedId]);

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  const selectConversation = (conv) => {
    setSelectedId(conv.id);
    setConversations((prev) => prev.map((c) => (c.id === conv.id ? { ...c, unreadCount: 0 } : c)));
    markLiveChatConversationRead(conv.id);
  };

  const backToList = () => setSelectedId(null);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || sending || !selectedId) return;
    setSending(true);
    const senderName = currentAdmin?.fullName || currentAdmin?.username || "";
    const result = await sendLiveChatAdminMessage(selectedId, text, senderName);
    setSending(false);
    if (result?.__error) return;
    setMessages((prev) => [...prev, result.message]);
    setDraft("");
  };

  const onDraftKeyDown = (e) => {
    if (e.key === "Enter") { e.preventDefault(); handleSend(); }
  };

  const selectedConv = conversations.find((c) => c.id === selectedId) || null;

  return (
    <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 4000, direction: dir, fontFamily: THEME.font }}>
      {open ? (
        <div style={{
          width: 340, maxWidth: "calc(100vw - 24px)", height: 470, maxHeight: "calc(100vh - 100px)",
          background: THEME.surface, borderRadius: 16, overflow: "hidden", border: `1px solid ${THEME.borderStrong}`,
          boxShadow: "0 16px 40px rgba(0,0,0,0.45)", display: "flex", flexDirection: "column",
        }}>
          <div style={{ flexShrink: 0, background: THEME.navyDeep, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
            {selectedId && (
              <button type="button" onClick={backToList} aria-label={t("lcBackAria")} style={{ background: "transparent", border: "none", color: "#fff", fontSize: 15, cursor: "pointer", padding: "2px 4px", fontFamily: "inherit" }}>
                {dir === "rtl" ? "→" : "←"}
              </button>
            )}
            <span style={{ flex: 1, minWidth: 0, color: "#fff", fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {selectedConv ? selectedConv.visitorName : t("lcAdminDockTitle")}
            </span>
            <button type="button" onClick={() => setOpen(false)} aria-label={t("lcCloseAria")} style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer", padding: 4, display: "flex" }}>
              <X size={17} />
            </button>
          </div>

          {selectedId && selectedConv && (
            <div style={{ flexShrink: 0, padding: "6px 16px", borderBottom: `1px solid ${THEME.borderSoft}`, background: THEME.surface, display: "flex", flexWrap: "wrap", gap: 12 }}>
              <span style={{ fontSize: 10.5, color: THEME.text3, direction: "ltr", display: "inline-block" }}>{selectedConv.visitorPhone}</span>
              {selectedConv.visitorEmail && (
                <span style={{ fontSize: 10.5, color: THEME.text3, direction: "ltr", display: "inline-block" }}>{selectedConv.visitorEmail}</span>
              )}
            </div>
          )}

          {!selectedId && (
            <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
              {conversations.length === 0 && (
                <p style={{ margin: 0, padding: 20, textAlign: "center", fontSize: 12, color: THEME.text3 }}>{t("lcNoConversations")}</p>
              )}
              {conversations.map((conv) => (
                <button key={conv.id} type="button" onClick={() => selectConversation(conv)}
                  style={{ all: "unset", boxSizing: "border-box", width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: `1px solid ${THEME.borderSoft}`, cursor: "pointer", fontFamily: "inherit" }}>
                  <span style={{ width: 34, height: 34, borderRadius: "50%", background: THEME.surface2, color: THEME.text2, fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {(conv.visitorName || "?").trim().charAt(0)}
                  </span>
                  <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: THEME.text }}>{conv.visitorName}</span>
                    <span style={{ display: "block", fontSize: 11, color: THEME.text3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{conv.lastMessagePreview}</span>
                  </span>
                  {conv.unreadCount > 0 && (
                    <span style={{ width: 18, height: 18, borderRadius: "50%", background: THEME.danger, color: "#fff", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {conv.unreadCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {selectedId && (
            <>
              <div style={{ flex: 1, minHeight: 0, padding: 14, display: "flex", flexDirection: "column", gap: 10, overflowY: "auto", background: THEME.bg }}>
                {messages.map((m) => {
                  const own = m.sender === "admin";
                  return (
                    <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: own ? "flex-end" : "flex-start" }}>
                      <div style={{
                        maxWidth: 230, padding: "9px 12px", fontSize: 12.5, lineHeight: 1.7,
                        borderRadius: own ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                        background: own ? THEME.navyMid : THEME.surface2, color: own ? "#fff" : THEME.text,
                      }}>
                        {m.body}
                      </div>
                      <span style={{ fontSize: 9.5, color: THEME.text3, marginTop: 2 }}>{toJalaliDateTime(m.createdAt)}</span>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
              <div style={{ flexShrink: 0, display: "flex", gap: 8, padding: "10px 12px", borderTop: `1px solid ${THEME.border}`, background: THEME.surface }}>
                <input type="text" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onDraftKeyDown}
                  placeholder={t("lcAdminComposerPlaceholder")} aria-label={t("lcAdminComposerAria")}
                  style={{ flex: 1, minWidth: 0, padding: "9px 12px", borderRadius: 20, border: `1px solid ${THEME.border}`, fontSize: 12.5, fontFamily: "inherit", outline: "none", boxSizing: "border-box", background: "rgba(18,50,64,0.55)", color: THEME.text }} />
                <button type="button" onClick={handleSend} disabled={!draft.trim() || sending} aria-label={t("lcAdminSendAria")}
                  style={{ width: 36, height: 36, flexShrink: 0, borderRadius: "50%", border: "none", background: THEME.navyMid, color: "#fff", cursor: draft.trim() ? "pointer" : "default", opacity: draft.trim() ? 1 : 0.6, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Send size={15} />
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div style={{ position: "relative" }}>
          <button type="button" onClick={() => setOpen(true)} aria-label={t("lcAdminOpenAria")}
            style={{ width: 56, height: 56, borderRadius: "50%", border: `1px solid ${THEME.borderStrong}`, background: THEME.navyDeep, boxShadow: "0 8px 22px rgba(0,0,0,0.5)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Headset size={24} />
          </button>
          {totalUnread > 0 && (
            <span style={{ position: "absolute", top: -3, right: -3, minWidth: 20, height: 20, padding: "0 4px", borderRadius: 10, background: THEME.danger, color: "#fff", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${THEME.surface}`, boxSizing: "border-box" }}>
              {totalUnread}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
