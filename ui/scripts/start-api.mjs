// Starts the live scoring API with the project's Python environment (macOS, Linux or Windows).
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ui = join(dirname(fileURLToPath(import.meta.url)), "..");
const candidates = [
  join(ui, "..", "TrustLayer", ".venv", "bin", "python"),
  join(ui, "..", "TrustLayer", ".venv", "Scripts", "python.exe"),
  join(ui, "..", ".venv", "bin", "python"),
  join(ui, "..", ".venv", "Scripts", "python.exe"),
];
const python = candidates.find(existsSync) ?? (process.platform === "win32" ? "python" : "python3");

const check = spawnSync(python, ["-c", "import fastapi, uvicorn, torch"], { cwd: ui });
if (check.status !== 0) {
  console.error(
    `[api] ${python} is missing packages. Follow the TrustLayer README setup, then:\n` +
      `      ${python} -m pip install -r ui/api/requirements.txt`,
  );
  process.exit(1);
}

const port = process.env.PORT_API ?? "8000";
console.log(`[api] using ${python}`);
const child = spawn(python, ["-m", "uvicorn", "api.server:app", "--port", port], {
  cwd: ui,
  stdio: "inherit",
});
child.on("exit", (code) => process.exit(code ?? 0));
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => child.kill(sig));
