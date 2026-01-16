import Pusher from "pusher";

let pusherServer: Pusher | null = null;

export const getPusherServer = () => {
  const appId = process.env.PUSHER_APP_ID ?? "";
  const key = process.env.PUSHER_KEY ?? "";
  const secret = process.env.PUSHER_SECRET ?? "";
  const cluster = process.env.PUSHER_CLUSTER ?? "";

  if (!appId || !key || !secret || !cluster) {
    throw new Error("Missing Pusher env vars.");
  }

  if (!pusherServer) {
    pusherServer = new Pusher({
      appId,
      key,
      secret,
      cluster,
      useTLS: true,
    });
  }

  return pusherServer;
};
