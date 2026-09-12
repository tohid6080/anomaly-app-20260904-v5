import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../shared.js";

/**
 * «جلسه‌ی آنلاینِ PSSR» — همگام‌سازیِ زنده + واگذاریِ کنترل، بدونِ تماسِ
 * تصویری/صوتی (طبقِ گزینه‌ی تأییدشده). زیرساخت: Supabase Realtime
 * (Broadcast + Presence) — تنها جایی در کل پروژه که از @supabase/supabase-js
 * استفاده می‌شود؛ بقیه‌ی داده‌ها همچنان از همان sb() (REST) در shared.js رد
 * می‌شوند. این کانال هرگز مستقیم در دیتابیس نمی‌نویسد — فقط بینِ دستگاه‌های
 * آنلاین در همان جلسه sync می‌کند؛ ثبتِ واقعی همچنان فقط با کلیکِ «ثبتِ
 * نتایجِ این جلسه» (submitMeetingResponses در pssrMeetingsApi.js) انجام
 * می‌شود — یعنی قراردادِ «پیش‌نویسِ محلی، ثبتِ صریح» پروژه اینجا هم دست‌نخورده می‌ماند.
 */

let _client = null;
function client() {
  if (!_client) _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return _client;
}

// presence.key باید به‌ازایِ هر دستگاه/کاربرِ متصل یکتا باشد
export function createMeetingChannel(meetingId, presenceKey) {
  return client().channel(`pssr-meeting-${meetingId}`, {
    config: { presence: { key: presenceKey }, broadcast: { self: false, ack: false } },
  });
}

/**
 * handlers: { onDraftChange(payload), onFloorControl(payload), onPresenceSync(list) }
 * myPresence: { id, name, discipline } — بعدِ اتصالِ موفق track می‌شود تا نوارِ
 * حضور نشان دهد این کاربر با چه Discipline ای آنلاین است.
 */
export function subscribeMeetingChannel(channel, handlers, myPresence) {
  channel
    .on("broadcast", { event: "draft_change" }, ({ payload }) => handlers.onDraftChange?.(payload))
    .on("broadcast", { event: "floor_control" }, ({ payload }) => handlers.onFloorControl?.(payload))
    .on("presence", { event: "sync" } , () => {
      const state = channel.presenceState();
      const list = Object.values(state).map((entries) => entries[0]);
      handlers.onPresenceSync?.(list);
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED" && myPresence) channel.track(myPresence);
      handlers.onStatusChange?.(status);
    });
  return channel;
}

export function sendDraftChange(channel, payload) {
  channel.send({ type: "broadcast", event: "draft_change", payload });
}

export function sendFloorControl(channel, payload) {
  channel.send({ type: "broadcast", event: "floor_control", payload });
}

export function leaveMeetingChannel(channel) {
  if (channel) client().removeChannel(channel);
}
