import { processNumpadInput, formatNumpadDisplay } from "../numpad";

describe("processNumpadInput", () => {
  describe("digit input", () => {
    it("appends digit to empty string", () => {
      expect(processNumpadInput("", "5", "weight")).toBe("5");
    });

    it("appends digit to existing value", () => {
      expect(processNumpadInput("12", "3", "weight")).toBe("123");
    });

    it("replaces leading zero with non-zero digit", () => {
      expect(processNumpadInput("0", "5", "weight")).toBe("5");
    });

    it("allows 0 after decimal point", () => {
      expect(processNumpadInput("1.", "0", "weight")).toBe("1.0");
    });

    it("enforces max 6 chars", () => {
      expect(processNumpadInput("123456", "7", "weight")).toBe("123456");
    });

    it("counts decimal point in max length", () => {
      expect(processNumpadInput("12.45", "6", "weight")).toBe("12.456");
      expect(processNumpadInput("12.456", "7", "weight")).toBe("12.456");
    });
  });

  describe("decimal input", () => {
    it("adds decimal in weight mode", () => {
      expect(processNumpadInput("12", ".", "weight")).toBe("12.");
    });

    it("prevents duplicate decimal", () => {
      expect(processNumpadInput("12.5", ".", "weight")).toBe("12.5");
    });

    it("ignores decimal in reps mode", () => {
      expect(processNumpadInput("12", ".", "reps")).toBe("12");
    });

    it("adds leading zero before decimal if empty", () => {
      expect(processNumpadInput("", ".", "weight")).toBe("0.");
    });
  });

  describe("backspace", () => {
    it("removes last character", () => {
      expect(processNumpadInput("123", "backspace", "weight")).toBe("12");
    });

    it("returns empty from single char", () => {
      expect(processNumpadInput("5", "backspace", "weight")).toBe("");
    });

    it("no-op on empty string", () => {
      expect(processNumpadInput("", "backspace", "weight")).toBe("");
    });
  });
});

describe("formatNumpadDisplay", () => {
  it("returns dash for empty string", () => {
    expect(formatNumpadDisplay("")).toBe("—");
  });

  it("returns value as-is for non-empty", () => {
    expect(formatNumpadDisplay("135")).toBe("135");
  });

  it("returns value with decimal", () => {
    expect(formatNumpadDisplay("12.5")).toBe("12.5");
  });
});
