// Route params arrive as free text; a malformed id is "not found", never a database error.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (s: unknown): s is string => typeof s === 'string' && UUID.test(s);
