import React, { useState, useEffect, useRef } from "react";
import { Users } from "lucide-react";
import { THEME } from "../shared.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { loadCheckinsForDrill } from "./evacuationDrillApi.js";
import { toJalaliDateTime } from "../personnel/jalaliDate.jsx";

// رسترِ زنده‌یِ حضور — هر ۷ ثانیه از نو می‌خواند (الگویِ پولینگِ LiveChatAdminDock).
export default function EvacuationDrillLiveRoster({ drillId, musterPoints }) {
  const { t, dir } = useLanguage();
  const [checkins, setCheckins] = useState([]);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!drillId) return;
    const poll = () => loadCheckinsForDrill(drillId).then(setCheckins);
    poll();
    timerRef.current = setInterval(poll, 7000);
    return () => clearInterval(timerRef.current);
  }, [drillId]);

  const byMuster = {};
  checkins.forEach((c) => {
    (byMuster[c.musterPointId] = byMuster[c.musterPointId] || []).push(c);
  });

  return (
    <div dir={dir}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <Users size={16} color={THEME.heading} />
        <span style={{ fontWeight: 700, fontSize: 13.5, color: THEME.heading }}>{t("edLiveRosterTitle")}</span>
        <span style={{ fontSize: 12, color: THEME.text3 }}>({t("edTotalCheckedIn", { count: checkins.length })})</span>
      </div>
      {(musterPoints || []).length === 0 ? (
        <p style={{ fontSize: 12, color: THEME.text3 }}>{t("edNoMusterPoints")}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {musterPoints.map((mp) => {
            const list = byMuster[mp.id] || [];
            return (
              <div key={mp.id} style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 10, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 12.5, color: THEME.heading, marginBottom: list.length ? 8 : 0 }}>
                  <span>{mp.name}</span>
                  <span style={{ color: THEME.ok }}>{list.length}</span>
                </div>
                {list.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {list.map((c) => (
                      <div key={c.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: THEME.text3 }}>
                        <span>{c.participantName}</span>
                        <span>{toJalaliDateTime(c.checkedInAt)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
