import { NextResponse } from "next/server";
import { ConfigSchema } from "@/src/config/schema";
import { runHeatmapPipeline } from "@/src/services/heatmap.service";

function toAbsoluteUrl(request: Request, endpointUrl: string): string {
  if (endpointUrl.startsWith("http://") || endpointUrl.startsWith("https://")) {
    return endpointUrl;
  }

  const requestUrl = new URL(request.url);
  return new URL(endpointUrl, requestUrl.origin).toString();
}

export async function POST(request: Request): Promise<NextResponse> {
  const noStoreHeaders = {
    "Cache-Control": "no-store",
  };

  try {
    const body = (await request.json()) as unknown;
    const parsed = ConfigSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request body.",
          details: parsed.error.flatten(),
        },
        {
          status: 422,
          headers: noStoreHeaders,
        },
      );
    }

    const config = {
      ...parsed.data,
      endpointUrl: toAbsoluteUrl(request, parsed.data.endpointUrl),
    };

    const result = await runHeatmapPipeline({ config });

    return NextResponse.json(result, {
      status: 200,
      headers: noStoreHeaders,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to compute heatmap data.";
    const status = message.includes("503") ? 503 : message.includes("400") ? 400 : 500;

    return NextResponse.json(
      {
        error: message,
      },
      {
        status,
        headers: noStoreHeaders,
      },
    );
  }
}
