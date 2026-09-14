import { registerPushToken } from "./chatApi.js";

/**
 * ثبتِ دستگاه برای اعلانِ Push واقعیِ چت — فقط روی اپِ نیتیوِ اندروید
 * (Capacitor) کاری می‌کند؛ روی نسخه‌ی وب بی‌صدا هیچ کاری نمی‌کند، دقیقاً
 * هم‌الگویِ بررسیِ Capacitor.isNativePlatform() در App.jsx (سیگنالِ
 * appStateChange). اجازه‌ی اعلان از کاربر می‌خواهد؛ بعد از دریافتِ توکنِ
 * دستگاه از FCM، آن را با registerPushToken سمتِ سرور ذخیره می‌کند.
 *
 * هر خطا (پلاگین نبود، کاربر اجازه نداد، Firebase هنوز پیکربندی نشده...)
 * عمداً بی‌صدا نادیده گرفته می‌شود — این یک قابلیتِ تکمیلی است، نباید
 * جریانِ ورود یا کارِ اصلیِ اپ را مختل کند.
 */
export async function initPushNotifications(currentUser) {
  if (!currentUser?.username) return;
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return;
    const { PushNotifications } = await import("@capacitor/push-notifications");

    let permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === "prompt" || permStatus.receive === "prompt-with-rationale") {
      permStatus = await PushNotifications.requestPermissions();
    }
    if (permStatus.receive !== "granted") return;

    await PushNotifications.removeAllListeners();
    await PushNotifications.addListener("registration", (token) => {
      registerPushToken(currentUser.username, token.value, "android");
    });
    await PushNotifications.addListener("registrationError", () => {
      // بی‌اهمیت — طبق توضیحِ بالا
    });

    await PushNotifications.register();
  } catch {
    // پلاگین نبود یا Firebase پیکربندی نشده — بی‌اهمیت
  }
}
