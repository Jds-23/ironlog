const MAX_LENGTH = 6;

export type NumpadMode = "weight" | "reps";
export type NumpadKey =
  | "0"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "."
  | "backspace";

export function processNumpadInput(current: string, key: NumpadKey, mode: NumpadMode): string {
  if (key === "backspace") {
    return current.slice(0, -1);
  }

  if (key === ".") {
    if (mode === "reps") return current;
    if (current.includes(".")) return current;
    if (current === "") return "0.";
    return current + ".";
  }

  // Digit
  if (current.length >= MAX_LENGTH) return current;
  if (current === "0") return key;
  return current + key;
}

export function formatNumpadDisplay(value: string): string {
  return value === "" ? "\u2014" : value;
}
