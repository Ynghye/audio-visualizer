import type { Bands } from "../types";

// A media element can only ever be wired into one MediaElementSourceNode.
// Cache sources so switching styles/panels doesn't try to re-wrap the same element.
const sourceCache = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();

export class AudioEngine {
  ctx: AudioContext;
  analyser: AnalyserNode;
  private gainNode: GainNode;
  private freqData: Uint8Array<ArrayBuffer>;
  private timeData: Uint8Array<ArrayBuffer>;
  private connected: HTMLMediaElement | null = null;
  private streamDest: MediaStreamAudioDestinationNode | null = null;

  constructor() {
    this.ctx = new AudioContext();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.6;
    this.freqData = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));
    this.timeData = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));

    // Volume control sits after the analyser so the visualization always reflects
    // the source signal, independent of the output level the user has chosen.
    this.gainNode = this.ctx.createGain();
    this.analyser.connect(this.gainNode);
    this.gainNode.connect(this.ctx.destination);
  }

  connect(el: HTMLMediaElement) {
    if (this.connected === el) return;
    if (this.ctx.state === "suspended") void this.ctx.resume();

    let node = sourceCache.get(el);
    if (!node) {
      node = this.ctx.createMediaElementSource(el);
      sourceCache.set(el, node);
    }
    node.disconnect();
    node.connect(this.analyser);
    this.connected = el;
  }

  setVolume(v: number) {
    this.gainNode.gain.value = Math.max(0, v);
  }

  disconnect() {
    if (!this.connected) return;
    const node = sourceCache.get(this.connected);
    node?.disconnect();
    this.connected = null;
  }

  /** Stream carrying just the analysed audio, for combining with a canvas capture on export. */
  getRecordingAudioStream(): MediaStream | null {
    if (!this.connected) return null;
    if (!this.streamDest) {
      this.streamDest = this.ctx.createMediaStreamDestination();
      this.gainNode.connect(this.streamDest);
    }
    return this.streamDest.stream;
  }

  getFrequencyData(): Uint8Array {
    this.analyser.getByteFrequencyData(this.freqData);
    return this.freqData;
  }

  getTimeDomainData(): Uint8Array {
    this.analyser.getByteTimeDomainData(this.timeData);
    return this.timeData;
  }

  getBands(): Bands {
    const freq = this.getFrequencyData();
    const n = freq.length;
    const bassEnd = Math.floor(n * 0.12);
    const midEnd = Math.floor(n * 0.5);

    let bass = 0;
    let mid = 0;
    let treble = 0;
    for (let i = 0; i < bassEnd; i++) bass += freq[i];
    for (let i = bassEnd; i < midEnd; i++) mid += freq[i];
    for (let i = midEnd; i < n; i++) treble += freq[i];

    bass = bass / bassEnd / 255;
    mid = mid / (midEnd - bassEnd) / 255;
    treble = treble / (n - midEnd) / 255;

    // Real audio rarely fills every bin in a band at once — a wide bass/mid/treble
    // range averaged linearly comes out well under 0.5 even for loud, present sound,
    // which left band-linked parameters clamped at their base value. Boost + clamp so
    // typical music actually swings through the usable 0..1 range.
    const BOOST = 3.2;
    bass = Math.min(1, bass * BOOST);
    mid = Math.min(1, mid * BOOST);
    treble = Math.min(1, treble * BOOST);
    const level = Math.min(1, ((bass + mid + treble) / 3) * 1.1);

    return { bass, mid, treble, level };
  }
}
