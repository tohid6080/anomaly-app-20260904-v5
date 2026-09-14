import { HSE_LEARNING_TOPICS, DEFAULT_TOPIC_KEY, TOPICS_BY_KEY } from "./hseLearningContent.js";

function textOf(a) {
  return [a.category, a.format, a.area, a.description].join(" ").toLowerCase();
}

/**
 * موضوعِ آموزشیِ پیشنهادی را از روی متنِ آزادِ آنومالی‌های اخیر تشخیص
 * می‌دهد — شمارشِ ساده‌ی کلیدواژه، نه هوش مصنوعیِ واقعی (طبق تصمیمِ
 * کاربر برای نسخهٔ اول). اگر هیچ کلیدواژه‌ای تطبیق نخورد، موضوعِ عمومی
 * (DEFAULT_TOPIC_KEY) برگردانده می‌شود تا همیشه چیزی برای نمایش باشد.
 */
export function pickRecommendedTopic(anomalies) {
  const scored = HSE_LEARNING_TOPICS
    .filter((topic) => topic.matchKeywords.length > 0)
    .map((topic) => {
      let count = 0;
      for (const a of anomalies) {
        const text = textOf(a);
        if (topic.matchKeywords.some((k) => text.includes(k.toLowerCase()))) count++;
      }
      return { topic, count };
    })
    .sort((a, b) => b.count - a.count);

  const best = scored[0];
  if (best && best.count > 0) return { topic: best.topic, matchCount: best.count };
  return { topic: TOPICS_BY_KEY[DEFAULT_TOPIC_KEY], matchCount: 0 };
}

/**
 * آزمونِ فعالِ واقعی که عنوانش با کلیدواژه‌های این موضوع هم‌خوانی دارد را
 * پیدا می‌کند. اگر چیزی پیدا نشود null برمی‌گردد — هرگز چیزی جعل نمی‌شود.
 */
export function matchSurveyForTopic(topic, surveys) {
  const active = (surveys || []).filter((s) => s.status === "active");
  for (const s of active) {
    const title = (s.title || "").toLowerCase();
    if ((topic.examKeywords || []).some((k) => title.includes(k.toLowerCase()))) return s;
  }
  return null;
}

// موتورِ پاسخ‌دهیِ مبتنی بر قوانینِ محلی — دیگر مسیرِ اصلی نیست؛ فقط
// fallback آفلاین/خطا برای askHseAssistant (پاسخِ واقعیِ DeepSeek) است،
// برای وقتی کلید API تنظیم نشده یا شبکه در دسترس نیست. نگاشتِ کلیدواژه در
// سؤالِ کاربر → موضوعِ مرتبط. افزودنِ قانونِ جدید یعنی یک سطرِ دیگر به این آرایه.
const RULES = [
  { keywords: ["ارتفاع", "هارنس", "لنیارد", "سقوط"], topicKey: "height" },
  { keywords: ["برق", "ولتاژ", "شوک", "اتصال کوتاه", "کابل"], topicKey: "electrical" },
  { keywords: ["جرثقیل", "ریگینگ", "اسلینگ", "باربرداری"], topicKey: "lifting" },
  { keywords: ["ppe", "حفاظت فردی", "دستکش", "کلاه", "عینک"], topicKey: "ppe" },
  { keywords: ["داربست", "اسکافولد"], topicKey: "scaffold" },
];

export function answerQuestion(question) {
  const q = (question || "").toLowerCase();
  for (const rule of RULES) {
    if (rule.keywords.some((k) => q.includes(k))) {
      const topic = TOPICS_BY_KEY[rule.topicKey];
      if (topic) return { text: topic.quickAnswer, topic };
    }
  }
  return { text: null, topic: null };
}
