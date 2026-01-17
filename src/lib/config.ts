export const getEnv = (key: string, fallback = "") =>
  process.env[key] ?? fallback

export const requireEnv = (key: string) => {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing env var: ${key}`)
  }
  return value
}
