import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  // زمان واقعی اجرای build، برای نمایش صادقانه در صفحه‌ی «درباره‌ی IHMS» —
  // نه یک عدد ساختگی، بلکه دقیقاً همان لحظه‌ای که npm run build اجرا شده.
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  build: {
    // Code splitting: کتابخانه‌های پایه در چانک‌های ثابتِ جدا تا cache بلندمدت
    // بگیرند و از چانکِ اپ جدا بمانند. کتابخانه‌های سنگینِ خروجی/بکاپ
    // (xlsx / exceljs / jszip) عمداً اینجا نیستند — آن‌ها با import()‎ پویا
    // فقط هنگام کلیکِ کاربر روی «خروجی» بارگذاری می‌شوند.
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom"],
          "vendor-icons": ["lucide-react"],
        },
      },
    },
  },
});
