"use client";

import type { CSSProperties } from "react";
import type { Field } from "@measured/puck";
import { FONT_OPTIONS, colorField } from "@/components/report-builder/fields";

export type ReportTheme = {
  brandColor?: string;
  fontFamily?: string;
  pageBackground?: string;
  textColor?: string;
  spacing?: "compact" | "comfortable" | "spacious";
};

export const themeFields: Record<string, Field> = {
  brandColor: colorField("Brand colour"),
  fontFamily: { type: "select", label: "Font", options: FONT_OPTIONS },
  pageBackground: colorField("Page background"),
  textColor: colorField("Base text colour"),
  spacing: {
    type: "radio",
    label: "Spacing",
    options: [
      { label: "Compact", value: "compact" },
      { label: "Comfortable", value: "comfortable" },
      { label: "Spacious", value: "spacious" },
    ],
  },
};

const GAP: Record<string, string> = {
  compact: "0.75rem",
  comfortable: "1.25rem",
  spacious: "2rem",
};

/** Maps theme props to a style object (incl. CSS vars blocks read for accent/gap). */
export function themeStyle(theme?: ReportTheme): CSSProperties {
  const t = theme ?? {};
  return {
    fontFamily: t.fontFamily || undefined,
    background: t.pageBackground || undefined,
    color: t.textColor || undefined,
    ["--report-accent" as keyof CSSProperties]: t.brandColor || "#1f6f5c",
    ["--report-gap" as keyof CSSProperties]: GAP[t.spacing ?? "comfortable"],
  } as CSSProperties;
}
