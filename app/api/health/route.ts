import { ok } from "@/lib/api-response";

export function GET() {
  return ok({
    ok: true,
    service: "vshare-v2"
  });
}
