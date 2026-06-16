"use client";

import "@/components/report-builder/report-builder.css";
import { ItemRender, type ReportLayoutV2 } from "@/components/report-builder/registry";
import { themeStyle } from "@/components/report-builder/report-theme";
import type { ReportData } from "@/lib/report-builder/types";

const COLS = 12;
const ROW_H = 64;
const GAP = 12;

/** Read-only render of a v2 grid layout at its saved positions (print-clean). */
export function ReportRender({ layout, data }: { layout: ReportLayoutV2; data: ReportData | null }) {
  return (
    <div className="report-root rb-prose" style={themeStyle(layout.theme)}>
      <div
        className="rb-grid"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gridAutoRows: `${ROW_H}px`,
          gap: GAP,
        }}
      >
        {layout.items.map((item) => (
          <div
            key={item.id}
            style={{
              gridColumn: `${item.x + 1} / span ${item.w}`,
              gridRow: `${item.y + 1} / span ${item.h}`,
              minWidth: 0,
            }}
          >
            <ItemRender item={item} data={data} />
          </div>
        ))}
      </div>
    </div>
  );
}
