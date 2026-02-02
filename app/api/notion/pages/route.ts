import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { searchAccessiblePages } from "@/lib/notion/service";

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id as string;

    const notionAccount = await prisma.account.findFirst({
      where: {
        userId: userId,
        provider: "notion",
      },
      select: { access_token: true },
    });

    if (!notionAccount?.access_token) {
      return NextResponse.json(
        { error: "Notion account not connected" },
        { status: 400 }
      );
    }

    const pages = await searchAccessiblePages(notionAccount.access_token);

    return NextResponse.json({ pages });
  } catch (error) {
    console.error("[NOTION_PAGES_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
