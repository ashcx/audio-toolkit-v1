/** Every browser on iPhone and iPad runs on WebKit, and iPadOS Safari reports itself as a Mac, so touch tells them apart. */
export function isAppleMobile(navigatorLike: { userAgent: string; platform?: string; maxTouchPoints?: number }): boolean {
  return /iPhone|iPad|iPod/.test(navigatorLike.userAgent) ||
    (navigatorLike.platform === "MacIntel" && (navigatorLike.maxTouchPoints ?? 0) > 1);
}
