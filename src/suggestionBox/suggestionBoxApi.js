import { sb, sbOk, getCurrentCompanyId, uid } from "../shared.js";
import { offlineWrite } from "../offline/offlineWrite.js";
import { translate, getCurrentLang } from "../i18n/translations.js";

const tr = (key, params) => translate(getCurrentLang(), key, params);

export const STATUS_META = {
  open: { labelKey: "sbStatusOpen", color: "#fff", bg: "#2563eb" },
  actioned: { labelKey: "sbStatusActioned", color: "#1f2937", bg: "#facc15" },
  done: { labelKey: "sbStatusDone", color: "#fff", bg: "#16a34a" },
  rejected: { labelKey: "sbStatusRejected", color: "#fff", bg: "#6b7280" },
};

function fromRow(r) {
  return {
    id: r.id,
    title: r.title || "",
    description: r.description || "",
    category: r.category || "",
    authorAccountType: r.author_account_type || "employer",
    authorAccountId: r.author_account_id || "",
    authorName: r.author_name || "",
    status: r.status || "open",
    actionNote: r.action_note || "",
    actionedBy: r.actioned_by || "",
    actionedAt: r.actioned_at || "",
    voteCount: Number(r.vote_count || 0),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function toDb(rec) {
  return {
    title: rec.title || "",
    description: rec.description || "",
    category: rec.category || "",
    author_account_type: rec.authorAccountType || "employer",
    author_account_id: rec.authorAccountId || null,
    author_name: rec.authorName || "",
  };
}

// فهرست از رویِ view (`_with_vote_count`) خوانده می‌شود — بدونِ N+1، شمارشِ
// رأی از قبل در خودِ کوئری انجام شده.
export async function loadSuggestions() {
  const companyId = getCurrentCompanyId();
  const filter = companyId ? `&company_id=eq.${companyId}` : "";
  const rows = await sb(`safety_suggestions_with_vote_count?select=*&order=vote_count.desc,created_at.desc${filter}`);
  if (!sbOk(rows)) return [];
  return rows.map(fromRow);
}

export async function createSuggestion({ title, description, category, authorAccountType, authorAccountId, authorName }) {
  if (!title?.trim()) return { __error: true, message: tr("sbErrTitleRequired") };
  const id = uid("sugg");
  const res = await offlineWrite({
    module: "safetySuggestions", table: "safety_suggestions", action: "insert", id,
    payload: { ...toDb({ title: title.trim(), description, category, authorAccountType, authorAccountId, authorName }), company_id: getCurrentCompanyId() },
  });
  if (!res?.ok) return { __error: true, message: res?.error || tr("sbErrSave") };
  return { ok: true, record: res.record };
}

// اقدام/ردِ یک پیشنهاد — یادداشت برایِ رد الزامی است، دقیقاً همان قاعده‌ی
// rejectSurveyRequest.
export async function actionSuggestion(id, status, note, actorName) {
  if (status === "rejected" && !note?.trim()) return { __error: true, message: tr("sbErrRejectNoteRequired") };
  const res = await offlineWrite({
    module: "safetySuggestions", table: "safety_suggestions", action: "update", id,
    payload: { status, action_note: note?.trim() || "", actioned_by: actorName || "", actioned_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  });
  if (!res?.ok) return { __error: true, message: res?.error || tr("sbErrSave") };
  return { ok: true };
}

// رأی‌دادن یک کنشِ اتمیک است (نه یک فرم چندفیلدی)، پس بدونِ local-draft:
// اگر رأیِ این کاربر از قبل هست حذفش می‌کنیم (toggle off)، وگرنه اضافه.
export async function toggleVote(suggestionId, voterAccountType, voterAccountId) {
  const companyId = getCurrentCompanyId();
  const filter = `suggestion_id=eq.${suggestionId}&voter_account_id=eq.${encodeURIComponent(voterAccountId)}`;
  const existing = await sb(`safety_suggestion_votes?${filter}&select=id`);
  if (sbOk(existing) && existing.length > 0) {
    const res = await offlineWrite({ module: "safetySuggestionVotes", table: "safety_suggestion_votes", action: "delete", id: existing[0].id });
    return res?.ok ? { ok: true, voted: false } : { __error: true, message: res?.error || tr("sbErrSave") };
  }
  const id = uid("vote");
  const res = await offlineWrite({
    module: "safetySuggestionVotes", table: "safety_suggestion_votes", action: "insert", id,
    payload: { suggestion_id: suggestionId, company_id: companyId, voter_account_type: voterAccountType, voter_account_id: voterAccountId },
  });
  return res?.ok ? { ok: true, voted: true } : { __error: true, message: res?.error || tr("sbErrSave") };
}

export async function loadMyVotedSuggestionIds(voterAccountId) {
  if (!voterAccountId) return new Set();
  const rows = await sb(`safety_suggestion_votes?voter_account_id=eq.${encodeURIComponent(voterAccountId)}&select=suggestion_id`);
  if (!sbOk(rows)) return new Set();
  return new Set(rows.map((r) => r.suggestion_id));
}
