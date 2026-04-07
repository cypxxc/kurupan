import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    data: [],
    resource: "assets",
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  return NextResponse.json(
    {
      resource: "assets",
      action: "create",
      payload: body,
    },
    { status: 201 },
  );
}
