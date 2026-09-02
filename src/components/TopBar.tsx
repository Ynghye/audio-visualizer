import { useRef } from "react";
import type { LoadedMedia } from "../types";
import type { LiveSession } from "../App";
import { MediaTabs } from "./MediaTabs";

interface TopBarProps {
  media: LoadedMedia | null;
  secondaryAudioName: string | null;
  secondaryVisualName: string | null;
  onFile: (file: File) => void;
  dragActive: boolean;
  onClear: () => void;
  onClearSecondaryAudio: () => void;
  onAddSecondaryAudio: () => void;
  onClearSecondaryVisual: () => void;
  onAddSecondaryVisual: () => void;
  onTogglePlay: () => void;
  playing: boolean;
  currentTime: number;
  duration: number;
  onSeek: (t: number) => void;
  liveSession: LiveSession | null;
  liveError: string | null;
  onStartLiveSession: () => void;
  onStopLiveSession: () => void;
  onToggleCamera: () => void;
  onToggleMic: () => void;
}

function formatTime(s: number): string {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function ProgressBar({ currentTime, duration, onSeek }: { currentTime: number; duration: number; onSeek: (t: number) => void }) {
  return (
    <div className="progress-bar">
      <input
        type="range"
        min={0}
        max={duration || 0}
        step={0.01}
        value={Math.min(currentTime, duration || 0)}
        onChange={(e) => onSeek(parseFloat(e.target.value))}
      />
      <span className="progress-time">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>
    </div>
  );
}

export function TopBar({
  media,
  secondaryAudioName,
  secondaryVisualName,
  onFile,
  dragActive,
  onClear,
  onClearSecondaryAudio,
  onAddSecondaryAudio,
  onClearSecondaryVisual,
  onAddSecondaryVisual,
  onTogglePlay,
  playing,
  currentTime,
  duration,
  onSeek,
  liveSession,
  liveError,
  onStartLiveSession,
  onStopLiveSession,
  onToggleCamera,
  onToggleMic,
}: TopBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="topbar">
      <div className="topbar-pill frosted">
        <span className="brand">
          <span className="brand-mark">✳</span>
          <img className="brand-logo" src="/logo.svg" alt="Form Follows Sound" />
        </span>

        <div className="topbar-divider" />

        <div className="topbar-right">
          <MediaTabs activeKind={media?.kind ?? null} />
        </div>
      </div>

      <div className="topbar-media-row">
        {!liveSession && (
          <button className={`load-btn ${dragActive ? "drag-active" : ""}`} onClick={() => inputRef.current?.click()}>
            <span className="load-btn-icon">+</span>
            {dragActive ? "Add file" : media ? "Replace Media" : "Load Audio / Video / Photo"}
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="audio/*,video/*,image/*,.mp3,.m4a,.wav,.aac,.flac,.ogg"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
            e.target.value = "";
          }}
        />

        {liveSession ? (
          <div className="media-info live-info">
            <span className="live-dot" />
            <span className="kind">live</span>
            <button className={`live-toggle ${liveSession.cameraEnabled ? "on" : ""}`} onClick={onToggleCamera}>
              Cam
            </button>
            <button className={`live-toggle ${liveSession.micEnabled ? "on" : ""}`} onClick={onToggleMic}>
              Mic
            </button>
            <button onClick={onStopLiveSession}>×</button>
          </div>
        ) : (
          <button className="load-btn live-start-btn" onClick={onStartLiveSession}>
            <span className="load-btn-icon">+</span>
            Live Session
          </button>
        )}
        {liveError && <span className="live-error">{liveError}</span>}

        {media && (
          <div className="media-info">
            <span className="kind">{media.kind}</span>
            <span>{media.name}</span>
            {(media.kind === "audio" || media.kind === "video") && (
              <>
                <button className="play-btn" style={{ width: 18, height: 18, border: "none" }} onClick={onTogglePlay}>
                  {playing ? "❚❚" : "▶"}
                </button>
                <ProgressBar currentTime={currentTime} duration={duration} onSeek={onSeek} />
              </>
            )}
            <button onClick={onClear}>×</button>
          </div>
        )}

        {(media?.kind === "image" || (liveSession && !liveSession.micEnabled)) &&
          (secondaryAudioName ? (
            <div className="media-info">
              <span className="kind">audio</span>
              <span>{secondaryAudioName}</span>
              <button className="play-btn" style={{ width: 18, height: 18, border: "none" }} onClick={onTogglePlay}>
                {playing ? "❚❚" : "▶"}
              </button>
              <ProgressBar currentTime={currentTime} duration={duration} onSeek={onSeek} />
              <button onClick={onClearSecondaryAudio}>×</button>
            </div>
          ) : (
            <button className="load-btn add-secondary-btn" onClick={onAddSecondaryAudio}>
              <span className="load-btn-icon">+</span>
              Add Audio Source
            </button>
          ))}

        {(media?.kind === "audio" || (liveSession && !liveSession.cameraEnabled)) &&
          (secondaryVisualName ? (
            <div className="media-info">
              <span>{secondaryVisualName}</span>
              <button onClick={onClearSecondaryVisual}>×</button>
            </div>
          ) : (
            <button className="load-btn add-secondary-btn" onClick={onAddSecondaryVisual}>
              <span className="load-btn-icon">+</span>
              Add Image Source
            </button>
          ))}
      </div>
    </div>
  );
}
