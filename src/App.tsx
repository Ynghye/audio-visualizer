import { useEffect, useRef, useState, type CSSProperties } from "react";
import "./App.css";
import { AudioEngine } from "./lib/audioEngine";
import { Stage, type StageHandle } from "./components/Stage";
import { TopBar } from "./components/TopBar";
import { ParamPanel, type PanelTab } from "./components/ParamPanel";
import type { BrowserTarget } from "./components/panels/EffectsPanel";
import { CategoryBrowser } from "./components/CategoryBrowser";
import { filterIndex } from "./filters/registry";
import { defaultValues, type ChainEntry } from "./filters/types";
import type { LoadedMedia, MediaKind } from "./types";

interface SecondaryAudio {
  url: string;
  name: string;
  el: HTMLAudioElement;
}

export interface SecondaryVisual {
  url: string;
  name: string;
  kind: "image" | "video";
  el: HTMLImageElement | HTMLVideoElement;
  muted: boolean;
  dimensions: { width: number; height: number } | null;
}

function classify(file: File): MediaKind {
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("image/")) return "image";
  return "audio";
}

function makeEntry(filterName: string): ChainEntry {
  const filter = filterIndex[filterName];
  return { id: crypto.randomUUID(), filterName, enabled: true, values: defaultValues(filter), audioLinks: {} };
}

export default function App() {
  const engineRef = useRef<AudioEngine | null>(null);
  if (!engineRef.current) engineRef.current = new AudioEngine();
  const engine = engineRef.current;

  const [media, setMedia] = useState<LoadedMedia | null>(null);
  const [secondaryAudio, setSecondaryAudio] = useState<SecondaryAudio | null>(null);
  const [secondaryVisual, setSecondaryVisual] = useState<SecondaryVisual | null>(null);
  const [chain, setChain] = useState<ChainEntry[]>(() => {
    const dither = makeEntry("burkes");
    dither.audioLinks = { levels: "level" };
    // Levels only steps through 2-8 integers, so quiet/typical audio often rounds to
    // the same frame as silence. Grain amount is continuous and reads clearly even for
    // small swings, so it's the entry that actually makes the reaction visible.
    const grain = makeEntry("filmGrain");
    grain.values = { ...grain.values, amount: 10 };
    grain.audioLinks = { amount: "level" };
    return [dither, grain];
  });
  const [activeEntryId, setActiveEntryId] = useState<string | null>(() => chain[0]?.id ?? null);
  const [browserTarget, setBrowserTarget] = useState<BrowserTarget | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [panelTab, setPanelTab] = useState<PanelTab>(1);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [recording, setRecording] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [volume, setVolume] = useState(1);
  const [outputScale, setOutputScale] = useState(1);
  const [pixelated, setPixelated] = useState(false);
  const [topbarH, setTopbarH] = useState(52);

  const stageRef = useRef<StageHandle>(null);
  const secondaryInputRef = useRef<HTMLInputElement>(null);
  const secondaryVisualInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const activeAudioEl = media?.audioEl ?? secondaryAudio?.el ?? null;

  // The top bar's media-row wraps onto a second line on narrow windows / with many
  // media chips, so its height isn't fixed — measure the whole two-row container live
  // and offset the panel/badge below it.
  useEffect(() => {
    const el = document.querySelector(".topbar");
    if (!el) return;
    // Read getBoundingClientRect rather than the ResizeObserver entry's contentRect —
    // contentRect excludes padding/border, understating the space the pill actually occupies.
    const ro = new ResizeObserver(() => {
      const h = el.getBoundingClientRect().height;
      if (h > 0) setTopbarH(h);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  function clearSecondaryAudio() {
    setSecondaryAudio((prev) => {
      if (prev) {
        prev.el.pause();
        URL.revokeObjectURL(prev.url);
      }
      return null;
    });
  }

  function clearSecondaryVisual() {
    setSecondaryVisual((prev) => {
      if (prev) {
        if (prev.el instanceof HTMLVideoElement) prev.el.pause();
        URL.revokeObjectURL(prev.url);
      }
      return null;
    });
  }

  function handleFile(file: File) {
    const kind = classify(file);
    const url = URL.createObjectURL(file);

    setMedia((prev) => {
      if (prev) {
        prev.audioEl?.pause();
        URL.revokeObjectURL(prev.url);
      }
      return null;
    });
    // Secondary audio is paired with a photo — keep it when swapping one photo for
    // another, only drop it if the new media isn't a photo (the pairing no longer applies).
    if (kind !== "image") clearSecondaryAudio();
    // Secondary visual is paired with audio the same way, mirrored — keep it only while
    // the primary slot stays audio.
    if (kind !== "audio") clearSecondaryVisual();

    if (kind === "video") {
      const video = document.createElement("video");
      video.src = url;
      video.loop = true;
      video.playsInline = true;
      video.muted = false;
      engine.connect(video);
      video.play().catch(() => {});
      video.addEventListener("loadedmetadata", () => {
        setMedia((prev) =>
          prev && prev.visualEl === video
            ? { ...prev, dimensions: { width: video.videoWidth, height: video.videoHeight } }
            : prev,
        );
      });
      setMedia({ kind, url, name: file.name, visualEl: video, audioEl: video, dimensions: null });
    } else if (kind === "audio") {
      const audio = document.createElement("audio");
      audio.src = url;
      audio.loop = true;
      engine.connect(audio);
      audio.play().catch(() => {});
      setMedia({ kind, url, name: file.name, visualEl: null, audioEl: audio, dimensions: null });
    } else {
      const img = new Image();
      img.src = url;
      img.addEventListener("load", () => {
        setMedia((prev) =>
          prev && prev.visualEl === img
            ? { ...prev, dimensions: { width: img.naturalWidth, height: img.naturalHeight } }
            : prev,
        );
      });
      setMedia({ kind, url, name: file.name, visualEl: img, audioEl: null, dimensions: null });
    }

    // Loading media is the moment the reference "default applied values" should surface:
    // jump to the Effects tab and make sure the first stage's options are expanded.
    setPanelTab(2);
    setActiveEntryId((id) => id ?? chain[0]?.id ?? null);
  }

  const handleFileRef = useRef(handleFile);
  useEffect(() => {
    handleFileRef.current = handleFile;
  });

  useEffect(() => {
    let counter = 0;
    const hasFiles = (e: DragEvent) => !!e.dataTransfer?.types.includes("Files");

    const onDragEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      counter++;
      setDragActive(true);
    };
    const onDragOver = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
    };
    const onDragLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      counter = Math.max(0, counter - 1);
      if (counter === 0) setDragActive(false);
    };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      counter = 0;
      setDragActive(false);
      const file = e.dataTransfer?.files?.[0];
      if (file) handleFileRef.current(file);
    };

    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, []);

  function handleSecondaryAudioFile(file: File) {
    clearSecondaryAudio();
    const url = URL.createObjectURL(file);
    const audio = document.createElement("audio");
    audio.src = url;
    audio.loop = true;
    engine.connect(audio);
    audio.play().catch(() => {});
    setSecondaryAudio({ url, name: file.name, el: audio });
  }

  function handleSecondaryVisualFile(file: File) {
    const kind = classify(file);
    if (kind === "audio") return;
    clearSecondaryVisual();
    const url = URL.createObjectURL(file);

    if (kind === "video") {
      const video = document.createElement("video");
      video.src = url;
      video.loop = true;
      video.playsInline = true;
      video.muted = true;
      video.play().catch(() => {});
      video.addEventListener("loadedmetadata", () => {
        setSecondaryVisual((prev) =>
          prev && prev.el === video
            ? { ...prev, dimensions: { width: video.videoWidth, height: video.videoHeight } }
            : prev,
        );
      });
      setSecondaryVisual({ url, name: file.name, kind, el: video, muted: true, dimensions: null });
    } else {
      const img = new Image();
      img.src = url;
      img.addEventListener("load", () => {
        setSecondaryVisual((prev) =>
          prev && prev.el === img
            ? { ...prev, dimensions: { width: img.naturalWidth, height: img.naturalHeight } }
            : prev,
        );
      });
      setSecondaryVisual({ url, name: file.name, kind, el: img, muted: false, dimensions: null });
    }
  }

  function toggleSecondaryVisualMuted() {
    setSecondaryVisual((prev) => {
      if (!prev || !(prev.el instanceof HTMLVideoElement)) return prev;
      const muted = !prev.muted;
      prev.el.muted = muted;
      return { ...prev, muted };
    });
  }

  function clearMedia() {
    setMedia((prev) => {
      if (prev) {
        prev.audioEl?.pause();
        engine.disconnect();
        URL.revokeObjectURL(prev.url);
      }
      return null;
    });
    clearSecondaryAudio();
    clearSecondaryVisual();
  }

  useEffect(() => {
    const el = activeAudioEl;
    if (!el) {
      setPlaying(false);
      return;
    }
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    setPlaying(!el.paused);
    return () => {
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
    };
  }, [activeAudioEl]);

  useEffect(() => {
    const el = activeAudioEl;
    if (!el) {
      setCurrentTime(0);
      setDuration(0);
      return;
    }
    const onTime = () => setCurrentTime(el.currentTime);
    const onDuration = () => setDuration(isFinite(el.duration) ? el.duration : 0);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onDuration);
    el.addEventListener("durationchange", onDuration);
    onTime();
    onDuration();
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onDuration);
      el.removeEventListener("durationchange", onDuration);
    };
  }, [activeAudioEl]);

  function seek(t: number) {
    if (activeAudioEl) activeAudioEl.currentTime = t;
  }

  const ZOOM_MIN = 0.5;
  const ZOOM_MAX = 3;
  const ZOOM_STEP = 0.25;

  function zoomIn() {
    setZoom((z) => Math.min(ZOOM_MAX, Math.round((z + ZOOM_STEP) * 100) / 100));
  }
  function zoomOut() {
    setZoom((z) => Math.max(ZOOM_MIN, Math.round((z - ZOOM_STEP) * 100) / 100));
  }
  function zoomReset() {
    setZoom(1);
  }

  function handleVolumeChange(v: number) {
    setVolume(v);
    engine.setVolume(v);
  }

  function togglePlay() {
    const el = activeAudioEl;
    if (!el) return;
    if (el.paused) {
      void engine.ctx.resume();
      void el.play();
    } else {
      el.pause();
    }
  }

  function handleExport() {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    const canvas = stageRef.current?.getDisplayCanvas();
    if (!canvas) return;

    const videoStream = canvas.captureStream(30);
    const audioStream = engine.getRecordingAudioStream();
    const tracks: MediaStreamTrack[] = [...videoStream.getVideoTracks()];
    if (audioStream) tracks.push(...audioStream.getAudioTracks());
    const combined = new MediaStream(tracks);

    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : "video/webm";
    const recorder = new MediaRecorder(combined, { mimeType: mime });
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `visualizer-${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
      setRecording(false);
    };
    recorder.start();
    recorderRef.current = recorder;
    setRecording(true);
  }

  function handleSelectFilter(filterName: string) {
    if (!browserTarget) return;
    if (browserTarget.mode === "add") {
      const entry = makeEntry(filterName);
      setChain((c) => [...c, entry]);
      setActiveEntryId(entry.id);
    } else {
      const { entryId } = browserTarget;
      setChain((c) => c.map((e) => (e.id === entryId ? { ...makeEntry(filterName), id: entryId } : e)));
      setActiveEntryId(entryId);
    }
    setBrowserTarget(null);
  }

  function copyOutputToInput() {
    const canvas = stageRef.current?.getResultCanvas();
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      handleFile(new File([blob], `chain-output-${Date.now()}.png`, { type: "image/png" }));
    }, "image/png");
  }

  return (
    <div className="app" style={{ "--topbar-h": `${topbarH}px` } as CSSProperties}>
      <Stage
        ref={stageRef}
        media={media}
        secondaryVisual={secondaryVisual}
        chain={chain}
        engine={engine}
        zoom={zoom}
        outputScale={outputScale}
        pixelated={pixelated}
      />

      {(() => {
        const dims = secondaryVisual?.dimensions ?? (media?.kind === "image" || media?.kind === "video" ? media.dimensions : null);
        return dims ? (
          <div className="dims-badge frosted">
            {dims.width}×{dims.height}px
          </div>
        ) : null;
      })()}

      <TopBar
        media={media}
        secondaryAudioName={secondaryAudio?.name ?? null}
        secondaryVisualName={secondaryVisual?.name ?? null}
        onFile={handleFile}
        dragActive={dragActive}
        onClear={clearMedia}
        onClearSecondaryAudio={clearSecondaryAudio}
        onAddSecondaryAudio={() => secondaryInputRef.current?.click()}
        onClearSecondaryVisual={clearSecondaryVisual}
        onAddSecondaryVisual={() => secondaryVisualInputRef.current?.click()}
        onTogglePlay={togglePlay}
        playing={playing}
        currentTime={currentTime}
        duration={duration}
        onSeek={seek}
      />
      <input
        ref={secondaryInputRef}
        type="file"
        accept="audio/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleSecondaryAudioFile(file);
          e.target.value = "";
        }}
      />
      <input
        ref={secondaryVisualInputRef}
        type="file"
        accept="video/*,image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleSecondaryVisualFile(file);
          e.target.value = "";
        }}
      />

      <ParamPanel
        tab={panelTab}
        onTabChange={setPanelTab}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((c) => !c)}
        media={media}
        secondaryVisual={secondaryVisual}
        onToggleSecondaryVisualMuted={toggleSecondaryVisualMuted}
        zoom={zoom}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onZoomReset={zoomReset}
        hasAudio={!!activeAudioEl}
        volume={volume}
        onVolumeChange={handleVolumeChange}
        chain={chain}
        onChainChange={setChain}
        activeEntryId={activeEntryId}
        onSetActive={setActiveEntryId}
        onOpenBrowser={setBrowserTarget}
        getBaseFrame={() => stageRef.current?.getBaseFrame() ?? null}
        getGLRenderer={() => stageRef.current?.getGLRenderer() ?? null}
        outputScale={outputScale}
        onOutputScaleChange={setOutputScale}
        pixelated={pixelated}
        onPixelatedChange={setPixelated}
        onCopyOutputToInput={copyOutputToInput}
        getStats={() => stageRef.current?.getStats() ?? null}
        onExport={handleExport}
        recording={recording}
      />

      {browserTarget && (
        <CategoryBrowser
          onClose={() => setBrowserTarget(null)}
          onSelect={handleSelectFilter}
          getBaseFrame={() => stageRef.current?.getBaseFrame() ?? null}
          getGLRenderer={() => stageRef.current?.getGLRenderer() ?? null}
        />
      )}
    </div>
  );
}
