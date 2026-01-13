export const runtime = "nodejs";

export async function POST() {
  return new Response("UAZAPI desativado.", { status: 410 });
}
