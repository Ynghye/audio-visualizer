import type { MediaKind } from "../types";

interface MediaTabsProps {
  activeKind: MediaKind | null;
}

const TABS: { key: MediaKind; label: string }[] = [
  { key: "audio", label: "Audio" },
  { key: "video", label: "Video" },
  { key: "image", label: "Photo" },
];

export function MediaTabs({ activeKind }: MediaTabsProps) {
  return (
    <div className="media-tabs">
      {TABS.map((tab) => (
        <div key={tab.key} className={`media-tab ${activeKind === tab.key ? "active" : ""}`}>
          {tab.label}
        </div>
      ))}
    </div>
  );
}
