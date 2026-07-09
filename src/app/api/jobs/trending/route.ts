import { NextResponse } from "next/server";
import { registry } from "@/jobs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const logs: string[] = [];

  try {
    await registry.run("trending", {
      signal: AbortSignal.timeout(5 * 60 * 1000), // 5 分钟超时
      log: (message: string) => {
        console.log(message);
        logs.push(message);
      },
    });

    return NextResponse.json({
      success: true,
      logs,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[TrendingJob] 执行失败:", errorMessage);
    logs.push(`[ERROR] ${errorMessage}`);

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        logs,
      },
      { status: 500 },
    );
  }
}
