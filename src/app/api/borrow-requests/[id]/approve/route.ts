import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  context: RouteContext<"/api/borrow-requests/[id]/approve">,
) {
  const { id } = await context.params;

  return NextResponse.json({
    resource: "borrow-requests",
    action: "approve",
    id,
  });
}
