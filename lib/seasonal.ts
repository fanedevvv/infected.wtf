// Halloween theme window: October 1 → November 1 (inclusive), in the visitor's local time.
// Kept as a string so the same check can run in the inline <head> script before first paint.
export const HALLOWEEN_CHECK = "(function(d){var m=d.getMonth();return m===9||(m===10&&d.getDate()===1)})(new Date())";

export function isHalloween(d = new Date()) {
  const m = d.getMonth();
  return m === 9 || (m === 10 && d.getDate() === 1);
}
