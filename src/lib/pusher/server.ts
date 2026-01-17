import Pusher from "pusher";
import { requireEnv } from "@/lib/config";

let pusherServer: Pusher | null = null;

export const getPusherServer = () => {
  const appId = requireEnv("PUSHER_APP_ID");
  const key = requireEnv("PUSHER_KEY");
  const secret = requireEnv("PUSHER_SECRET");
  const cluster = requireEnv("PUSHER_CLUSTER");

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
