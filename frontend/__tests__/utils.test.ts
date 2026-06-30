import { initialsFromName } from "../components/tpo-dashboard/utils";

describe("initialsFromName", () => {
  it("returns T for undefined", () => {
    expect(initialsFromName(undefined)).toBe("T");
  });

  it("returns T for empty string", () => {
    expect(initialsFromName("")).toBe("T");
  });

  it("returns T for whitespace-only string", () => {
    expect(initialsFromName("   ")).toBe("T");
  });

  it("returns first 2 chars uppercased for single word", () => {
    expect(initialsFromName("Prince")).toBe("PR");
  });

  it("returns single char uppercased for 1-char single word", () => {
    expect(initialsFromName("A")).toBe("A");
  });

  it("returns first + last initial for two words", () => {
    expect(initialsFromName("John Doe")).toBe("JD");
  });

  it("returns first + last initial for three words", () => {
    expect(initialsFromName("John Michael Doe")).toBe("JD");
  });

  it("handles extra whitespace between words", () => {
    expect(initialsFromName("  Jane   Smith  ")).toBe("JS");
  });

  it("uppercases lowercase initials", () => {
    expect(initialsFromName("alice bob")).toBe("AB");
  });
});
