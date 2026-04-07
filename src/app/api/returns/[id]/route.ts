import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/returns/[id]">,
) {
  const { id } = await context.params;

  return NextResponse.json({
    data: { id },
    resource: "returns",
  });
}

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/returns/[id]">,
) {
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));

  return NextResponse.json({
    resource: "returns",
    action: "update",
    id,
    payload: body,
  });
}
