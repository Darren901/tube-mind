import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSummaryPage } from "@/lib/notion/service";
import { Client } from "@notionhq/client";

// Use vi.hoisted to ensure the mock function is available inside vi.mock factory
const mocks = vi.hoisted(() => {
  return {
    create: vi.fn(),
  };
});

// Mock the Notion Client
vi.mock("@notionhq/client", () => {
  return {
    Client: class {
      pages = {
        create: mocks.create,
      };
      constructor(options: any) {}
    },
  };
});

describe("Notion Service", () => {
  const mockAccessToken = "secret_token";
  const mockParentPageId = "page_id_123";
  const mockVideoData = {
    title: "Test Video Title",
    url: "https://youtube.com/watch?v=123",
    videoId: "123",
    thumbnailUrl: "https://example.com/thumb.jpg",
  };
  const mockSummary = {
    topic: "Test Topic",
    keyPoints: ["Point 1", "Point 2"],
    sections: [
      {
        timestamp: "00:00",
        title: "Intro",
        summary: "Intro summary text",
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a page with correct structure", async () => {
    await createSummaryPage(
      mockAccessToken,
      mockParentPageId,
      mockSummary,
      mockVideoData
    );

    // Get the mocked instance to check the call
    // Since we are mocking the module, we can check the spy directly
    expect(mocks.create).toHaveBeenCalledTimes(1);
    
    const callArgs = mocks.create.mock.calls[0][0];

    // Check Parent
    expect(callArgs.parent).toEqual({ page_id: mockParentPageId });

    // Check Properties (Title)
    expect(callArgs.properties.title.title[0].text.content).toBe(mockVideoData.title);

    // Check Cover & Icon
    expect(callArgs.cover.external.url).toBe(mockVideoData.thumbnailUrl);
    expect(callArgs.icon.external.url).toBe(mockVideoData.thumbnailUrl);

    // Check Children (Content)
    const children = callArgs.children;
    
    // 0: Callout (Metadata)
    expect(children[0].type).toBe("callout");
    expect(children[0].callout.rich_text[0].text.content).toContain(mockVideoData.url);
    expect(children[0].callout.rich_text[0].text.content).toContain(mockVideoData.videoId);

    // 1: Heading 1 (Title)
    expect(children[1].type).toBe("heading_1");
    expect(children[1].heading_1.rich_text[0].text.content).toContain(mockSummary.topic);

    // 2: Heading 2 (Key Points)
    expect(children[2].type).toBe("heading_2");

    // 3, 4: Bullet points
    expect(children[3].type).toBe("bulleted_list_item");
    expect(children[3].bulleted_list_item.rich_text[0].text.content).toBe("Point 1");
    expect(children[4].type).toBe("bulleted_list_item");
    expect(children[4].bulleted_list_item.rich_text[0].text.content).toBe("Point 2");

    // Check Section content
    // Find the section heading
    const sectionHeadingIndex = children.findIndex((block: any) => 
      block.type === "heading_3" && block.heading_3.rich_text[0].text.content.includes("Intro")
    );
    expect(sectionHeadingIndex).toBeGreaterThan(-1);
    
    // Next block should be paragraph
    const paragraphBlock = children[sectionHeadingIndex + 1];
    expect(paragraphBlock.type).toBe("paragraph");
    expect(paragraphBlock.paragraph.rich_text[0].text.content).toBe("Intro summary text");
  });
});
