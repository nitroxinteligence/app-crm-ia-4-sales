import { gone } from "@/lib/api/responses";

export const runtime = "nodejs";

export async function POST() {
  return gone("UAZAPI desativado.");
}
