export const DEFAULT_BUS_COLOR_MODE = "nominal";
export const DEFAULT_LINE_COLOR_MODE = "voltage";
export const DEFAULT_DISPLAY = Object.freeze({
  labels: true,
  arrows: true,
  rings: true,
});

export function readPersistentValue(storage, key, initial) {
  try {
    const raw = storage.getItem(key);
    return raw != null ? JSON.parse(raw) : initial;
  } catch {
    return initial;
  }
}
