import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// GET: List notifications for current user
export async function GET(request: NextRequest) {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");

    const { data: notifications, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(limit);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(notifications);
}

// PATCH: Mark as read
export async function PATCH(request: NextRequest) {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id } = body; // If id is null/undefined, mark all as read

    let query = supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", user.id);

    if (id) {
        query = query.eq("id", id);
    } else {
        query = query.is("read_at", null); // Mark only unread ones
    }

    const { error } = await query;

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}

// POST: Create notification (Internal/System use)
export async function POST(request: NextRequest) {
    // Validate System/Admin secret if needed, or allow authenticated users to trigger
    // For now, checking for Service Role key in header or simple auth might be enough, 
    // but typically notifications are triggered by system events.
    // We'll require a standard auth token for now to attribute 'user_id' if needed or just use service role for everything.

    // For simplicity, we allow creating notifications if authenticated (e.g. from client actions which is rare)
    // or mainly receiving calls from other backend routes.

    // Actually, this endpoint might be called by other internal services.
    // Let's secure it by checking for a valid session.

    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
        // If internal call, might need a special secret.
        // For this MVP, we assume triggers happen inside other API routes using Supabase direct calls, 
        // or via this route if needed.
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const schema = z.object({
        user_id: z.string().uuid(),
        workspace_id: z.string().uuid(),
        title: z.string().min(1),
        description: z.string().optional(),
        type: z.enum(["info", "success", "warning", "error"]).default("info"),
        category: z.string().default("System"),
        link: z.string().optional(),
        metadata: z.record(z.any()).optional(),
    });

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { data, error } = await supabase
        .from("notifications")
        .insert(parsed.data)
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
}
