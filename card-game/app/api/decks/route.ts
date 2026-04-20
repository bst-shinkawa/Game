import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getUserData, updateUserData } from "@/app/lib/userDataStore";
import { validateDeckIds } from "@/app/data/deckBuilder";
import type { DeckRole } from "@/app/data/deck";

const roles: DeckRole[] = ["king", "usurper"];

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const data = await getUserData(userId);
  return NextResponse.json({ decks: data.decks, updatedAt: data.updatedAt });
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json()) as Partial<Record<DeckRole, number[]>>;
  const nextDecks: Partial<Record<DeckRole, number[] | null>> = {};

  for (const role of roles) {
    if (!body[role]) continue;
    const ids = body[role] as number[];
    const errors = validateDeckIds(ids, role);
    if (errors.length > 0) {
      return NextResponse.json({ error: errors[0] }, { status: 400 });
    }
    nextDecks[role] = ids;
  }

  const updated = await updateUserData(userId, (prev) => ({
    ...prev,
    decks: {
      ...prev.decks,
      ...nextDecks,
    },
  }));

  return NextResponse.json({ decks: updated.decks, updatedAt: updated.updatedAt });
}

