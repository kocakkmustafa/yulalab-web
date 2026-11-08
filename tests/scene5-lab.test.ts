import { describe, expect, it } from "vitest";
import { notes } from "@/data/notes";
import { pickNoteText } from "@/components/landing/scene5-lab";

describe("pickNoteText", () => {
  it("returns the wanted language when it was written", () => {
    expect(pickNoteText({ tr: "merhaba", en: "hello" }, "tr")).toEqual({ text: "merhaba", lang: "tr", translated: true });
    expect(pickNoteText({ tr: "merhaba", en: "hello" }, "en")).toEqual({ text: "hello", lang: "en", translated: true });
  });
  it("never invents a translation: falls back to the other language and says so", () => {
    expect(pickNoteText({ tr: "yalnız Türkçe", en: "  " }, "en")).toEqual({ text: "yalnız Türkçe", lang: "tr", translated: false });
    expect(pickNoteText({ tr: "", en: "English only" }, "tr")).toEqual({ text: "English only", lang: "en", translated: false });
  });
  it("every real note has a title, a body and a real ISO date", () => {
    for (const n of notes) {
      expect(n.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(pickNoteText(n.title, "tr").text).not.toBe("");
      expect(pickNoteText(n.body, "en").text).not.toBe("");
    }
  });
});
