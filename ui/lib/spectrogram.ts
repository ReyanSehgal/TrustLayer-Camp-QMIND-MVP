// Client-side spectrogram: decode any audio URL to 16 kHz mono, then a Hann-windowed STFT.
// Colour is mapped on a fixed dB scale (not per clip), so noisy audio really looks brighter.

export interface Spectrogram {
  frames: number;
  bins: number;
  rgba: Uint8ClampedArray<ArrayBuffer>; // frames x bins, low frequencies at the bottom row
}

const NFFT = 512;
const HOP = 256;
const DB_FLOOR = -100;
const DB_CEIL = -20;

export async function decodeToMono16k(url: string): Promise<Float32Array> {
  const buf = await (await fetch(url)).arrayBuffer();
  const ctx = new OfflineAudioContext(1, 1, 16000);
  const audio = await ctx.decodeAudioData(buf);
  return audio.getChannelData(0);
}

function fft(re: Float64Array, im: Float64Array) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k;
        const b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci;
        const ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
        const nr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = nr;
      }
    }
  }
}

const STOPS: [number, [number, number, number]][] = [
  [0, [11, 12, 14]],
  [0.3, [22, 34, 58]],
  [0.55, [38, 82, 160]],
  [0.78, [112, 168, 255]],
  [1, [238, 244, 255]],
];

function lut(): Uint8ClampedArray {
  const out = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let s = 1;
    while (s < STOPS.length - 1 && t > STOPS[s][0]) s++;
    const [t0, c0] = STOPS[s - 1];
    const [t1, c1] = STOPS[s];
    const f = (t - t0) / (t1 - t0 || 1);
    for (let c = 0; c < 3; c++) out[i * 3 + c] = c0[c] + (c1[c] - c0[c]) * f;
  }
  return out;
}

export function computeSpectrogram(x: Float32Array): Spectrogram {
  const bins = NFFT / 2 + 1;
  const frames = Math.max(1, Math.floor((x.length - NFFT) / HOP) + 1);
  const win = new Float64Array(NFFT).map((_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (NFFT - 1)));
  const colors = lut();
  const rgba = new Uint8ClampedArray(frames * bins * 4);
  const re = new Float64Array(NFFT);
  const im = new Float64Array(NFFT);
  const ref = NFFT / 4; // a full-scale sine reads about 0 dB
  for (let f = 0; f < frames; f++) {
    for (let i = 0; i < NFFT; i++) {
      re[i] = (x[f * HOP + i] ?? 0) * win[i];
      im[i] = 0;
    }
    fft(re, im);
    for (let k = 0; k < bins; k++) {
      const db = 20 * Math.log10(Math.hypot(re[k], im[k]) / ref + 1e-9);
      const v = Math.round(255 * Math.min(1, Math.max(0, (db - DB_FLOOR) / (DB_CEIL - DB_FLOOR))));
      const o = ((bins - 1 - k) * frames + f) * 4;
      rgba[o] = colors[v * 3];
      rgba[o + 1] = colors[v * 3 + 1];
      rgba[o + 2] = colors[v * 3 + 2];
      rgba[o + 3] = 255;
    }
  }
  return { frames, bins, rgba };
}
