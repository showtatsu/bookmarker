/*
  Warnings:

  - You are about to drop the column `file_path` on the `bookmarks` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `bookmarks` table. All the data in the column will be lost.
  - You are about to drop the column `url` on the `bookmarks` table. All the data in the column will be lost.
  - Added the required column `path` to the `bookmarks` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_bookmarks" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "is_favorite" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "bookmarks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_bookmarks" ("created_at", "description", "id", "is_favorite", "title", "updated_at", "user_id") SELECT "created_at", "description", "id", "is_favorite", "title", "updated_at", "user_id" FROM "bookmarks";
DROP TABLE "bookmarks";
ALTER TABLE "new_bookmarks" RENAME TO "bookmarks";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
