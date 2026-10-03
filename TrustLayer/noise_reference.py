"""Reference for a reproducible Camp noise experiment; extend with the team."""
import numpy as np

def add_white_noise(audio, snr_db=10.0, seed=42):
    x=np.asarray(audio,dtype='float32')
    if x.size==0 or not np.isfinite(x).all(): raise ValueError('Invalid audio')
    power=np.mean(x.astype('float64')**2)
    if power==0: raise ValueError('SNR is undefined for silent audio')
    n=np.random.default_rng(seed).normal(size=x.shape)
    n *= np.sqrt(power / (10**(snr_db/10) * np.mean(n**2)))
    y=(x+n).astype('float32')
    # Keep float waveform values for inference; do not introduce clipping.
    # Save transformed audio as FLOAT WAV. If playback clips, disclose it;
    # do not silently clip the input sent to the model.
    return y
