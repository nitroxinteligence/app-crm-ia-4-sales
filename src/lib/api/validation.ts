import { z } from "zod"

type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: "invalid_json" | "invalid_payload"; issues?: z.ZodIssue[] }

export const parseJsonBody = async <T>(
  request: Request,
  schema: z.ZodType<T>
): Promise<ParseResult<T>> => {
  let payload: unknown

  try {
    payload = await request.json()
  } catch {
    return { ok: false, error: "invalid_json" }
  }

  const result = schema.safeParse(payload)
  if (!result.success) {
    return { ok: false, error: "invalid_payload", issues: result.error.issues }
  }

  return { ok: true, data: result.data }
}
