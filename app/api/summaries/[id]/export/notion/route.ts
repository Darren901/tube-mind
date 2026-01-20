import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createSummaryPage } from "@/lib/notion/service";
import { SummaryResult } from "@/lib/ai/types";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const summaryId = params.id;
    const userId = session.user.id as string;

    // 1. Fetch User settings and Summary
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { notionParentPageId: true },
    });

    if (!user?.notionParentPageId) {
      return new NextResponse("Notion settings missing (Parent Page ID)", {
        status: 400,
      });
    }

    // 2. Fetch Notion Account Access Token
    const notionAccount = await prisma.account.findFirst({
      where: {
        userId: userId,
        provider: "notion",
      },
      select: { access_token: true },
    });

    if (!notionAccount?.access_token) {
      return new NextResponse("Notion account not connected", { status: 400 });
    }

    // 3. Fetch Summary and Video Data
    const summary = await prisma.summary.findUnique({
      where: { id: summaryId },
      include: {
        video: true,
      },
    });

    if (!summary) {
      return new NextResponse("Summary not found", { status: 404 });
    }

    if (summary.userId !== userId) {
      return new NextResponse("Unauthorized", { status: 403 });
    }

    // 4. Prepare data for Notion
    // Cast the JSON content to SummaryResult.
    // Ensure the content matches the expected structure.
    const summaryContent = summary.content as unknown as SummaryResult;

    if (!summaryContent.topic && !summaryContent.sections) {
       return new NextResponse("Summary content is invalid or empty", { status: 400 });
    }

    // 5. Create Page in Notion
    const response = await createSummaryPage(
      notionAccount.access_token,
      user.notionParentPageId,
      summaryContent,
      {
        title: summary.video.title,
        url: `https://youtube.com/watch?v=${summary.video.youtubeId}`,
        videoId: summary.video.youtubeId,
        thumbnailUrl: summary.video.thumbnail || undefined,
      }
    );

    // Notion API returns the page object, which includes a public URL (if available) or we can construct it.
    // The CreatePageResponse type usually has a 'url' property which is the link to the page in Notion.
    // @ts-ignore - The types might not be perfectly inferred for the response, but 'url' exists on PageObject
    const pageUrl = (response as any).url;

    return NextResponse.json({ success: true, url: pageUrl });
  } catch (error) {
    console.error("[NOTION_EXPORT_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
