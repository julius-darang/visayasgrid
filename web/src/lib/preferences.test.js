import { describe, expect, it } from "vitest";
import {
  DEFAULT_BUS_COLOR_MODE,
  DEFAULT_LINE_COLOR_MODE,
  DEFAULT_DISPLAY,
  readPersistentValue,
} from "./preferences.js";

describe("map display defaults", () => {
  it("starts with voltage-based bus and line colors", () => {
    expect(DEFAULT_BUS_COLOR_MODE).toBe("nominal");
    expect(DEFAULT_LINE_COLOR_MODE).toBe("voltage");
  });

  it("shows labels, flow arrows, and generator rings", () => {
    expect(DEFAULT_DISPLAY).toEqual({
      labels: true,
      arrows: true,
      rings: true,
    });
  });

  it("uses defaults for fresh users and saved values for returning users", () => {
    const freshStorage = { getItem: () => null };
    const returningStorage = {
      getItem: (key) =>
        ({
          "vg-colormode": '"pu"',
          "vg-line-colormode": '"loading"',
          "vg-display": '{"labels":false,"arrows":false,"rings":false}',
        })[key] ?? null,
    };

    expect(
      readPersistentValue(freshStorage, "vg-display", DEFAULT_DISPLAY),
    ).toBe(DEFAULT_DISPLAY);
    expect(
      readPersistentValue(returningStorage, "vg-colormode", DEFAULT_BUS_COLOR_MODE),
    ).toBe("pu");
    expect(
      readPersistentValue(
        returningStorage,
        "vg-line-colormode",
        DEFAULT_LINE_COLOR_MODE,
      ),
    ).toBe("loading");
    expect(
      readPersistentValue(returningStorage, "vg-display", DEFAULT_DISPLAY),
    ).toEqual({ labels: false, arrows: false, rings: false });
  });
});
