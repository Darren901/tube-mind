export interface NotionPageProperties {
  title: string;
  url: string;
  videoId: string;
  thumbnailUrl?: string;
}


export interface NotionPage {
  id: string;
  title: string;
  icon: string | null;
}
