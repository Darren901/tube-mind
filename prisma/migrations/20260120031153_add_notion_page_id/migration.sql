-- AlterTable
ALTER TABLE "Channel" ADD COLUMN     "autoRefresh" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "notionParentPageId" TEXT;

-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "transcript" JSONB;
