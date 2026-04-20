import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { canChangePlayerName, normalizePlayerName, validatePlayerName } from "@/app/lib/playerName";
import { getUserData, updateUserData } from "@/app/lib/userDataStore";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const data = await getUserData(userId);
  return NextResponse.json({
    playerName: data.playerName,
    lastNameChangedAt: data.lastNameChangedAt,
  });
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json()) as { playerName?: string };
  const rawName = body.playerName ?? "";
  const normalized = normalizePlayerName(rawName);
  const result = validatePlayerName(normalized);
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  const current = await getUserData(userId);
  const nameWindow = canChangePlayerName(current.lastNameChangedAt);
  if (!nameWindow.ok) {
    return NextResponse.json(
      {
        error: "名前変更は24時間に1回までです。",
        nextAllowedAt: nameWindow.nextAllowedAt?.toISOString() ?? null,
      },
      { status: 429 }
    );
  }

  const updated = await updateUserData(userId, (prev) => ({
    ...prev,
    playerName: normalized,
    lastNameChangedAt: new Date().toISOString(),
  }));

  return NextResponse.json({
    playerName: updated.playerName,
    lastNameChangedAt: updated.lastNameChangedAt,
  });
}

