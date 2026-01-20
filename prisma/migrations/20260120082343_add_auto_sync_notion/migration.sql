-- AlterTable
ALTER TABLE "Channel" ADD COLUMN     "autoSyncNotion" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Summary" ADD COLUMN     "notionError" TEXT,
ADD COLUMN     "notionSyncStatus" TEXT,
ADD COLUMN     "notionUrl" TEXT;
