import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/borrow-requests/[id]">,
) {
  const { id } = await context.params;

  return NextResponse.json({
    data: { id },
    resource: "borrow-requests",
  });
}

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/borrow-requests/[id]">,
) {
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));

  return NextResponse.json({
    resource: "borrow-requests",
    action: "update",
    id,
    payload: body,
  });
}
