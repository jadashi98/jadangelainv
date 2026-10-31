/** Hard ceiling: no guest may ever upload more than this, whatever the admin setting says. */
export const MAX_PHOTOS_PER_GUEST = 25;
export const MAX_PHOTO_BYTES = 25 * 1024 * 1024;
export const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

export function effectiveLimit(setting: unknown): number {
  const n = Math.floor(Number(setting));
  if (!Number.isFinite(n) || n < 1) return MAX_PHOTOS_PER_GUEST;
  return Math.min(n, MAX_PHOTOS_PER_GUEST);
}
