import { NextResponse } from "next/server";

export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
};

export type ApiErrorResponse = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export function successResponse<T>(data: T, init?: ResponseInit) {
  return NextResponse.json<ApiSuccessResponse<T>>(
    {
      success: true,
      data,
    },
    init,
  );
}

export function errorResponse(
  error: ApiErrorResponse["error"],
  init?: ResponseInit,
) {
  return NextResponse.json<ApiErrorResponse>(
    {
      success: false,
      error,
    },
    init,
  );
}
