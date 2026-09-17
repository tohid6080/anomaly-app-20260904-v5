import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { THEME, isValidMobile } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { toJalaliDateTime } from "../personnel/jalaliDate.jsx";
import { loadLiveChatSession, clearLiveChatSession, startLiveChat, sendLiveChatVisitorMessage, pollLiveChatMessages } from "./livechatApi.js";

const POLL_MS = 4000;

/**
 * ویجتِ شناور گفتگوی زنده — پایین‌سمت‌راستِ صفحه‌ی عمومی سایت (پیش از
 * ورود). بازدیدکننده باید اول مشخصاتش را بدهد (نام، ایمیل، موبایل)، بعد
 * می‌تواند با پشتیبانی (SuperAdmin) چت کند. پیام‌های تازه با poll هر ۴
 * ثانیه (فقط وقتی پنل باز است) دیده می‌شوند — همان الگویِ ChatThread.jsx
 * برای گفتگوی داخلی، نه websocket، تا یک مدلِ اتصالِ دومِ متفاوت به پروژه
 * اضافه نشود.
 */
export default function LiveChatWidget() {
  const { t, dir } = useLanguage();
  const [open, setOpen] = useState(false);
  const [everOpened, setEverOpened] = useState(false);
  const [session, setSession] = useState(null);
  const [step, setStep] = useState("form"); // form | chat
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [fieldErrors, setFieldErrors] = useState({ name: "", email: "", phone: "" });
  const [submitError, setSubmitError] = useState("");
  const [starting, setStarting] = useState(false);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    const existing = loadLiveChatSession();
    if (existing) {
      setSession(existing);
      setStep("chat");
      setEverOpened(true);
    }
  }, []);

  useEffect(() => {
    if (!open || step !== "chat" || !session) return;
    let cancelled = false;
    const poll = () => {
      pollLiveChatMessages(session).then((r) => {
        if (cancelled) return;
        if (r?.ok) { setMessages(r.messages); return; }
        // نشستِ localStorage دیگر معتبر نیست (مثلاً گفتگو حذف شده) — به‌جای
        // ماندن در یک ترِدِ خالی و یخ‌زده، بازدیدکننده را به فرمِ شروع برمی‌گرداند
        if (r?.invalidSession) {
          clearLiveChatSession();
          setSession(null);
          setStep("form");
          setMessages([]);
        }
      });
    };
    poll();
    const timer = setInterval(poll, POLL_MS);
    return () => { cancelled = true; clearInterval(timer); };
  }, [open, step, session]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages, open]);

  const toggleWidget = () => {
    setOpen((v) => !v);
    setEverOpened(true);
  };

  const handleSubmit = async () => {
    const errors = { name: "", email: "", phone: "" };
    if (!name.trim()) errors.name = t("lcErrNameRequired");
    if (!email.trim()) errors.email = t("lcErrEmailRequired");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = t("lcErrEmailInvalid");
    if (!phone.trim()) errors.phone = t("lcErrPhoneRequired");
    else if (!isValidMobile(phone)) errors.phone = t("lcErrPhoneInvalid");

    if (errors.name || errors.email || errors.phone) { setFieldErrors(errors); return; }

    setStarting(true);
    setSubmitError("");
    const result = await startLiveChat(name.trim(), email.trim(), phone.trim());
    setStarting(false);
    if (result?.__error) { setSubmitError(result.message); return; }
    setSession(result.session);
    setMessages(result.messages);
    setStep("chat");
  };

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || sending || !session) return;
    setSending(true);
    setSendError("");
    const result = await sendLiveChatVisitorMessage(session, text);
    setSending(false);
    if (result?.__error) {
      if (result.invalidSession) { clearLiveChatSession(); setSession(null); setStep("form"); setMessages([]); return; }
      setSendError(result.message);
      return;
    }
    setMessages((prev) => [...prev, result.message]);
    setDraft("");
  };

  const onDraftKeyDown = (e) => {
    if (e.key === "Enter") { e.preventDefault(); handleSend(); }
  };

  const showEnticement = !everOpened;

  return (
    <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 4000, direction: dir, fontFamily: THEME.font }}>
      {open ? (
        <div style={{
          width: 320, maxWidth: "calc(100vw - 24px)", height: 440, maxHeight: "calc(100vh - 100px)",
          background: THEME.surface, borderRadius: 16, overflow: "hidden", border: `1px solid ${THEME.borderStrong}`,
          boxShadow: "0 16px 40px rgba(0,0,0,0.45)", display: "flex", flexDirection: "column",
        }}>
          <div style={{ flexShrink: 0, background: THEME.navyDeep, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: THEME.ok, display: "inline-block" }} />
              <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>{t("lcHeaderTitle")}</span>
            </div>
            <button type="button" onClick={toggleWidget} aria-label={t("lcCloseAria")} style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer", padding: 4, display: "flex" }}>
              <X size={17} />
            </button>
          </div>

          {step === "form" && (
            <div style={{ flex: 1, minHeight: 0, padding: 16, display: "flex", flexDirection: "column", gap: 12, overflowY: "auto" }}>
              <p style={{ margin: 0, fontSize: 12, color: THEME.text2, lineHeight: 1.8 }}>{t("lcFormIntro")}</p>

              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <label htmlFor="lcName" style={{ fontSize: 11.5, fontWeight: 700, color: THEME.text2 }}>{t("lcFieldName")}</label>
                <input id="lcName" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("lcFieldNamePlaceholder")}
                  style={{ padding: "9px 10px", borderRadius: 8, border: `1px solid ${fieldErrors.name ? THEME.danger : THEME.border}`, fontSize: 12.5, fontFamily: "inherit", outline: "none", boxSizing: "border-box", background: "rgba(18,50,64,0.55)", color: THEME.text }} />
                {fieldErrors.name && <span style={{ fontSize: 10.5, color: THEME.danger }}>{fieldErrors.name}</span>}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <label htmlFor="lcEmail" style={{ fontSize: 11.5, fontWeight: 700, color: THEME.text2 }}>{t("lcFieldEmail")}</label>
                <input id="lcEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@mail.com" dir="ltr"
                  style={{ padding: "9px 10px", borderRadius: 8, border: `1px solid ${fieldErrors.email ? THEME.danger : THEME.border}`, fontSize: 12.5, fontFamily: "inherit", outline: "none", boxSizing: "border-box", background: "rgba(18,50,64,0.55)", color: THEME.text }} />
                {fieldErrors.email && <span style={{ fontSize: 10.5, color: THEME.danger }}>{fieldErrors.email}</span>}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <label htmlFor="lcPhone" style={{ fontSize: 11.5, fontWeight: 700, color: THEME.text2 }}>{t("lcFieldPhone")}</label>
                <input id="lcPhone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09xxxxxxxxx" dir="ltr"
                  style={{ padding: "9px 10px", borderRadius: 8, border: `1px solid ${fieldErrors.phone ? THEME.danger : THEME.border}`, fontSize: 12.5, fontFamily: "inherit", outline: "none", boxSizing: "border-box", background: "rgba(18,50,64,0.55)", color: THEME.text }} />
                {fieldErrors.phone && <span style={{ fontSize: 10.5, color: THEME.danger }}>{fieldErrors.phone}</span>}
              </div>

              {submitError && <span style={{ fontSize: 11, color: THEME.danger }}>{submitError}</span>}

              <button type="button" onClick={handleSubmit} disabled={starting}
                style={{ marginTop: 4, padding: 10, borderRadius: 9, border: "none", background: `linear-gradient(180deg, ${THEME.teal}, ${THEME.tealDeep})`, color: "#fff", fontSize: 13, fontWeight: 700, cursor: starting ? "default" : "pointer", opacity: starting ? 0.7 : 1, fontFamily: "inherit" }}>
                {starting ? t("commonLoading") : t("lcStartChat")}
              </button>
            </div>
          )}

          {step === "chat" && (
            <>
              <div style={{ flex: 1, minHeight: 0, padding: 14, display: "flex", flexDirection: "column", gap: 10, overflowY: "auto", background: THEME.bg }}>
                {messages.map((m) => {
                  const own = m.sender === "visitor";
                  return (
                    <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: own ? "flex-end" : "flex-start" }}>
                      <div style={{
                        maxWidth: 220, padding: "9px 12px", fontSize: 12.5, lineHeight: 1.7,
                        borderRadius: own ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                        background: own ? THEME.teal : THEME.surface2, color: own ? "#06231f" : THEME.text,
                      }}>
                        {m.body}
                      </div>
                      <span style={{ fontSize: 9.5, color: THEME.text3, marginTop: 2 }}>{toJalaliDateTime(m.createdAt)}</span>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
              {sendError && <p style={{ margin: "0 12px", fontSize: 10.5, color: THEME.danger }}>{sendError}</p>}
              <div style={{ flexShrink: 0, display: "flex", gap: 8, padding: "10px 12px", borderTop: `1px solid ${THEME.border}`, background: THEME.surface }}>
                <input type="text" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onDraftKeyDown}
                  placeholder={t("lcComposerPlaceholder")} aria-label={t("lcComposerAria")}
                  style={{ flex: 1, minWidth: 0, padding: "9px 12px", borderRadius: 20, border: `1px solid ${THEME.border}`, fontSize: 12.5, fontFamily: "inherit", outline: "none", boxSizing: "border-box", background: "rgba(18,50,64,0.55)", color: THEME.text }} />
                <button type="button" onClick={handleSend} disabled={!draft.trim() || sending} aria-label={t("lcSendAria")}
                  style={{ width: 36, height: 36, flexShrink: 0, borderRadius: "50%", border: "none", background: THEME.teal, color: "#06231f", cursor: draft.trim() ? "pointer" : "default", opacity: draft.trim() ? 1 : 0.6, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Send size={15} />
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div style={{ position: "relative" }}>
          <button type="button" onClick={toggleWidget} aria-label={t("lcOpenAria")}
            style={{ width: 56, height: 56, borderRadius: "50%", border: "none", background: `linear-gradient(180deg, ${THEME.teal}, ${THEME.tealDeep})`, boxShadow: "0 8px 22px rgba(13,143,138,0.5)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <MessageCircle size={25} />
          </button>
          {showEnticement && (
            <span style={{ position: "absolute", top: -3, right: -3, width: 20, height: 20, borderRadius: "50%", background: THEME.danger, color: "#fff", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${THEME.surface}` }}>1</span>
          )}
        </div>
      )}
    </div>
  );
}
