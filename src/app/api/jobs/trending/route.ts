import { NextResponse, type NextRequest } from "next/server";
import { registry } from "@/jobs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CRON_SECRET = "vetta_cron_secret_2026";

export async function GET(request: NextRequest) {
  // 仅允许 Vercel Cron 或持有 secret 的请求触发
  const secret = request.nextUrl.searchParams.get("secret");
  if (secret !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
