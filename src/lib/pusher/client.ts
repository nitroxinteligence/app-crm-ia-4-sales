import Pusher from "pusher-js";

export const createPusherClient = (token: string) => {
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY ?? "";
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? "";

  if (!key || !cluster) {
    throw new Error("Missing Pusher public env vars.");
  }

  return new Pusher(key, {
    cluster,
    forceTLS: true,
    authEndpoint: "/api/realtime/auth",
    auth: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
};
