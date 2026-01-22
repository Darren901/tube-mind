import type { BlockObjectRequest } from "@notionhq/client";

import { getNotionClient } from "./client";
import { NotionPageProperties, NotionPage } from "./types";
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
  // Priority: coverUrl > specific static banner > thumbnailUrl
  const coverUrl = videoData.coverUrl || "https://res.cloudinary.com/dgailkdwe/image/upload/v1768984592/notion-banner_1_uhxuxd.jpg";
  
  const cover = {
    type: "external" as const,
    external: {
      url: coverUrl,
    },
  };
  
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

  try {
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
                },
              },
            ],
            icon: {
              emoji: "🔗",
            },
          },
        },
        ...children,
      ],
    });

    return response;
  } catch (error) {
    console.error("Failed to create Notion page:", error);
    throw new Error("Failed to create Notion page");
  }
}

export async function searchAccessiblePages(accessToken: string): Promise<NotionPage[]> {
  const notion = getNotionClient(accessToken);
  
  try {
    const response = await notion.search({
      filter: {
        value: 'page',
        property: 'object'
      },
      sort: {
        direction: 'descending',
        timestamp: 'last_edited_time'
      }
    });

    return response.results
      .filter((item: any) => {
        if (item.object !== 'page') return false;

        // Filter out generated summary pages based on icon heuristics
        if (item.icon) {
          // Check for the default "TV" emoji used by the summarizer
          if (item.icon.type === 'emoji' && item.icon.emoji === '📺') {
            return false;
          }
          // Check for YouTube thumbnail URLs used as page icons
          if (item.icon.type === 'external' && item.icon.external?.url) {
            const url = item.icon.external.url;
            if (
              url.includes('ytimg.com') || 
              url.includes('youtube.com') || 
              url.includes('googlevideo.com')
            ) {
              return false;
            }
          }
        }

        return true;
      })
      .map((page: any) => {
        let title = 'Untitled';
        
        if (page.properties) {
          // Find the property of type 'title'
          const titleProperty = Object.values(page.properties).find((prop: any) => prop.type === 'title');
          if (titleProperty && (titleProperty as any).title && (titleProperty as any).title.length > 0) {
            title = (titleProperty as any).title[0].plain_text;
          }
        }

        let icon = null;
        if (page.icon) {
          if (page.icon.type === 'emoji') {
            icon = page.icon.emoji;
          } else if (page.icon.type === 'external') {
            icon = page.icon.external.url;
          } else if (page.icon.type === 'file') {
            icon = page.icon.file.url;
          }
        }

        return {
          id: page.id,
          title,
          icon
        };
      });
  } catch (error) {
    console.error("Failed to search Notion pages:", error);
    throw new Error("Failed to search Notion pages");
  }
}
