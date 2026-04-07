import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    username?: string;
  };

  return NextResponse.json({
    success: true,
    message: "Login route scaffolded.",
    user: body.username ?? null,
  });
}
