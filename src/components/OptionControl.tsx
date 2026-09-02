import type { AudioBand, FilterOptionDef, OptionValue } from "../filters/types";

interface OptionControlProps {
  option: FilterOptionDef;
  value: OptionValue;
  onChange: (v: OptionValue) => void;
  audioLink?: AudioBand;
  onAudioLinkChange?: (band: AudioBand | undefined) => void;
  hasAudio?: boolean;
}

const BAND_CYCLE: (AudioBand | undefined)[] = [undefined, "bass", "mid", "treble", "level"];
const BAND_LABEL: Record<AudioBand, string> = { bass: "B", mid: "M", treble: "T", level: "L" };

export function OptionControl({ option, value, onChange, audioLink, onAudioLinkChange, hasAudio }: OptionControlProps) {
  const showAudioLink = option.type === "range" && hasAudio && onAudioLinkChange;

  function cycleAudioLink() {
    if (!onAudioLinkChange) return;
    const i = BAND_CYCLE.indexOf(audioLink);
    onAudioLinkChange(BAND_CYCLE[(i + 1) % BAND_CYCLE.length]);
  }

  if (option.type === "range") {
    const num = Number(value);
    return (
      <div className="opt-row">
        <div className="opt-row-top">
          <span>{option.label}</span>
          <span className="opt-row-right">
            {showAudioLink && (
              <button
                className={`audio-link-btn ${audioLink ? "linked" : ""}`}
                onClick={cycleAudioLink}
                title={audioLink ? `Reacting to ${audioLink} — click to change` : "Click to react to audio"}
              >
                {audioLink ? BAND_LABEL[audioLink] : "♪"}
              </button>
            )}
            <span className="opt-val">{num.toFixed(option.step && option.step < 1 ? 2 : 0)}</span>
          </span>
        </div>
        <input
          type="range"
          min={option.min}
          max={option.max}
          step={option.step ?? 1}
          value={num}
          onChange={(e) => onChange(parseFloat(e.target.value))}
        />
      </div>
    );
  }

  if (option.type === "bool") {
    return (
      <div className="opt-row opt-row-bool">
        <span>{option.label}</span>
        <button className={`switch ${value ? "on" : ""}`} onClick={() => onChange(!value)}>
          <span className="knob" />
        </button>
      </div>
    );
  }

  if (option.type === "select") {
    return (
      <div className="opt-row opt-row-select">
        <span>{option.label}</span>
        <select value={String(value)} onChange={(e) => onChange(e.target.value)}>
          {option.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // color
  return (
    <div className="opt-row opt-row-color">
      <span>{option.label}</span>
      <input type="color" value={String(value)} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
