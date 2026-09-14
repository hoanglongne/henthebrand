import fs from "node:fs";
import { parseEnv } from "node:util";
// Only emit status and safe error codes. Never emit keys, tokens or response bodies.
const local = fs.existsSync(".env.local")
  ? parseEnv(fs.readFileSync(".env.local", "utf8"))
  : {};
const env = { ...local, ...process.env };
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  console.error("Missing Supabase URL or publishable key.");
  process.exitCode = 1;
} else {
  for (const path of [
    "/auth/v1/settings",
    "/rest/v1/admin_workspaces?select=id&limit=1",
  ]) {
    try {
      const response = await fetch(new URL(path, url), {
        headers: { apikey: key },
        signal: AbortSignal.timeout(12000),
      });
      const body = await response.json();
      console.log(path.split("?")[0], `HTTP ${response.status}`);
      if (
        path.includes("admin_workspaces") &&
        [401, 403].includes(response.status) &&
        body.code === "42501"
      ) {
        console.log(
          "Foundation table found; anonymous access denied as intended.",
        );
      } else if (!response.ok) {
        console.log(
          "Error code:",
          String(body.code || body.error_code || "unknown").replace(
            /[^a-zA-Z0-9_]/g,
            "",
          ),
        );
        process.exitCode = 1;
      } else if (path.includes("settings")) {
        console.log(
          "Public signup:",
          body.disable_signup
            ? "disabled"
            : "enabled (turn off for this private workspace)",
        );
      } else {
        console.log(
          "API reachable. Anonymous requests must not expose workspace rows.",
        );
        if (Array.isArray(body) && body.length > 0) {
          console.error(
            "Unexpected anonymous workspace visibility. Check RLS.",
          );
          process.exitCode = 1;
        }
      }
    } catch {
      console.error(
        "Connection check failed; verify network and env configuration.",
      );
      process.exitCode = 1;
    }
  }
}
