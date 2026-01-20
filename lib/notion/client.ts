import { Client } from "@notionhq/client";

export function getNotionClient(accessToken: string): Client {
  return new Client({
    auth: accessToken,
  });
}
