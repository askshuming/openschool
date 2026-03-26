export type ApiMode = "local" | "remote";

const rawMode = process.env.EXPO_PUBLIC_API_MODE;

export const apiMode: ApiMode = rawMode === "remote" ? "remote" : "local";

export const apiBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:3001";

