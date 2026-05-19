import { NextResponse } from "next/server";
import { buildHealthPayload } from "@/lib/env/runtime";

export function GET() {
  const payload = buildHealthPayload();
  const status = payload.status === "ok" ? 200 : 503;

  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
