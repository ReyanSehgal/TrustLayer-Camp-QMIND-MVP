// Record a few seconds from the microphone and return a 16 kHz mono WAV, ready to upload.

export function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buf);
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF");
  v.setUint32(4, 36 + samples.length * 2, true);
  str(8, "WAVEfmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, "data");
  v.setUint32(40, samples.length * 2, true);
  samples.forEach((s, i) => v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, s)) * 0x7fff, true));
  return new Blob([buf], { type: "audio/wav" });
}

export async function recordClip(seconds: number): Promise<Blob> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  });
  try {
    const rec = new MediaRecorder(stream);
    const chunks: BlobPart[] = [];
    rec.ondataavailable = (e) => chunks.push(e.data);
    const stopped = new Promise<void>((r) => (rec.onstop = () => r()));
    rec.start();
    await new Promise((r) => setTimeout(r, seconds * 1000));
    rec.stop();
    await stopped;
    const raw = await new Blob(chunks).arrayBuffer();
    const decoded = await new OfflineAudioContext(1, 1, 16000).decodeAudioData(raw);
    return encodeWav(decoded.getChannelData(0), 16000);
  } finally {
    stream.getTracks().forEach((t) => t.stop());
  }
}
