import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    data: [],
    resource: "borrow-requests",
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  return NextResponse.json(
    {
      resource: "borrow-requests",
      action: "create",
      payload: body,
    },
    { status: 201 },
  );
}
