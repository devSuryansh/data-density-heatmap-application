import { NextResponse } from "next/server";
import { parseDatasetConfig } from "@/src/config/dataset.config";
import { buildHeatmap } from "@/src/services/heatmap-builder";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    const config = parseDatasetConfig(body);

    // Server-side GraphQL calls require an absolute URL.
    if (config.endpoint.startsWith("/")) {
      const baseUrl = new URL(request.url);
      config.endpoint = new URL(config.endpoint, baseUrl.origin).toString();
    }

    const result = await buildHeatmap(config);

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to compute heatmap data.";

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 400,
      },
    );
  }
}
