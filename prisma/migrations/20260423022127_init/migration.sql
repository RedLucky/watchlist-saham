-- CreateTable
CREATE TABLE `Recommendation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ticker` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `mode` VARCHAR(191) NOT NULL,
    `style` VARCHAR(191) NOT NULL,
    `score` INTEGER NOT NULL,
    `priceAtRecommend` DOUBLE NOT NULL,
    `entryLow` DOUBLE NOT NULL,
    `entryHigh` DOUBLE NOT NULL,
    `targetPrice` DOUBLE NOT NULL,
    `stopLoss` DOUBLE NOT NULL,
    `rrRatio` DOUBLE NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'OPEN',
    `exitPrice` DOUBLE NULL,
    `exitDate` DATETIME(3) NULL,
    `notes` TEXT NULL,

    INDEX `Recommendation_ticker_idx`(`ticker`),
    INDEX `Recommendation_date_idx`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
