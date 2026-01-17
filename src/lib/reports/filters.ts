type CanalQuery = {
  eq: (column: string, value: string) => unknown
}

export const applyCanalFilter = <T extends CanalQuery>(
  query: T,
  canal?: string | null
) => {
  if (canal && canal !== "todos") {
    query.eq("canal", canal)
  }
  return query
}
