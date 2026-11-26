import { describe, it, expect } from "vitest";
import { exerciseFormToObject, exerciseSchema, parseVideoUrl } from "./exercises";

describe("parseVideoUrl", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ?si=abc", "dQw4w9WgXcQ"],
    ["https://youtube.com/shorts/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=10", "dQw4w9WgXcQ"],
  ])("YouTube %s", (url, id) => {
    expect(parseVideoUrl(url)).toMatchObject({ provider: "youtube", id });
  });
  it("Vimeo con hash de video privado", () => {
    expect(parseVideoUrl("https://vimeo.com/123456789/abcdef1234")).toMatchObject({
      provider: "vimeo",
      embedUrl: "https://player.vimeo.com/video/123456789?h=abcdef1234",
    });
  });
  it("rechaza otros sitios", () => {
    expect(parseVideoUrl("https://example.com/video.mp4")).toBeNull();
    expect(parseVideoUrl("no es url")).toBeNull();
  });
});

describe("exerciseSchema", () => {
  const fd = (e: [string, string][]) => {
    const f = new FormData();
    e.forEach(([k, v]) => f.append(k, v));
    return f;
  };
  it("normaliza el enlace del video", () => {
    const r = exerciseSchema.safeParse(
      exerciseFormToObject(fd([["name", "Sentadilla"], ["category", "fuerza"], ["video_url", "https://youtu.be/dQw4w9WgXcQ"], ["unilateral", "on"]])),
    );
    expect(r.success && r.data.video_url).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(r.success && r.data.unilateral).toBe(true);
  });
  it("exige categoría válida y video reconocible", () => {
    expect(exerciseSchema.safeParse(exerciseFormToObject(fd([["name", "X1"], ["category", "otra"]]))).success).toBe(false);
    expect(
      exerciseSchema.safeParse(exerciseFormToObject(fd([["name", "X1"], ["category", "fuerza"], ["video_url", "https://x.com/v"]]))).success,
    ).toBe(false);
  });
});
