/** Keeps free-text search inside a PostgREST filter value, not its grammar. */
export function postgrestSearchTerm(value: string) {
  return value.trim().slice(0, 100).replace(/[^\p{L}\p{N}\s@._-]/gu, "");
}
