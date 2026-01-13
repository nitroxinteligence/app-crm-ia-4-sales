export const runtime = "nodejs";

const responder = () => new Response("UAZAPI desativado.", { status: 410 });

export async function GET() {
  return responder();
}

export async function POST() {
  return responder();
}
