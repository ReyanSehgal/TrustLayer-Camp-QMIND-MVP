"""Camp inference baseline using NAVER's official pretrained AASIST.
Upstream model class: vendor/AASIST.py (MIT). No training occurs here.
"""
from pathlib import Path
import json, math, time
import numpy as np
import soundfile as sf
from scipy.signal import resample_poly
import torch
from vendor.AASIST import Model
ROOT = Path(__file__).resolve().parent
SAMPLE_RATE = 16000
WINDOW_SAMPLES = 64600

def load_audio(path):
    audio, sr = sf.read(str(path), dtype='float32', always_2d=True)
    audio = audio.mean(axis=1)
    if audio.size == 0 or not np.isfinite(audio).all():
        raise ValueError('Audio must contain finite, non-empty samples.')
    if sr != SAMPLE_RATE:
        factor = math.gcd(sr, SAMPLE_RATE)
        audio = resample_poly(audio, SAMPLE_RATE // factor, sr // factor).astype('float32')
    return audio

def model_window(audio):
    audio = np.asarray(audio, dtype='float32')
    if len(audio) < WINDOW_SAMPLES:
        audio = np.tile(audio, int(np.ceil(WINDOW_SAMPLES / len(audio))))
    return np.ascontiguousarray(audio[:WINDOW_SAMPLES])

class Detector:
    def __init__(self):
        torch.set_num_threads(2)
        torch.manual_seed(42)
        config=json.loads((ROOT/'assets/AASIST.conf').read_text())['model_config']
        self.model=Model(config).cpu()
        weights=torch.load(ROOT/'assets/AASIST.pth', map_location='cpu', weights_only=True)
        self.model.load_state_dict(weights)
        self.model.eval()
    def predict(self, audio):
        prepared=model_window(audio)
        start=time.perf_counter()
        with torch.inference_mode():
            _, logits=self.model(torch.from_numpy(prepared).unsqueeze(0))
        scores=logits[0].cpu().numpy()
        # Upstream data_utils.py labels bonafide=1, spoof=0.
        label='genuine' if int(np.argmax(scores))==1 else 'synthetic'
        return {'prediction':label,'synthetic_logit':float(scores[0]),
                'genuine_logit':float(scores[1]),
                'genuine_margin':float(scores[1]-scores[0]),
                'inference_seconds':time.perf_counter()-start}
