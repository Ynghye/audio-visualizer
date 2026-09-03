import { useRef } from "react";
import type { LoadedMedia } from "../types";
import type { LiveSession } from "../App";

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
  onShuffle: () => void;
}

/** Traced directly from the user's dedicated menu.svg (the ghost-holding-a-die mark). */
function DiceIcon() {
  return (
    <svg width="20" height="20" viewBox="37 25 42 40" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M64.2 27.1399C68.48 26.6599 70.21 29.0099 72.14 32.2399C73.26 34.1199 76.2 38.7099 76.41 40.6599C76.7 43.3999 75.59 45.8099 73.36 47.3799C68.5 49.5699 62.79 55.8699 57.44 51.2499C55.89 49.9099 53.1 44.6899 52.03 42.6699C50.13 39.0899 49.97 35.3699 53.56 32.7699C55.61 31.2799 59.34 29.2299 61.64 28.0599C62.45 27.6499 63.29 27.2399 64.22 27.1399H64.2ZM67 35.3499C67 34.1299 66.01 33.1499 64.8 33.1499C63.59 33.1499 62.6 34.1399 62.6 35.3499C62.6 36.5599 63.59 37.5499 64.8 37.5499C66.01 37.5499 67 36.5599 67 35.3499ZM61.13 38.7599C61.13 37.5499 60.15 36.5599 58.93 36.5599C57.71 36.5599 56.73 37.5399 56.73 38.7599C56.73 39.9799 57.71 40.9599 58.93 40.9599C60.15 40.9599 61.13 39.9799 61.13 38.7599ZM70.37 41.2199C70.37 40.0099 69.39 39.0199 68.17 39.0199C66.95 39.0199 65.97 39.9999 65.97 41.2199C65.97 42.4399 66.95 43.4199 68.17 43.4199C69.39 43.4199 70.37 42.4399 70.37 41.2199ZM64.52 44.6299C64.52 43.4099 63.53 42.4299 62.32 42.4299C61.11 42.4299 60.12 43.4199 60.12 44.6299C60.12 45.8399 61.11 46.8299 62.32 46.8299C63.53 46.8299 64.52 45.8399 64.52 44.6299Z" />
      <path d="M47.5299 40C47.8299 43.45 50.13 46.21 51.73 49.15C51.82 49.4 51.2199 49.11 51.0799 49.1C49.5099 49 48.46 50.07 48.63 51.65C48.83 53.54 51.5 54.18 52.57 52.59L53.13 51.4C55.05 54.27 58.5499 56.11 62.0299 56.1C61.9899 59.53 59.15 62.28 55.79 62.6C52.56 62.41 49.0799 62.84 45.8899 62.6C42.6999 62.36 39.79 59.58 39.54 56.25C39.34 53.54 39.34 49.06 39.54 46.35C39.84 42.27 43.56 39.57 47.54 40.01L47.5299 40Z" />
    </svg>
  );
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
  onShuffle,
}: TopBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="topbar">
      <div className="topbar-pill frosted">
        <span className="brand">
          <img className="brand-logo" src="/logo.svg" alt="Form Follows Sound" />
        </span>
      </div>

      <div className="topbar-capsule">
        <button className="capsule-icon-btn" onClick={onShuffle} title="Shuffle 3 random effects">
          <DiceIcon />
        </button>
        <div className="capsule-btn-row">
          {!liveSession && (
            <button className="capsule-btn" onClick={onStartLiveSession}>
              + Live Session
            </button>
          )}
          {!liveSession && (
            <button className={`capsule-btn ${media ? "status" : ""}`} onClick={() => inputRef.current?.click()}>
              {media ? "On progress" : "+ Add Media"}
            </button>
          )}
        </div>
      </div>
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
      {dragActive && <span className="live-error">Drop to add file</span>}
      {liveError && <span className="live-error">{liveError}</span>}

      <div className="topbar-media-row">
        {liveSession && (
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
        )}

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
