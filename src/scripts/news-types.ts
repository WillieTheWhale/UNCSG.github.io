export type NewsStatus = "draft" | "published" | "archived";

export type ManagedNewsItem = {
  id: string;
  title: string;
  outlet: string;
  articleUrl: string;
  publishedOn: string | null;
  status: NewsStatus;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};
