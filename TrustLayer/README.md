# TrustLayer

QMIND Camp starter for evaluating a pretrained speech deepfake detector under added noise.

## Start here

Open this folder in VS Code. `detector.py`, `demo.py` and `requirements.txt` should all be at the top level. This repository has a flat layout; commands from the older nested ZIP may include an extra folder that is no longer needed here.

### Windows (PowerShell, Python 3.11)

Run each command separately:

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\python.exe -m pip install torch==2.5.1 --index-url https://download.pytorch.org/whl/cpu
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe smoke_test.py
.\.venv\Scripts\python.exe demo.py --sample genuine_2 --noise 10
```

If the environment is already activated, `python demo.py --sample genuine_2 --noise 10` works too. No GPU is needed. Close CSV files in Excel before rerunning scripts that write them.

### Mac / Linux (Python 3.11)

```bash
python3.11 -m venv .venv
.venv/bin/python -m pip install torch==2.5.1
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python smoke_test.py
.venv/bin/python demo.py --sample genuine_2 --noise 10
```

Windows and Linux inference have been checked; Mac execution has not. Intel Mac users may encounter package compatibility issues. Pair with a working laptop if setup takes more than 10–15 minutes.

## What works now

- `smoke_test.py` runs eight supplied recordings and writes `results/baseline.csv`.
- `demo.py` runs one recording and optionally compares a noisy version.
- `detector.py` wraps the official pretrained AASIST model.
- `noise_reference.py` provides reproducible white noise.
- `assets/` contains the model, sample audio, source records and dataset licence.
- `vendor/` retains upstream model code and its licence/notice.

Demo audio is written into `results/`. A noisy file is overwritten when rerunning the same sample at another noise level. The team's batch runner should use separate filenames for each condition.

## What we are building at Camp

Run all eight clips under original, 20 dB and 10 dB conditions, export 24 result rows, and show an audio/prediction comparison screen. The batch runner and interface are team tasks, not completed features in this starter.

See [team tasks](docs/TEAM_TASKS.md), [contribution steps](CONTRIBUTING.md) and [the detailed starter guide](docs/STARTER_GUIDE.md).

Scores are raw model outputs, not confidence percentages. These eight convenience samples cannot establish broad real-world accuracy. Existing reference CSVs were prepared before Camp; reproduce and clearly distinguish team results.

## Sources

- Model: https://github.com/clovaai/aasist — NAVER code, MIT licence retained in `vendor/LICENSE`.
- Sample recordings: https://nii-yamagishilab.github.io/samples-xin/main-asvspoof2019 — original URLs and labels in `assets/manifest.json`; dataset licence in `assets/ASVspoof_LICENSE.txt`.

The model was not trained by this team. Shaina Raza is advising the project; this repository does not imply a formal Vector partnership.
