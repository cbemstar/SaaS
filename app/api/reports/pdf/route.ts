import { NextResponse, type NextRequest } from "next/server";
import { getClient, getInsights } from "@/lib/data";
import { reportBlockMeta } from "@/lib/report-blocks";
import { isValidSection } from "@/lib/report-sections";
import { getActiveWorkspace } from "@/lib/workspace";

function escapeHtml(value: string) {
  return value
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;");
}

function parseBlocksParam(raw: string | null) {
  if (!raw) return ["kpi", "ai", "perf", "mix", "conv"];
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter((item) => isValidSection(item));
}

export async function GET(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get("clientId") ?? "kowhai";
  const blocks = parseBlocksParam(request.nextUrl.searchParams.get("blocks"));
  const [client, insights, workspace] = await Promise.all([
    getClient(clientId),
    getInsights(),
    getActiveWorkspace(),
  ]);

  if (!client) {
    return NextResponse.json({ error: "Unknown client" }, { status: 404 });
  }

  const accent = workspace?.accent_color ?? "#1f6f5c";
  const agencyName = workspace?.name ?? "Your agency";
  const footer = workspace?.report_footer ?? agencyName;
  const whiteLabel = workspace?.white_label ?? true;
  const logo = workspace?.logo_url;
  const cpa = client.conversions > 0 ? Math.round(client.monthlySpend / client.conversions) : 0;

  const sections: string[] = [];

  for (const blockId of blocks) {
    const label = reportBlockMeta(blockId).label;
    switch (blockId) {
      case "kpi":
        sections.push(`
          <section>
            <h2>${escapeHtml(label)}</h2>
            <div class="metric"><strong>Spend</strong><br />NZD ${client.monthlySpend.toLocaleString()}</div>
            <div class="metric"><strong>Conversions</strong><br />${client.conversions.toLocaleString()}</div>
            <div class="metric"><strong>ROAS</strong><br />${client.roas.toFixed(1)}x</div>
            <div class="metric"><strong>CPA</strong><br />NZD ${cpa.toLocaleString()}</div>
          </section>`);
        break;
      case "ai":
        sections.push(`
          <section class="insight">
            <strong>${escapeHtml(insights[0]?.title ?? label)}</strong>
            <p>${escapeHtml(insights[0]?.body ?? "AI narrative will be generated from synced connector data.")}</p>
            <p class="muted">${escapeHtml(insights[0]?.evidence ?? "")}</p>
          </section>`);
        break;
      default:
        sections.push(`
          <section>
            <h2>${escapeHtml(label)}</h2>
            <p class="muted">This section is included in your saved report layout. Full chart rendering is available in the in-app builder preview.</p>
          </section>`);
    }
  }

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(client.name)} Performance Report</title>
    <style>
      body { font-family: Inter, system-ui, sans-serif; margin: 0; color: #111; }
      .header { background: ${accent}; color: #fff; padding: 40px 48px; display: flex; align-items: center; gap: 16px; }
      .header img { height: 44px; width: auto; }
      .header .badge { width: 44px; height: 44px; border-radius: 10px; background: rgba(255,255,255,0.18); display: flex; align-items: center; justify-content: center; font-weight: 600; }
      .header .agency { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; opacity: 0.85; }
      .header h1 { margin: 2px 0 0; font-size: 22px; }
      .content { padding: 32px 48px; }
      .content section { margin-bottom: 28px; }
      .content h2 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; color: #666; margin: 0 0 12px; }
      .muted { color: #666; font-size: 14px; }
      .metric { display: inline-block; min-width: 150px; padding: 16px; margin: 12px 12px 12px 0; border: 1px solid #ddd; border-radius: 12px; }
      .insight { border-left: 4px solid ${accent}; padding-left: 16px; }
      .footer { border-top: 1px solid #eee; margin: 32px 48px 40px; padding-top: 16px; font-size: 12px; color: #888; display: flex; justify-content: space-between; }
    </style>
  </head>
  <body>
    <div class="header">
      ${logo ? `<img src="${escapeHtml(logo)}" alt="" />` : `<div class="badge">${escapeHtml(agencyName.slice(0, 2).toUpperCase())}</div>`}
      <div>
        <div class="agency">${escapeHtml(agencyName)}</div>
        <h1>${escapeHtml(client.name)} · Performance Report</h1>
      </div>
    </div>
    <div class="content">
      ${sections.join("\n")}
    </div>
    <div class="footer">
      <span>${escapeHtml(footer)}</span>
      ${whiteLabel ? "" : "<span>Made with Kōrero</span>"}
    </div>
  </body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-disposition": `inline; filename="${client.id}-report.html"`,
    },
  });
}
