import React from "react";

/**
 * پوششِ نازک برای آیکون‌های lucide که اندازه و ضخامتِ خط را از توکن‌های
 * ظاهریِ سامانه می‌گیرد (`--ihms-icon-size` / `--ihms-icon-stroke`) به‌جای
 * عددِ ثابت. چون این‌ها CSS- اند، روی هر آیکونی که با <TIcon/> رندر شود
 * اعمال می‌شوند و با تنظیمِ سوپرادمین در «ظاهر سامانه» زنده تغییر می‌کنند.
 *
 * استفاده: <TIcon icon={Bell} color={THEME.text2} />
 * پراپ‌های size/strokeWidth عمداً پذیرفته می‌شوند تا در موارد خاص بشود
 * توکن را override کرد؛ در حالت عادی ندهیدشان تا توکن حاکم باشد.
 */
export function TIcon({ icon: Icon, size, strokeWidth, style, ...rest }) {
  if (!Icon) return null;
  return (
    <Icon
      size={size}
      strokeWidth={strokeWidth}
      style={{
        width: size == null ? "var(--ihms-icon-size, 16px)" : undefined,
        height: size == null ? "var(--ihms-icon-size, 16px)" : undefined,
        strokeWidth: strokeWidth == null ? "var(--ihms-icon-stroke, 2)" : undefined,
        flexShrink: 0,
        ...style,
      }}
      {...rest}
    />
  );
}
