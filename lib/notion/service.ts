import { Client } from "@notionhq/client";
import { BlockObjectRequest } from "@notionhq/client/build/src/api-endpoints";
import { getNotionClient } from "./client";
import { NotionPageProperties } from "./types";
import { SummaryResult } from "@/lib/ai/types";

export async function createSummaryPage(
  accessToken: string,
  parentPageId: string,
  summary: SummaryResult,
  videoData: NotionPageProperties
) {
  const notion = getNotionClient(accessToken);

  const children: BlockObjectRequest[] = [];

  // 1. Heading 1: Title
  children.push({
    object: "block",
    type: "heading_1",
    heading_1: {
      rich_text: [
        {
          type: "text",
          text: {
            content: `Video Summary: ${summary.topic}`,
          },
        },
      ],
    },
  });

  // 2. Heading 2: Key Points
  children.push({
    object: "block",
    type: "heading_2",
    heading_2: {
      rich_text: [
        {
          type: "text",
          text: {
            content: "Key Points",
          },
        },
      ],
    },
  });

  // 3. Key Points List
  if (summary.keyPoints && summary.keyPoints.length > 0) {
    summary.keyPoints.forEach((point) => {
      children.push({
        object: "block",
        type: "bulleted_list_item",
        bulleted_list_item: {
          rich_text: [
            {
              type: "text",
              text: {
                content: point,
              },
            },
          ],
        },
      });
    });
  }

  // 4. Heading 2: Detailed Breakdown
  children.push({
    object: "block",
    type: "heading_2",
    heading_2: {
      rich_text: [
        {
          type: "text",
          text: {
            content: "Detailed Breakdown",
          },
        },
      ],
    },
  });

  // 5. Sections
  if (summary.sections && summary.sections.length > 0) {
    summary.sections.forEach((section) => {
      // Heading 3: Timestamp + Title
      children.push({
        object: "block",
        type: "heading_3",
        heading_3: {
          rich_text: [
            {
              type: "text",
              text: {
                content: `[${section.timestamp}] ${section.title}`,
              },
            },
          ],
        },
      });

      // Paragraph: Summary
      // Truncate if excessively long (Notion limit is 2000 chars per text block)
      const content = section.summary.length > 2000 
        ? section.summary.substring(0, 1997) + "..."
        : section.summary;

      children.push({
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [
            {
              type: "text",
              text: {
                content: content,
              },
            },
          ],
        },
      });
    });
  }

  // Cover image logic
  const cover = videoData.thumbnailUrl
    ? {
        type: "external" as const,
        external: {
          url: videoData.thumbnailUrl,
        },
      }
    : undefined;
  
    // Icon logic (use thumbnail if available, otherwise default emoji)
   const icon = videoData.thumbnailUrl 
   ? {
       type: "external" as const,
       external: {
         url: videoData.thumbnailUrl,
       },
     }
   : {
       type: "emoji" as const,
       emoji: "📺",
     };


  const response = await notion.pages.create({
    parent: {
      page_id: parentPageId,
    },
    cover: cover,
    icon: icon,
    properties: {
      title: {
        title: [
          {
            text: {
              content: videoData.title,
            },
          },
        ],
      },
      // Note: These property names ("URL", "Video ID") must match the database schema if saving to a database.
      // But here we are creating a child page of a PAGE, not a DATABASE item usually.
      // If parent is a Page, we can only set the 'title' property.
      // If parent is a Database, we can set other properties defined in the schema.
      // The requirement says "parentPageId", implies it's a sub-page.
      // So we generally can't set custom properties like "URL" or "VideoID" unless it's a database item.
      // However, the instructions said: "Properties: Title (video title), URL (video youtube link), VideoID (text)."
      // If the parent is just a regular page, we can't add custom properties to the child page metadata easily without it being in a DB.
      // I will put the URL and VideoID in the BODY of the page as a metadata block at the top instead, to be safe and compatible with Page parents.
      // OR, I can assume the user might provide a Database ID.
      // Given the ambiguity, I'll add them to the body content as the first block callout or text.
    },
    children: [
        // Metadata Block (URL and Video ID)
        {
            object: "block",
            type: "callout",
            callout: {
                rich_text: [
                    {
                        type: "text",
                        text: {
                            content: `Source: ${videoData.url}\nVideo ID: ${videoData.videoId}`,
                        }
                    }
                ],
                icon: {
                    emoji: "🔗"
                }
            }
        },
        ...children
    ],
  });

  return response;
}
