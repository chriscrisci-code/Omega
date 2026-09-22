export function maybePhone() {
  const touch = (navigator.maxTouchPoints || 0) > 0;
  const coarse = window.matchMedia?.("(pointer: coarse)")?.matches;
  const narrow = Math.min(window.innerWidth, window.innerHeight) < 820;
  const mobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");
  return Boolean((coarse && touch) || mobile || (touch && narrow));
}
