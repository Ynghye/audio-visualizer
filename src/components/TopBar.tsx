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

/** The capsule's background, traced from the user's dedicated menu.svg: the outer
 * fused-pill silhouette plus the two inset rounded-rect outlines that mark each
 * button's own hit area (the thin gray stroke is what makes each segment read as
 * its own button, per the "grouped so it's easy to tell what's clickable" note).
 * Stretched (non-uniform scale) to whatever width the real button content needs —
 * the divider positions are approximate against our text rather than pixel-locked
 * to the mockup's specific button labels, the necessary tradeoff for staying
 * responsive instead of hard-coding fixed segment widths. */
function CapsuleBg() {
  return (
    <svg className="capsule-bg" viewBox="0 0 503 92" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      <path
        fill="#1d1d1d"
        d="M272.43 14.0059C278.615 14.1208 284.565 16.0124 289.67 19.4805C294.76 22.9404 300.65 24.6797 306.55 24.6797C312.45 24.6797 318.33 22.9503 323.43 19.4805C328.7 15.8905 334.87 14.0001 341.27 14H447.94L448.763 14.0107C465.984 14.4471 479.811 28.5438 479.811 45.8701C479.81 63.4713 465.542 77.74 447.94 77.7402V77.75H341.271V77.7393L341.27 77.7402C334.87 77.7401 328.7 75.8397 323.43 72.2598C318.34 68.7999 312.45 67.0596 306.55 67.0596C300.65 67.0596 294.77 68.7898 289.67 72.2598C284.4 75.8497 278.23 77.7402 271.83 77.7402V77.75H126.6V77.7363C126.503 77.7372 126.406 77.7402 126.31 77.7402C119.91 77.7401 113.74 75.8397 108.47 72.2598C103.38 68.7999 97.4897 67.0596 91.5898 67.0596C85.6899 67.0596 79.8099 68.7898 74.71 72.2598C69.44 75.8497 63.2701 77.7402 56.8701 77.7402C39.2902 77.7402 25.0001 63.4401 25 45.8701C25 28.3001 39.3001 14 56.8701 14C63.2701 14 69.44 15.9005 74.71 19.4805C79.7999 22.9403 85.69 24.6797 91.5898 24.6797C97.4897 24.6797 103.37 22.9503 108.47 19.4805C113.74 15.8905 119.91 14.0001 126.31 14C126.406 14 126.503 14.0021 126.6 14.0029V14H271.83L272.43 14.0059Z"
      />
      <path
        fill="#1d1d1d"
        stroke="#B2B2B2"
        strokeWidth="0.75"
        strokeMiterlimit="10"
        d="M445.3 23.0699H344.58C331.988 23.0699 321.78 33.2779 321.78 45.8699C321.78 58.462 331.988 68.67 344.58 68.67H445.3C457.892 68.67 468.1 58.462 468.1 45.8699C468.1 33.2779 457.892 23.0699 445.3 23.0699Z"
      />
      <path
        fill="#1d1d1d"
        stroke="#B2B2B2"
        strokeWidth="0.75"
        strokeMiterlimit="10"
        d="M268.69 23.0699H129.74C117.148 23.0699 106.94 33.2779 106.94 45.8699C106.94 58.462 117.148 68.67 129.74 68.67H268.69C281.282 68.67 291.49 58.462 291.49 45.8699C291.49 33.2779 281.282 23.0699 268.69 23.0699Z"
      />
    </svg>
  );
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
        <CapsuleBg />
        <button className="capsule-icon-btn" onClick={onShuffle} title="Shuffle 3 random effects">
          <DiceIcon />
        </button>
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
