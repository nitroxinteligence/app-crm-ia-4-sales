import { gone } from "@/lib/api/responses";

export const runtime = "nodejs";

const responder = () => gone("UAZAPI desativado.");

export async function GET() {
  return responder();
}

export async function POST() {
  return responder();
}
