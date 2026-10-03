import React, { useState, useEffect } from "react";
import BackLink from "../shared/BackLink.jsx";
import { Lightbulb, Plus, ThumbsUp, Check, X } from "lucide-react";
import { styles, THEME } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import {
  loadSuggestions, createSuggestion, actionSuggestion, toggleVote, loadMyVotedSuggestionIds, STATUS_META,
} from "./suggestionBoxApi.js";
import { toJalaliSafe } from "../personnel/jalaliDate.jsx";

const EMPTY_FORM = { title: "", description: "", category: "" };

const primaryBtnStyle = { border: "none", background: THEME.teal, color: "#06231f", borderRadius: 9, padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" };
const quickBtn = (bg, color, border) => ({ border: `1px solid ${border}`, background: bg, color, borderRadius: 8, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 });

// صندوقِ پیشنهاداتِ ایمنی — کارکنان ایده ثبت می‌کنند (یک کامیتِ صریح، نه
// نوشتن‌روی‌هر‌تایپ)، همکاران رأی می‌دهند (یک کنشِ اتمیک، toggle)، و
// سرپرست/کارفرما اقدام/رد می‌کند. شمارشِ رأی از سمتِ سرور می‌آید (ستونِ
// محاسبه‌شده‌یِ view، نه یک state محلی که ممکن است با واقعیت فرق کند).
export default function SuggestionBoxDashboard({ onBack, currentUser, wide }) {
  const { t, dir } = useLanguage();
  const isSupervisor = currentUser?.role === "HSE_SUPERVISOR" || currentUser?.role === "EMPLOYER";
  const accountType = currentUser?.role === "CONTRACTOR" ? "contractor" : "employer";
  const voterId = currentUser?.id || currentUser?.username || "";

  const [suggestions, setSuggestions] = useState([]);
  const [votedIds, setVotedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    setLoading(true);
    const [list, voted] = await Promise.all([loadSuggestions(), loadMyVotedSuggestionIds(voterId)]);
    setSuggestions(list);
    setVotedIds(voted);
    setLoading(false);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [voterId]);

  const handleCreate = async () => {
    if (!form.title.trim()) { setError(t("sbErrTitleRequired")); return; }
    setSaving(true);
    setError("");
    const result = await createSuggestion({
      ...form,
      authorAccountType: accountType, authorAccountId: currentUser?.id || "",
      authorName: currentUser?.name || currentUser?.username || "",
    });
    setSaving(false);
    if (result?.__error) { setError(result.message); return; }
    setForm(EMPTY_FORM);
    setShowForm(false);
    load();
  };

  const handleVote = async (s) => {
    setBusyId(s.id);
    await toggleVote(s.id, accountType, voterId);
    await load();
    setBusyId(null);
  };

  const handleAction = async (s, status) => {
    let note = "";
    if (status === "rejected") {
      note = prompt(t("sbRejectNotePrompt")) || "";
      if (!note.trim()) return;
    }
    setBusyId(s.id);
    const result = await actionSuggestion(s.id, status, note, currentUser?.name || currentUser?.username || "");
    setBusyId(null);
    if (result?.__error) { alert(result.message); return; }
    load();
  };

  return (
    <div style={{ maxWidth: wide ? 980 : 720, margin: "0 auto", padding: 16 }} dir={dir}>
      <BackLink onClick={onBack}>{t("commonBack")}</BackLink>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, margin: "10px 0 16px" }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: THEME.heading, display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
          <Lightbulb size={18} color={THEME.teal} /> {t("sbTitle")}
        </h2>
        <button type="button" onClick={() => setShowForm((v) => !v)} style={{ ...primaryBtnStyle, display: "flex", alignItems: "center", gap: 6 }}>
          <Plus size={14} /> {t("sbAddBtn")}
        </button>
      </div>

      {showForm && (
        <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 12, padding: 14, marginBottom: 16 }}>
          <input
            style={{ ...styles.input, marginBottom: 8 }} dir={dir} placeholder={t("sbTitlePlaceholder")}
            value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <textarea
            style={{ ...styles.input, marginBottom: 8, minHeight: 60, resize: "vertical" }} dir={dir} placeholder={t("sbDescPlaceholder")}
            value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <input
            style={{ ...styles.input, marginBottom: 10 }} dir={dir} placeholder={t("sbCategoryPlaceholder")}
            value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
          />
          {error && <p style={{ color: THEME.danger, fontSize: 12, marginBottom: 8 }}>{error}</p>}
          <button type="button" onClick={handleCreate} disabled={saving} style={primaryBtnStyle}>
            {saving ? t("commonSaving") : t("sbSubmitBtn")}
          </button>
        </div>
      )}

      {loading ? (
        <p style={{ fontSize: 12, color: THEME.text3, textAlign: "center", padding: 20 }}>{t("commonLoading")}</p>
      ) : suggestions.length === 0 ? (
        <p style={{ fontSize: 12, color: THEME.text3, textAlign: "center", padding: 20 }}>{t("sbEmpty")}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {suggestions.map((s) => {
            const meta = STATUS_META[s.status] || STATUS_META.open;
            const voted = votedIds.has(s.id);
            return (
              <div key={s.id} style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 12, padding: 14 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: THEME.heading }}>{s.title}</div>
                    {s.category && <div style={{ fontSize: 10.5, color: THEME.text3, marginTop: 2 }}>{s.category}</div>}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 999, flexShrink: 0, background: meta.bg, color: meta.color }}>
                    {t(meta.labelKey)}
                  </span>
                </div>
                {s.description && <p style={{ fontSize: 12, color: THEME.text2, margin: "8px 0 0", lineHeight: 1.6 }}>{s.description}</p>}
                {s.actionNote && (
                  <p style={{ fontSize: 11, color: THEME.text3, margin: "8px 0 0", borderInlineStart: `2px solid ${THEME.border}`, paddingInlineStart: 8 }}>
                    {t("sbActionNoteLabel")} {s.actionNote}
                  </p>
                )}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${THEME.border}` }}>
                  <div style={{ fontSize: 10.5, color: THEME.text3 }}>
                    {s.authorName || t("sbAnonymousAuthor")} — {toJalaliSafe(s.createdAt)}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {isSupervisor && s.status === "open" && (
                      <>
                        <button type="button" style={quickBtn(THEME.okBg, THEME.ok, THEME.ok)} disabled={busyId === s.id} onClick={() => handleAction(s, "actioned")}>
                          <Check size={12} /> {t("sbActionBtn")}
                        </button>
                        <button type="button" style={quickBtn(THEME.dangerBg, THEME.danger, THEME.danger)} disabled={busyId === s.id} onClick={() => handleAction(s, "rejected")}>
                          <X size={12} /> {t("sbRejectBtn")}
                        </button>
                      </>
                    )}
                    {isSupervisor && s.status === "actioned" && (
                      <button type="button" style={quickBtn(THEME.okBg, THEME.ok, THEME.ok)} disabled={busyId === s.id} onClick={() => handleAction(s, "done")}>
                        <Check size={12} /> {t("sbMarkDoneBtn")}
                      </button>
                    )}
                    <button
                      type="button" disabled={busyId === s.id} onClick={() => handleVote(s)}
                      style={quickBtn(voted ? THEME.teal : THEME.surface2, voted ? "#06231f" : THEME.text2, voted ? THEME.teal : THEME.border)}
                    >
                      <ThumbsUp size={12} /> {s.voteCount}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
