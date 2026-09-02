import type { ChainEntry } from "../filters/types";
import type { GLRenderer } from "../gl/GLRenderer";
import type { LoadedMedia } from "../types";
import type { SecondaryVisual } from "../App";
import type { BaseFrame, StageStats } from "./Stage";
import { InputPanel } from "./panels/InputPanel";
import { EffectsPanel, type BrowserTarget } from "./panels/EffectsPanel";
import { PreviewPanel } from "./panels/PreviewPanel";
import { ExportPanel } from "./panels/ExportPanel";

export type PanelTab = 1 | 2 | 3 | 4;

const TABS: { id: PanelTab; label: string }[] = [
  { id: 1, label: "Input" },
  { id: 2, label: "Effects" },
  { id: 3, label: "Preview" },
  { id: 4, label: "Export" },
];

interface ParamPanelProps {
  tab: PanelTab;
  onTabChange: (t: PanelTab) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;

  media: LoadedMedia | null;
  secondaryVisual: SecondaryVisual | null;
  onToggleSecondaryVisualMuted: () => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  hasAudio: boolean;
  volume: number;
  onVolumeChange: (v: number) => void;

  chain: ChainEntry[];
  onChainChange: (chain: ChainEntry[]) => void;
  activeEntryId: string | null;
  onSetActive: (id: string | null) => void;
  onOpenBrowser: (target: BrowserTarget) => void;
  getBaseFrame: () => BaseFrame | null;
  getGLRenderer: () => GLRenderer | null;

  outputScale: number;
  onOutputScaleChange: (v: number) => void;
  pixelated: boolean;
  onPixelatedChange: (v: boolean) => void;
  onCopyOutputToInput: () => void;
  getStats: () => StageStats | null;

  onExport: () => void;
  recording: boolean;
}

export function ParamPanel(props: ParamPanelProps) {
  const { tab, onTabChange, collapsed, onToggleCollapsed } = props;

  return (
    <div className="chain-panel-shell">
      <button className={`panel-toggle ${collapsed ? "collapsed" : ""}`} onClick={onToggleCollapsed}>
        {collapsed ? "‹" : "›"}
      </button>

      <div className={`chain-panel ${collapsed ? "collapsed" : ""}`}>
        <div className="panel-tabs">
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id ? "active" : ""} onClick={() => onTabChange(t.id)}>
              <span className="panel-tab-num">{t.id}</span>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 1 && (
          <InputPanel
            media={props.media}
            secondaryVisual={props.secondaryVisual}
            onToggleSecondaryVisualMuted={props.onToggleSecondaryVisualMuted}
            zoom={props.zoom}
            onZoomIn={props.onZoomIn}
            onZoomOut={props.onZoomOut}
            onZoomReset={props.onZoomReset}
            hasAudio={props.hasAudio}
            volume={props.volume}
            onVolumeChange={props.onVolumeChange}
          />
        )}

        {tab === 2 && (
          <EffectsPanel
            chain={props.chain}
            onChainChange={props.onChainChange}
            activeEntryId={props.activeEntryId}
            onSetActive={props.onSetActive}
            onOpenBrowser={props.onOpenBrowser}
            getBaseFrame={props.getBaseFrame}
            getGLRenderer={props.getGLRenderer}
            hasAudio={props.hasAudio}
          />
        )}

        {tab === 3 && (
          <PreviewPanel
            outputScale={props.outputScale}
            onOutputScaleChange={props.onOutputScaleChange}
            pixelated={props.pixelated}
            onPixelatedChange={props.onPixelatedChange}
            onCopyOutputToInput={props.onCopyOutputToInput}
            getStats={props.getStats}
            onPrevTab={() => onTabChange(2)}
            onNextTab={() => onTabChange(4)}
          />
        )}

        {tab === 4 && <ExportPanel onExport={props.onExport} recording={props.recording} />}
      </div>
    </div>
  );
}
