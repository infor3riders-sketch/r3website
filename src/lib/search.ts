/**
 * Sanitise free text used inside PostgREST `.or()` / `ilike` filters: strips LIKE wildcards and the
 * characters that delimit PostgREST filter expressions so users cannot inject extra conditions.
 */
export const safeSearch = (q: string) => q.replace(/[%_\,()*:.]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
