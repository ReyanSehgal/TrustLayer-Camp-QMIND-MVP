# Camp task board

Update the status below to To do, Doing or Done. Agree roles together at Camp.

| Owner | Task | Done when | Status |
| --- | --- | --- | --- |
| Jinpeng | Check detector preparation and score mapping; support integration | Daniel can call the existing detector consistently | To do |
| Kyle | Verify 20 dB and 10 dB noise, save playable evaluated audio | Daniel can reproduce both conditions; handoff by 3:30 Saturday | To do |
| Daniel | Build run_experiment.py using the existing detector and noise functions | Eight clips × three conditions produce 24 CSV rows | To do |
| Shreya | Verify sources/labels and analyse errors | Results summary separates false alarms and missed synthetic clips, with limitations | To do |
| Abdullah | Build a simple comparison interface | Choose a clip, hear original/noisy audio, see labels and predictions | To do |
| Reyan | Integrate pieces, prepare slides and rehearse | Working demonstration and a pitch under five minutes | To do |

## Agree these interfaces first

Prepare one model window per clip. Create each noisy condition directly from that window, using seed 42. Save exactly the audio that is evaluated. Use all eight clips; no sample selection based on detector outcomes.

Suggested CSV columns: sample_id, known_label, condition, snr_db (blank for original), seed (blank for original), prediction, synthetic_logit, genuine_logit, genuine_margin, inference_seconds, audio_path, model_id.

Suggested audio names: genuine_1_original.wav, genuine_1_noise20.wav, genuine_1_noise10.wav. Use relative paths that work on every laptop.

Get one recording working from audio through display first; then expand to all eight. Abdullah can begin with saved results and clearly label them. Installing requirements-ui.txt is optional until the interface is being built.

## Build checkpoints

- Saturday 2:30: baseline demo and role check.
- 3:30: Kyle hands over to Daniel before leaving at 3:50–4.
- 4:10: one complete comparison connected.
- 5:00: save progress and remaining issues.
- Sunday 10:30–12:30: complete results, slides and rehearsal around sponsor rotations.
- Sunday 12:15: stop new features and prepare the presentation backup.
