import { describe, expect, it } from "vitest";
import { sortMangaFiles } from "./sort-files.js";

describe("sortMangaFiles", () => {
  it("uses natural filename order for numbered manga pages", () => {
    const files = ["10.png", "2.png", "001.png", "11.png"].map(
      (name) => new File([name], name, { type: "image/png" })
    );

    expect(sortMangaFiles(files).map((file) => file.name)).toEqual([
      "001.png",
      "2.png",
      "10.png",
      "11.png"
    ]);
  });

  it("keeps the selection order when filenames compare equally", () => {
    const first = new File(["first"], "Page.png", { type: "image/png" });
    const second = new File(["second"], "page.png", { type: "image/png" });

    expect(sortMangaFiles([first, second])).toEqual([first, second]);
  });
});
