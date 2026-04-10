export type PaginationQuery = {
  page?: number;
  limit?: number;
};

export type PaginationInput = {
  page: number;
  limit: number;
  offset: number;
};

export type PaginatedResult<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

export function resolvePagination(
  query: PaginationQuery,
  defaultLimit: number,
): PaginationInput {
  const page = query.page ?? 1;
  const limit = query.limit ?? defaultLimit;

  return {
    page,
    limit,
    offset: (page - 1) * limit,
  };
}

export function buildPaginatedResult<T>(
  items: T[],
  total: number,
  pagination: PaginationInput,
): PaginatedResult<T> {
  const totalPages = total === 0 ? 1 : Math.ceil(total / pagination.limit);

  return {
    items,
    page: pagination.page,
    limit: pagination.limit,
    total,
    totalPages,
    hasPreviousPage: pagination.page > 1,
    hasNextPage: pagination.page < totalPages,
  };
}

export function hasPaginationQuery(query: PaginationQuery) {
  return query.page !== undefined || query.limit !== undefined;
}
