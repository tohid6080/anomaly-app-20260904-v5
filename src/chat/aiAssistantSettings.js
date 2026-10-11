// تنظیمات هوشِ مصنوعیِ شخصیِ هر کاربر — برایِ «دستیار آموزشی HSE» (ماژولِ
// چت). هر کاربر کلیدِ API خودش را واردِ سامانه می‌کند؛ این کلید هرگز به
// بک‌اند/دیتابیسِ IHMS فرستاده یا در جایی ثبت نمی‌شود — تمامِ درخواست‌ها
// مستقیماً از مرورگرِ خودِ کاربر به سرویسِ ارائه‌دهنده (Gemini، ChatGPT یا
// DeepSeek) ارسال می‌شوند. هزینه و مسئولیتِ استفاده از کلید، کاملاً بر عهدهٔ
// خودِ کاربر و ارائه‌دهندهٔ هوشِ مصنوعی است.
//
// دو لایهٔ ذخیره‌سازی (طبقِ قاعدهٔ صریحِ کاربر — پیش‌فرض موقت است):
//   ۱) نشست (session) — فقط در حافظهٔ جاوااسکریپتِ همین تبِ باز، با بستنِ
//      صفحه/رفرش از بین می‌رود. این حالتِ پیش‌فرض است.
//   ۲) دستگاه (device) — در localStorage، فقط اگر کاربر صریحاً گزینهٔ
//      «ذخیره روی این دستگاه» را فعال کند تا نیاز به واردکردنِ دوبارهٔ کلید
//      در هر بازدید نباشد.
// هر دو لایه با نامِ کاربری جدا می‌شوند (الگویِ موجودِ `ihms_profile_photo_${username}`
// در App.jsx) تا کلیدِ هیچ کاربری با کاربرِ دیگر قاطی نشود.

const DEVICE_KEY_PREFIX = "ihms_ai_settings_";

function deviceKey(username) {
  return `${DEVICE_KEY_PREFIX}${username || "anon"}`;
}

// نشست: فقط در حافظه، هرگز روی دیسک نوشته نمی‌شود.
const _sessionSettings = new Map();
// آخرین نتیجهٔ واقعاً-آزمایش‌شدهٔ اتصال، برایِ هر کاربر، فقط در همین نشست
// (برایِ نمایشِ یک نشانگرِ سبک در رابطِ کاربری، بدونِ تست مجددِ هر بار).
const _lastVerifiedStatus = new Map();

export const AI_PROVIDERS = [
  {
    key: "gemini",
    nameKey: "aiProviderGemini",
    getKeyUrl: "https://aistudio.google.com/app/apikey",
    guideKey: "aiProviderGeminiGuide",
    model: "gemini-3-flash-preview",
    family: "gemini",
  },
  {
    key: "openai",
    nameKey: "aiProviderOpenai",
    getKeyUrl: "https://platform.openai.com/api-keys",
    guideKey: "aiProviderOpenaiGuide",
    model: "gpt-4o-mini",
    family: "openai",
    apiBase: "https://api.openai.com/v1",
  },
  {
    key: "deepseek",
    nameKey: "aiProviderDeepseek",
    getKeyUrl: "https://platform.deepseek.com/api_keys",
    guideKey: "aiProviderDeepseekGuide",
    model: "deepseek-chat",
    family: "openai",
    apiBase: "https://api.deepseek.com",
  },
];

export function getProviderMeta(providerKey) {
  return AI_PROVIDERS.find((p) => p.key === providerKey) || AI_PROVIDERS[0];
}

function readDeviceSettings(username) {
  try {
    const raw = localStorage.getItem(deviceKey(username));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.apiKey) return null;
    return { provider: parsed.provider || "gemini", apiKey: parsed.apiKey };
  } catch {
    return null;
  }
}

function writeDeviceSettings(username, settings) {
  try {
    if (!settings) { localStorage.removeItem(deviceKey(username)); return; }
    localStorage.setItem(deviceKey(username), JSON.stringify({ provider: settings.provider, apiKey: settings.apiKey }));
  } catch {
    // بی‌اهمیت — اگر localStorage در دسترس نبود (مثلاً حالتِ خصوصیِ مرورگر)
  }
}

/** تنظیماتِ فعلیِ کاربر را برمی‌گرداند — اول نشست، بعد دستگاه. */
export function getAiSettings(username) {
  if (!username) return null;
  if (_sessionSettings.has(username)) return _sessionSettings.get(username);
  return readDeviceSettings(username);
}

/** آیا این مقدار از لایهٔ «دستگاه» (localStorage) آمده، نه فقط نشست؟ — برایِ پیش‌پرکردنِ چک‌باکسِ «به‌خاطر بسپار». */
export function isRememberedOnDevice(username) {
  return !!readDeviceSettings(username);
}

/** ذخیرهٔ تنظیماتِ تازه. `remember=true` یعنی رویِ دستگاه هم نگه داشته شود؛ در غیرِاین‌صورت فقط برایِ همین نشست. */
export function saveAiSettings(username, { provider, apiKey, remember }) {
  if (!username) return;
  const value = { provider, apiKey };
  _sessionSettings.set(username, value);
  writeDeviceSettings(username, remember ? value : null);
}

/** حذفِ کاملِ کلید از هر دو لایه. */
export function clearAiSettings(username) {
  if (!username) return;
  _sessionSettings.delete(username);
  writeDeviceSettings(username, null);
  _lastVerifiedStatus.delete(username);
}

export function setLastVerifiedStatus(username, status) {
  if (username) _lastVerifiedStatus.set(username, status);
}
export function getLastVerifiedStatus(username) {
  return (username && _lastVerifiedStatus.get(username)) || null;
}

/* ============================================================
 * اتصالِ مستقیمِ مرورگر به سرویسِ ارائه‌دهنده — بدونِ هیچ واسطِ بک‌اندی.
 * Gemini با هدرِ x-goog-api-key، و ChatGPT/DeepSeek (هر دو با فرمتِ
 * یکسانِ OpenAI-compatible: chat/completions) با هدرِ
 * Authorization: Bearer احرازِ هویت می‌شوند — در هر دو حالت کلید فقط در
 * هدرِ درخواست است، نه در URL — تا هیچ‌جا (تاریخچهٔ مرورگر، لاگِ پراکسی،
 * پیامِ خطا) دیده نشود.
 * ============================================================ */

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

function classifyHttpError(status) {
  if (status === 400 || status === 401 || status === 403) return "invalid_key";
  if (status === 429) return "quota";
  return "unknown";
}

function probeRequest(meta, key) {
  if (meta.family === "gemini") {
    return { url: `${GEMINI_BASE}/models?pageSize=1`, headers: { "x-goog-api-key": key } };
  }
  return { url: `${meta.apiBase}/models`, headers: { Authorization: `Bearer ${key}` } };
}

/**
 * یک درخواستِ POST با تلاشِ مجددِ نماییِ‌تاخیر (تا ۳ بار)؛ رویِ خطایِ کلید
 * یا سهمیه، تلاشِ مجدد بی‌فایده است و همان لحظه برمی‌گردد.
 */
async function postJsonWithRetry(url, headers, body) {
  let delay = 900;
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        return { ok: true, data };
      }
      const kind = classifyHttpError(res.status);
      if (kind === "invalid_key" || kind === "quota") return { ok: false, kind, httpStatus: res.status };
      if (attempt === maxAttempts) return { ok: false, kind: "unknown", httpStatus: res.status };
    } catch {
      if (attempt === maxAttempts) return { ok: false, kind: "network" };
    }
    await new Promise((resolve) => setTimeout(resolve, delay));
    delay *= 2;
  }
  return { ok: false, kind: "network" };
}

/**
 * یک درخواستِ سبک (فهرستِ مدل‌ها، بدونِ مصرفِ سهمیهٔ تولیدِ محتوا) برایِ
 * تاییدِ واقعیِ اعتبارِ کلید — نه صرفاً ذخیره‌شدنِ آن.
 */
export async function testAiConnection({ provider, apiKey }) {
  const meta = getProviderMeta(provider);
  const key = (apiKey || "").trim();
  if (!key) return { ok: false, kind: "invalid_key" };
  try {
    const { url, headers } = probeRequest(meta, key);
    const res = await fetch(url, { method: "GET", headers });
    if (res.ok) return { ok: true };
    return { ok: false, kind: classifyHttpError(res.status), httpStatus: res.status };
  } catch {
    return { ok: false, kind: "network" };
  }
}

/**
 * ساختِ پاسخِ واقعیِ هوشِ مصنوعی با حفظِ زمینهٔ مکالمه (چندنوبتی). `history`
 * آرایه‌ای از پیام‌هایِ قبلیِ همین گفت‌وگوست ({who:"mine"|"ai", text}).
 * `contextText` در صورتِ وجود (مثلاً محتوایِ مرتبطِ بانکِ دانشِ محلی)، به‌عنوانِ
 * زمینهٔ اضافی به آخرین پیامِ کاربر افزوده می‌شود. فرمتِ درخواست بر اساسِ
 * `meta.family` ارائه‌دهنده انتخاب می‌شود (gemini یا openai-compatible).
 */
export async function generateAiReply({ provider, apiKey, systemPrompt, history, contextText }) {
  const meta = getProviderMeta(provider);
  const key = (apiKey || "").trim();
  if (!key) return { ok: false, kind: "invalid_key" };

  // فقط چند نوبتِ آخر برایِ محدودکردنِ حجم/هزینهٔ هر درخواست.
  const recent = (history || []).slice(-16);
  if (!recent.length) return { ok: false, kind: "unknown" };

  if (meta.family === "gemini") {
    const contents = recent.map((m, i) => {
      const isLast = i === recent.length - 1;
      const text = isLast && contextText ? `${contextText}\n\n${m.text}` : m.text;
      return { role: m.who === "mine" ? "user" : "model", parts: [{ text }] };
    });
    const result = await postJsonWithRetry(
      `${GEMINI_BASE}/models/${meta.model}:generateContent`,
      { "x-goog-api-key": key },
      { contents, systemInstruction: { parts: [{ text: systemPrompt }] } },
    );
    if (!result.ok) return result;
    const text = result.data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
    if (!text) return { ok: false, kind: "unknown" };
    return { ok: true, text };
  }

  // خانوادهٔ سازگار با OpenAI (ChatGPT، DeepSeek) — فرمتِ chat/completions مشترک.
  const messages = [{ role: "system", content: systemPrompt }];
  recent.forEach((m, i) => {
    const isLast = i === recent.length - 1;
    const content = isLast && contextText ? `${contextText}\n\n${m.text}` : m.text;
    messages.push({ role: m.who === "mine" ? "user" : "assistant", content });
  });
  const result = await postJsonWithRetry(
    `${meta.apiBase}/chat/completions`,
    { Authorization: `Bearer ${key}` },
    { model: meta.model, messages },
  );
  if (!result.ok) return result;
  const text = result.data?.choices?.[0]?.message?.content || "";
  if (!text) return { ok: false, kind: "unknown" };
  return { ok: true, text };
}
