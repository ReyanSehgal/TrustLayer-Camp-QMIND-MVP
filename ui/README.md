# TrustLayer UI

A web interface for the TrustLayer demo. A pretrained anti-spoofing model (AASIST) says whether a speech clip
is **genuine** or **synthetic**. The UI lets you hear a clip clean and with added noise, see the verdict and
score for each, and find the noise level where the verdict flips. All eight clips are shown, not a selection.

It runs in two modes:

| Mode | Command | What works |
|---|---|---|
| **Saved results** | `npm run dev` | Everything that reads the team's saved audio and scores: clips, A/B listening, verdicts, results matrix, CSV download. No Python needed. |
| **Live** (full stack) | `npm run dev:live` | Everything above plus live noise slider, "where it flips" sweep, robustness map, sensitivity map, and scoring your own audio. Needs the Python environment. |

## Run it locally

You need **Node 20+**. For live mode you also need the project's Python environment (below).

**1. Saved-results mode (quickest)**

```bash
cd ui
npm install
npm run dev          # open http://localhost:3000
```

**2. Live mode (full stack)**

Set up the Python environment once, following `TrustLayer/README.md` (Python 3.11 or 3.12, PyTorch 2.5.1,
`.venv` inside `TrustLayer/`). Then add the API's two extra packages using that same environment:

```bash
cd TrustLayer
.venv/bin/python -m pip install -r ../ui/api/requirements.txt      # Windows: .venv\Scripts\python.exe
cd ../ui
npm install
npm run dev:live     # starts the UI on :3000 and the API on :8000 together
```

Open http://localhost:3000. The status chip at the top right shows **Live** when the API is reachable and
**Offline** when it is not; saved results always work. Stop with Ctrl-C.

Useful variants:

```bash
npm run api          # API only, on http://localhost:8000
npm run build        # static site into ui/out (serve with: npx serve out)
npm run lint
```

If port 3000 or 8000 is busy, stop the other process first. The API port can be changed with `PORT_API`, and
the UI finds it through `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`).

## How it fits together

```
 TrustLayer/ (teammates own this; the UI only reads it)
 ├─ detector.py, noise_reference.py   AASIST inference and the seeded noise function
 ├─ assets/manifest.json              the 8 labelled clips
 └─ results/audio/*.wav               24 saved files: original, 20 dB, 10 dB per clip
        │ read-only
        ▼
 ui/api/  (FastAPI, Python)            live scoring; imports the Detector, never edits it
 ├─ scoring.py                        shared helpers (noise, scoring, sensitivity, upload decode)
 └─ server.py                         /api/health, /score, /sweep, /sensitivity, /score_upload
        ▲  JSON over localhost (CORS limited to localhost pages)
        │
 ui/  (Next.js + React + Tailwind)     the interface, runs in the browser
 ├─ app/, components/                 one scrolling story: listen, margin, matrix, flips, robustness, own audio
 ├─ lib/                              data types, API client, spectrogram maths, WAV recording, CSV export
 ├─ public/data/results.json          saved scores (committed, small)
 └─ public/audio/                     copied from TrustLayer/results/audio before dev/build; git-ignored
```

- **Saved path:** `scripts/sync-audio.mjs` copies the team's WAVs into `public/audio`; `public/data/results.json`
  holds the scores for exactly those files. The browser needs nothing else.
- **Live path:** the browser sends a clip id and an SNR to the API; the API adds the same seeded noise
  (seed 42, after `model_window()`), runs the Detector, and returns the verdict, logits, waveform peaks and the
  exact audio that was scored.
- **Regenerate saved scores** (only if the audio or model changes), from `TrustLayer/`:

  ```bash
  .venv/bin/python ../ui/scripts/export_ui_data.py
  ```

- **Scripts:** `start-api.mjs` finds `TrustLayer/.venv` on macOS, Linux or Windows; `sync-audio.mjs` runs
  automatically before `dev` and `build`.

### API

| Endpoint | Purpose |
|---|---|
| `GET /api/health` | Is the API up? (the UI polls this every few seconds) |
| `POST /api/score` | Score a clip at an SNR (or unmodified); returns verdict, logits, peaks, audio |
| `POST /api/sweep` | Score one clip at many SNRs ("where does it flip") |
| `POST /api/sensitivity` | Mute one slice at a time to see where the score is sensitive (experimental) |
| `POST /api/score_upload` | Score an uploaded or recorded clip, optionally with noise (experimental) |

Inputs are validated (unknown clip 404, SNR outside -20 to 60 or unreadable audio 422, files over 10 MB 413).

## Team results CSV

`TrustLayer/results/noise_results.csv` (from `run_noise.py`) holds the team's own batch run: each clip at 20, 10
and 0 dB with clean and noisy margins and predictions. It has no logits, inference time or audio path, and it
has a 0 dB row instead of a clean row, so the UI does not read it directly. Instead, `export_ui_data.py` checks
the UI's saved scores against it every time it runs and stops if they disagree (they currently agree to 5e-5).
The live API at 0 dB also reproduces its 0 dB margins. If the team later adds logits and audio paths to a final
CSV (`sample_id, known_label, condition, snr_db, seed, prediction, synthetic_logit, genuine_logit,
genuine_margin, inference_seconds, audio_path, model_id`), point `lib/results.ts` at it.

## Honesty rules the UI follows

- The margin is a raw model output (genuine score minus synthetic score), never shown as a confidence.
- The detector is pretrained by NAVER; the team did not train it. AASIST and the dataset are credited.
- Eight clips are a convenience subset chosen before predictions were run: "not a benchmark".
- Noisy audio is labelled as modified; source recordings are unchanged.
- False alarms (genuine flagged synthetic) and missed synthetic clips are counted separately.
- The model hears a 4.04 s window; clips are shown as looped or cropped to fit it.
- Live results are labelled "Live run"; the sweep is "an illustration, not a threshold"; the sensitivity map and
  own-audio scoring are marked experimental.
