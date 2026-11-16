export type DeviceClass = "apple-mobile" | "android" | "desktop";
/**
 * Every browser on iPhone and iPad runs on WebKit, and iPadOS Safari reports itself as a Mac, so touch tells
 * them apart. Anything that is neither Apple mobile nor Android is treated as a desktop.
 */
export function deviceClass(navigatorLike: { userAgent: string; platform?: string; maxTouchPoints?: number }): DeviceClass {
  if (/iPhone|iPad|iPod/.test(navigatorLike.userAgent) ||
    (navigatorLike.platform === "MacIntel" && (navigatorLike.maxTouchPoints ?? 0) > 1)) return "apple-mobile";
  return /Android/.test(navigatorLike.userAgent) ? "android" : "desktop";
}
