> Historical starter guide: nested-folder instructions refer to the original ZIP. Use the root README for this repository’s setup. The original hash snapshot describes the packaged starter, before repository additions.

# TrustLayer Camp inference starter

This package supplies a verified pretrained inference baseline, eight labelled demonstration recordings, source/license records, and a white-noise reference. The team still builds its display, batch experiment/export, visual comparison, and pitch at Camp. These samples and model outputs are preliminary: do not call them a broad benchmark or present the existing detector as a model we trained.

## Before Camp: optional setup

The baseline runs on Reyan's Windows laptop with Python 3.11.9 and PyTorch 2.5.1+cpu. It has also been checked on Linux with Python 3.12.14. Mac execution has not yet been verified.

If you have time, download and extract the ZIP, then skim this README. Setup is optional before Camp; we will work through tasks and any setup issues together. Limit troubleshooting to 10–15 minutes and post the error in the team channel if blocked. A working team laptop is available for inference.

IMPORTANT: Open the extracted folder that directly contains detector.py, smoke_test.py and requirements.txt in VS Code. The ZIP contains a TrustLayer_Camp_Starter folder, so extraction may leave two folders with that name. Check that the terminal's current folder contains requirements.txt before using the commands below.

## Windows setup (PowerShell)

Check installed Python versions:

```powershell
py -0p
```

With Python 3.11 available, run these commands one at a time and wait for each to finish:

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\python.exe --version
.\.venv\Scripts\python.exe -m pip install torch==2.5.1 --index-url https://download.pytorch.org/whl/cpu
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe smoke_test.py
```

Python 3.12 is another option: use py -3.12 for the environment creation command. Package availability supports Python 3.10 too, but that environment has not been tested for this starter. The pinned PyTorch version is not intended for the team's default Python 3.13 interpreter.

Creating .venv may print nothing; that is normal. A successful test prints eight predictions, PASS: 8 inference calls completed, and a saved CSV path. This confirms the pipeline works, not general detector accuracy. Close baseline.csv in Excel before running the test; Excel may lock it and cause PermissionError.

If you already created your environment in the outer extracted folder, keep it there. From that outer folder, use these paths instead:

```powershell
.\.venv\Scripts\python.exe -m pip install -r .\TrustLayer_Camp_Starter\requirements.txt
.\.venv\Scripts\python.exe .\TrustLayer_Camp_Starter\smoke_test.py
```

Using the environment's Python directly avoids PowerShell activation-policy problems. In VS Code, use Python: Select Interpreter and select .venv. CPU inference does not require a GPU.

## macOS or Linux setup

Use an available Python 3.11 or 3.12 interpreter. The example assumes python3.11; substitute python3.12 if that is installed. In the folder containing detector.py:

```bash
python3.11 -m venv .venv
.venv/bin/python -m pip install torch==2.5.1
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python smoke_test.py
```

Mac installation has not been verified. PyTorch 2.5.1 provides Apple Silicon Mac packages; Intel Macs may need a different version and should flag the issue rather than spend the evening changing dependencies. Share the full error if installation fails. Other tasks can continue using the working Windows laptop for model runs.

## Optional interface dependency

Install requirements-ui.txt when the team starts a Streamlit interface. It is not required for the baseline smoke test. Streamlit is a suggestion, not a completed interface in this kit.

## What is included

- detector.py: loads the official AASIST checkpoint, converts audio to 16 kHz mono, repeats short audio or takes the first 64,600 samples, and runs inference on CPU.
- smoke_test.py: runs the eight known-label samples and saves results/baseline.csv.
- noise_reference.py: reproducible additive white Gaussian noise at a specified SNR, with the same random seed. Lower SNR means more noise. 20 dB is gentler than 10 dB. This is a controlled degradation, not a simulation of all telephone noise.
- vendor/AASIST.py: upstream NAVER model definition, with its MIT LICENSE and NOTICE retained.
- assets/AASIST.pth and AASIST.conf: official pretrained model and config.
- assets/audio and manifest.json: eight clips selected BEFORE running predictions, from four rows of the researchers' ASVspoof2019 LA evaluation showcase. Four genuine recordings and four synthetic/converted recordings. They are convenience showcase samples, not a random or representative test set.
- assets/ASVspoof_LICENSE.txt: original dataset attribution license.
- results/pre_camp_noise_reference.csv: diagnostic results from preparatory execution, not results produced by the Camp team. Reproduce the experiment before presenting it as team work.

## How to interpret outputs

Upstream labels: class 0 = spoof (synthetic), class 1 = bona fide (genuine). Prediction uses the larger logit. genuine_margin = genuine_logit - synthetic_logit; above zero selects genuine, below zero selects synthetic. Neither logits nor the margin are calibrated confidence percentages. No uncertainty threshold has been validated.

AASIST uses 64,600 samples (about 4.04 seconds). If the source is longer, the detector only sees that first window. If it is shorter, it is repeated. For Camp, add noise AFTER model_window() so the measured SNR matches the actual input window. Use the same window for original and altered inference and playback; disclose repeated/cropped clips.

## Next team tasks

1. Kyle: inspect noise_reference.py, verify achieved SNR, create the transformed playback file, and hand over changes before leaving Saturday.
2. Jinpeng: inspect score mapping/windowing and connect inference with consistent result fields; help Daniel integrate.
3. Daniel: batch the manifest over original, 20 dB and 10 dB conditions, then save CSV rows with sample ID, known label, condition, seed, model identity, logits, margin, and measured inference time.
4. Shreya: verify sample labels/source records; compare observed predictions to labels, count missed synthetic clips and wrongly flagged genuine clips separately, and document limits.
5. Abdullah: build the simple audio/score comparison screen and connect the exported data or inference functions. Clearly label saved results if used.

Keep the same samples/seed/preprocessing across conditions. Display all eight results rather than only the most dramatic example. A changed prediction can trigger a clearly labelled demonstration review rule, but do not call that rule a calibrated uncertainty system.

## Preparatory verification

Linux CPU functional test: all eight samples produced finite logits. Clean clips: 8/8 correct. At 20 dB: 8/8 correct. At 10 dB: 6/8 correct; genuine_2 and genuine_4 were classified as synthetic. At 0 dB (optional extreme stress test): 4/8 correct; all four genuine clips were flagged. These figures only describe this eight-clip convenience subset. Do not tune thresholds or choose samples to manufacture a dramatic result.

## Attribution

AASIST: Jung et al., AASIST: Audio Anti-Spoofing using Integrated Spectro-Temporal Graph Attention Networks. https://github.com/clovaai/aasist and https://arxiv.org/abs/2110.01200 . Copyright NAVER Corp., MIT.

Dataset: Wang et al., ASVspoof 2019: A large-scale public database of synthesized, converted and replayed speech, Computer Speech & Language 64 (2020), 101114. Todisco et al., ASVspoof 2019: Future Horizons in Spoofed and Fake Audio Detection, Interspeech 2019. Open Data Commons Attribution License. Audio page: https://nii-yamagishilab.github.io/samples-xin/main-asvspoof2019 ; dataset: https://zenodo.org/records/6906306 . The original source URLs and hashes are retained per sample.

The source recordings are distributed unchanged; noise-added versions created by the team must be labelled as modified. In slides, distinguish pretrained model and dataset work from the team's experiment and interface.
