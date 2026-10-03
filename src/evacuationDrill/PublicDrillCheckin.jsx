import React, { useState, useEffect } from "react";
import { CheckCircle2, Siren, AlertTriangle } from "lucide-react";
import { THEME, styles } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { loadPublicMusterPointInfo, submitDrillCheckin } from "./evacuationDrillApi.js";

// صفحه‌یِ عمومیِ چک‌این — با اسکنِ QR یک نقطه‌یِ تجمع باز می‌شود
// (#drill-checkin/<checkin_token> در App.jsx). بدونِ نیاز به ورود.
export default function PublicDrillCheckin({ checkinToken }) {
  const { t, dir } = useLanguage();
  const [info, setInfo] = useState(undefined); // undefined=loading
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(null); // {musterPointName, drillTitle}

  useEffect(() => { loadPublicMusterPointInfo(checkinToken).then(setInfo); }, [checkinToken]);

  const submit = async () => {
    if (!name.trim()) { setError(t("edErrNameRequired")); return; }
    setError("");
    setSaving(true);
    const res = await submitDrillCheckin(checkinToken, name.trim());
    setSaving(false);
    if (res.__error) { setError(res.message); return; }
    setDone(res);
  };

  return (
    <div style={{ minHeight: "100vh", background: THEME.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: THEME.font }} dir={dir}>
      <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 14, padding: 24, maxWidth: 380, width: "100%", textAlign: "center" }}>
        {info === undefined ? (
          <p style={{ color: THEME.text3, fontSize: 13 }}>{t("commonLoading")}</p>
        ) : !info || info.__error ? (
          <>
            <AlertTriangle size={32} color={THEME.danger} style={{ marginBottom: 10 }} />
            <p style={{ color: THEME.danger, fontSize: 13, fontWeight: 600 }}>{info?.message || t("edErrInvalidLink")}</p>
          </>
        ) : done ? (
          <>
            <CheckCircle2 size={36} color={THEME.ok} style={{ marginBottom: 10 }} />
            <p style={{ fontWeight: 700, fontSize: 15, color: THEME.heading, marginBottom: 4 }}>{t("edCheckinSuccessTitle")}</p>
            <p style={{ fontSize: 12.5, color: THEME.text3 }}>{done.musterPointName} — {done.drillTitle}</p>
          </>
        ) : !info.canCheckin ? (
          <>
            <AlertTriangle size={32} color={THEME.warn} style={{ marginBottom: 10 }} />
            <p style={{ fontWeight: 700, fontSize: 14, color: THEME.heading, marginBottom: 4 }}>{info.drillTitle}</p>
            <p style={{ color: THEME.text3, fontSize: 12.5 }}>{t("edDrillNotActive")}</p>
          </>
        ) : (
          <>
            <Siren size={30} color={THEME.danger} style={{ marginBottom: 8 }} />
            <p style={{ fontWeight: 700, fontSize: 15, color: THEME.heading, marginBottom: 2 }}>{info.drillTitle}</p>
            <p style={{ fontSize: 12.5, color: THEME.text3, marginBottom: 14 }}>{info.musterPointName}</p>
            <input
              style={{ ...styles.input, textAlign: "center", marginBottom: 10 }}
              value={name} onChange={(e) => setName(e.target.value)}
              placeholder={t("edParticipantNamePlaceholder")} dir={dir}
            />
            {error && <p style={{ color: THEME.danger, fontSize: 12, marginBottom: 8 }}>{error}</p>}
            <button
              onClick={submit} disabled={saving}
              style={{ width: "100%", padding: "11px 0", borderRadius: 9, border: "none", background: THEME.heading, color: "#fff", fontWeight: 700, fontSize: 13.5, cursor: "pointer" }}
            >
              {saving ? t("commonLoading") : t("edCheckinBtn")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
