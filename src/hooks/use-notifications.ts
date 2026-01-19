import useSWR from "swr";
import { useAutenticacao } from "@/lib/contexto-autenticacao";

export type Notification = {
    id: string;
    title: string;
    description: string;
    type: "info" | "success" | "warning" | "error";
    category: string;
    read_at: string | null;
    created_at: string;
    link?: string;
    metadata?: Record<string, any>;
};

const fetcher = async ([url, token]: [string, string | null]) => {
    if (!token) return [];

    const res = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!res.ok) {
        if (res.status === 401) return []; // Handle unauthorized gracefully
        throw new Error("Failed to fetch notifications");
    }

    return res.json();
};

export function useNotifications() {
    const { session } = useAutenticacao();
    const token = session?.access_token ?? null;

    const { data, error, mutate, isLoading } = useSWR<Notification[]>(
        token ? ["/api/notifications", token] : null,
        fetcher,
        {
            refreshInterval: 30000,
        }
    );

    const markAsRead = async (id?: string) => {
        if (!token) return;

        try {
            const res = await fetch("/api/notifications", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ id }),
            });

            if (!res.ok) throw new Error("Failed to mark as read");

            // Optimistic update
            mutate(
                (current: Notification[] | undefined) =>
                    current?.map((n: Notification) =>
                        id ? (n.id === id ? { ...n, read_at: new Date().toISOString() } : n) : { ...n, read_at: new Date().toISOString() }
                    ) ?? [],
                false
            );
        } catch (err) {
            console.error(err);
        }
    };

    const unreadCount = data?.filter((n) => !n.read_at).length ?? 0;

    return {
        notifications: data ?? [],
        unreadCount,
        isLoading,
        isError: error,
        markAsRead,
        mutate,
    };
}
