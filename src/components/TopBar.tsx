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

/** The capsule's background, traced directly from the design SVG: the rounded end
 * caps plus the two scalloped/wavy dividers between segments, as one combined shape.
 * Stretched (non-uniform scale) to whatever width the real button content needs —
 * the wave positions are approximate against our text rather than pixel-locked to
 * the mockup's specific button labels, which is the necessary tradeoff for staying
 * responsive instead of hard-coding fixed segment widths. */
function CapsuleBg() {
  return (
    <svg
      className="capsule-bg"
      viewBox="694.96 55.2 454.81 63.75"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="#1d1d1d"
        d="M796.27 118.94C789.87 118.94 783.7 117.04 778.43 113.46C773.34 110 767.45 108.26 761.55 108.26C755.65 108.26 749.77 109.99 744.67 113.46C739.4 117.05 733.23 118.94 726.83 118.94C709.25 118.94 694.96 104.64 694.96 87.07C694.96 69.5 709.26 55.2 726.83 55.2C733.23 55.2 739.4 57.1 744.67 60.68C749.76 64.14 755.65 65.8799 761.55 65.8799C767.45 65.8799 773.33 64.15 778.43 60.68C783.7 57.09 789.87 55.2 796.27 55.2C813.85 55.2 828.14 69.5 828.14 87.07C828.14 104.64 813.84 118.94 796.27 118.94Z
           M941.79 55.2H796.56V118.95H941.79V55.2Z
           M1011.23 118.94C1004.83 118.94 998.66 117.04 993.39 113.46C988.3 110 982.41 108.26 976.51 108.26C970.61 108.26 964.73 109.99 959.63 113.46C954.36 117.05 948.19 118.94 941.79 118.94C924.21 118.94 909.92 104.64 909.92 87.07C909.92 69.5 924.22 55.2 941.79 55.2C948.19 55.2 954.36 57.1 959.63 60.68C964.72 64.14 970.61 65.8799 976.51 65.8799C982.41 65.8799 988.29 64.15 993.39 60.68C998.66 57.09 1004.83 55.2 1011.23 55.2C1028.81 55.2 1043.1 69.5 1043.1 87.07C1043.1 104.64 1028.8 118.94 1011.23 118.94Z
           M1117.9 55.2H1011.23V118.95H1117.9V55.2Z
           M1117.9 118.94C1135.5 118.94 1149.77 104.671 1149.77 87.07C1149.77 69.4686 1135.5 55.2 1117.9 55.2C1100.3 55.2 1086.03 69.4686 1086.03 87.07C1086.03 104.671 1100.3 118.94 1117.9 118.94Z"
      />
    </svg>
  );
}

/** Traced directly from the user's design SVG (the ghost-holding-a-die mark next to
 * "+ Live Session") rather than redrawn — same path data, just re-viewBox'd. */
function DiceIcon() {
  return (
    <svg width="20" height="20" viewBox="705 62 46 46" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M734.16 68.3399C738.44 67.8599 740.17 70.2099 742.1 73.4399C743.22 75.3199 746.16 79.9099 746.37 81.8599C746.66 84.5999 745.55 87.0099 743.32 88.5799C738.46 90.7699 732.75 97.0699 727.4 92.4499C725.85 91.1099 723.06 85.8899 721.99 83.8699C720.09 80.2899 719.93 76.5699 723.52 73.9699C725.57 72.4799 729.3 70.4299 731.6 69.2599C732.41 68.8499 733.25 68.4399 734.18 68.3399H734.16ZM736.96 76.5499C736.96 75.3299 735.97 74.3499 734.76 74.3499C733.55 74.3499 732.56 75.3399 732.56 76.5499C732.56 77.7599 733.55 78.7499 734.76 78.7499C735.97 78.7499 736.96 77.7599 736.96 76.5499ZM731.09 79.9599C731.09 78.7499 730.11 77.7599 728.89 77.7599C727.67 77.7599 726.69 78.7399 726.69 79.9599C726.69 81.1799 727.67 82.1599 728.89 82.1599C730.11 82.1599 731.09 81.1799 731.09 79.9599ZM740.33 82.4199C740.33 81.2099 739.35 80.2199 738.13 80.2199C736.91 80.2199 735.93 81.1999 735.93 82.4199C735.93 83.6399 736.91 84.6199 738.13 84.6199C739.35 84.6199 740.33 83.6399 740.33 82.4199ZM734.48 85.8299C734.48 84.6099 733.49 83.6299 732.28 83.6299C731.07 83.6299 730.08 84.6199 730.08 85.8299C730.08 87.0399 731.07 88.0299 732.28 88.0299C733.49 88.0299 734.48 87.0399 734.48 85.8299Z" />
      <path d="M717.49 81.1999C717.79 84.6499 720.09 87.41 721.69 90.35C721.78 90.6 721.18 90.31 721.04 90.3C719.47 90.2 718.42 91.27 718.59 92.85C718.79 94.74 721.46 95.38 722.53 93.79L723.09 92.6C725.01 95.47 728.51 97.31 731.99 97.3C731.95 100.73 729.11 103.48 725.75 103.8C722.52 103.61 719.04 104.04 715.85 103.8C712.66 103.56 709.75 100.78 709.5 97.4499C709.3 94.7399 709.3 90.26 709.5 87.55C709.8 83.47 713.52 80.77 717.5 81.21L717.49 81.1999Z" />
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
