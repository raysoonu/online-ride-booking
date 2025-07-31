/*
  Warnings:

  - You are about to drop the column `stripePaymentId` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `stripeSessionId` on the `bookings` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_bookings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingNumber" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "userId" TEXT,
    "pickupAddress" TEXT NOT NULL,
    "dropoffAddress" TEXT NOT NULL,
    "pickupDate" DATETIME NOT NULL,
    "pickupTime" TEXT NOT NULL,
    "distance" REAL NOT NULL,
    "duration" INTEGER NOT NULL,
    "estimatedFare" REAL NOT NULL,
    "actualFare" REAL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "driverId" TEXT,
    "assignedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    CONSTRAINT "bookings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "bookings_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_bookings" ("actualFare", "assignedAt", "bookingNumber", "completedAt", "createdAt", "customerEmail", "customerName", "customerPhone", "distance", "driverId", "dropoffAddress", "duration", "estimatedFare", "id", "paymentStatus", "pickupAddress", "pickupDate", "pickupTime", "status", "updatedAt", "userId") SELECT "actualFare", "assignedAt", "bookingNumber", "completedAt", "createdAt", "customerEmail", "customerName", "customerPhone", "distance", "driverId", "dropoffAddress", "duration", "estimatedFare", "id", "paymentStatus", "pickupAddress", "pickupDate", "pickupTime", "status", "updatedAt", "userId" FROM "bookings";
DROP TABLE "bookings";
ALTER TABLE "new_bookings" RENAME TO "bookings";
CREATE UNIQUE INDEX "bookings_bookingNumber_key" ON "bookings"("bookingNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
