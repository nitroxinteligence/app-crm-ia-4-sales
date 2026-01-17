export const parseGraphError = async (
  response: Response,
  fallback: string
) => {
  const text = await response.text().catch(() => "")
  if (!text) return `${fallback} (${response.status}).`
  try {
    const payload = JSON.parse(text) as { error?: { message?: string } }
    if (payload?.error?.message) {
      return payload.error.message
    }
  } catch {
    // ignore parse errors and fall back to raw text
  }
  return text
}
