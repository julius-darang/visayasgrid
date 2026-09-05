import { describe, expect, it } from "vitest";
import { fetchGridData } from "./useGridData.js";

function response(body, ok = true) {
  return { ok, json: async () => body };
}

describe("fetchGridData", () => {
  it("loads all three files for a scenario", async () => {
    const fetcher = async (url) => response({ url });

    await expect(fetchGridData("/data/mean", fetcher)).resolves.toEqual([
      { url: "/data/mean/buses.geojson" },
      { url: "/data/mean/lines.geojson" },
      { url: "/data/mean/manifest.json" },
    ]);
  });

  it("rejects when any required dataset file is unavailable", async () => {
    const fetcher = async (url) =>
      response({}, !url.endsWith("lines.geojson"));

    await expect(fetchGridData("/data/dc", fetcher)).rejects.toThrow(
      "lines.geojson",
    );
  });
});
