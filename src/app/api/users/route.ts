import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    data: [],
    resource: "users",
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  return NextResponse.json(
    {
      resource: "users",
      action: "create",
      payload: body,
    },
    { status: 201 },
  );
}
