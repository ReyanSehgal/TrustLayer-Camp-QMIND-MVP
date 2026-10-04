// Copies the team's saved audio (TrustLayer/results/audio) into public/audio so the UI can play it.
// The copies are git-ignored: the source of truth stays in TrustLayer/results/audio.
import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ui = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(ui, "..", "TrustLayer", "results", "audio");
const dest = join(ui, "public", "audio");

if (!existsSync(src)) {
  console.warn(`[sync-audio] ${src} not found. Pull the latest main, or run TrustLayer/make_noisy.py.`);
  process.exit(0);
}
mkdirSync(dest, { recursive: true });
const wavs = readdirSync(src).filter((f) => f.endsWith(".wav"));
for (const f of wavs) cpSync(join(src, f), join(dest, f));
console.log(`[sync-audio] copied ${wavs.length} files to public/audio`);
