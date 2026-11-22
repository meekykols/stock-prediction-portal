export function paging(query, { defaultLimit = 20, maxLimit = 100 } = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(maxLimit, Math.max(1, Number(query.limit) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}

export const paged = (items, total, { page, limit }) => ({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });

export const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
