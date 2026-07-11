// The colony has villas numbered 073 through 106 (34 villas).
const FIRST = 73;
const LAST = 106;

export const VILLA_NUMBERS = Array.from(
  { length: LAST - FIRST + 1 },
  (_, i) => String(FIRST + i).padStart(3, "0")
);

export const VILLAS = VILLA_NUMBERS.map((n) => `villa-${n}`);

export function villaLabel(villaId) {
  return (villaId || "").replace("villa-", "Villa ");
}

export function defaultPasswordFor(villaId) {
  return villaId;
}
