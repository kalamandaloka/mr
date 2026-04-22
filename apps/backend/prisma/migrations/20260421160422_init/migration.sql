-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN', 'STUDENT') NOT NULL DEFAULT 'ADMIN',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `modules` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `category` VARCHAR(191) NULL,
    `thumbnail_url` VARCHAR(191) NULL,
    `status` ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
    `version` INTEGER NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `modules_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `scenes` (
    `id` VARCHAR(191) NOT NULL,
    `module_id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `scene_type` ENUM('orientation', 'overview', 'components', 'mechanism', 'practice', 'evaluation') NOT NULL,
    `order_no` INTEGER NOT NULL,
    `description` TEXT NULL,
    `environment_preset` VARCHAR(191) NOT NULL DEFAULT 'workshop-glass-blue',
    `status` ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `scenes_module_id_order_no_idx`(`module_id`, `order_no`),
    UNIQUE INDEX `scenes_module_id_slug_key`(`module_id`, `slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assets` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `file_type` VARCHAR(191) NOT NULL,
    `file_url` VARCHAR(191) NOT NULL,
    `thumbnail_url` VARCHAR(191) NULL,
    `mime_type` VARCHAR(191) NULL,
    `size` INTEGER NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `uploaded_by` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `scene_objects` (
    `id` VARCHAR(191) NOT NULL,
    `scene_id` VARCHAR(191) NOT NULL,
    `asset_id` VARCHAR(191) NOT NULL,
    `object_key` VARCHAR(191) NOT NULL,
    `object_name` VARCHAR(191) NOT NULL,
    `position_x` DOUBLE NOT NULL,
    `position_y` DOUBLE NOT NULL,
    `position_z` DOUBLE NOT NULL,
    `rotation_x` DOUBLE NOT NULL,
    `rotation_y` DOUBLE NOT NULL,
    `rotation_z` DOUBLE NOT NULL,
    `scale_x` DOUBLE NOT NULL DEFAULT 1,
    `scale_y` DOUBLE NOT NULL DEFAULT 1,
    `scale_z` DOUBLE NOT NULL DEFAULT 1,
    `is_interactive` BOOLEAN NOT NULL DEFAULT false,
    `metadata_json` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `scene_objects_asset_id_idx`(`asset_id`),
    UNIQUE INDEX `scene_objects_scene_id_object_key_key`(`scene_id`, `object_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `content_blocks` (
    `id` VARCHAR(191) NOT NULL,
    `scene_id` VARCHAR(191) NOT NULL,
    `block_type` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NULL,
    `body` TEXT NULL,
    `media_url` VARCHAR(191) NULL,
    `position_json` JSON NULL,
    `style_json` JSON NULL,
    `trigger_type` VARCHAR(191) NULL,
    `target_object_key` VARCHAR(191) NULL,
    `order_no` INTEGER NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `content_blocks_scene_id_order_no_idx`(`scene_id`, `order_no`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `interaction_configs` (
    `id` VARCHAR(191) NOT NULL,
    `scene_id` VARCHAR(191) NOT NULL,
    `object_key` VARCHAR(191) NOT NULL,
    `interaction_type` VARCHAR(191) NOT NULL,
    `action_type` VARCHAR(191) NOT NULL,
    `target_type` VARCHAR(191) NULL,
    `target_ref` VARCHAR(191) NULL,
    `condition_json` JSON NULL,
    `payload_json` JSON NULL,
    `priority` INTEGER NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `interaction_configs_scene_id_object_key_idx`(`scene_id`, `object_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `practice_steps` (
    `id` VARCHAR(191) NOT NULL,
    `scene_id` VARCHAR(191) NOT NULL,
    `step_no` INTEGER NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `instruction` TEXT NOT NULL,
    `expected_action` VARCHAR(191) NOT NULL,
    `target_object_key` VARCHAR(191) NULL,
    `target_anchor_key` VARCHAR(191) NULL,
    `validation_rule_json` JSON NULL,
    `success_feedback` VARCHAR(191) NULL,
    `fail_feedback` VARCHAR(191) NULL,
    `score_value` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `practice_steps_scene_id_step_no_key`(`scene_id`, `step_no`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `evaluations` (
    `id` VARCHAR(191) NOT NULL,
    `scene_id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `evaluation_type` VARCHAR(191) NOT NULL,
    `config_json` JSON NOT NULL,
    `passing_score` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `evaluations_scene_id_idx`(`scene_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_progress` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `module_id` VARCHAR(191) NOT NULL,
    `scene_id` VARCHAR(191) NOT NULL,
    `current_step` INTEGER NOT NULL DEFAULT 0,
    `completion_percent` DOUBLE NOT NULL DEFAULT 0,
    `last_state_json` JSON NULL,
    `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `user_progress_module_id_scene_id_idx`(`module_id`, `scene_id`),
    UNIQUE INDEX `user_progress_user_id_module_id_scene_id_key`(`user_id`, `module_id`, `scene_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `activity_logs` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `module_id` VARCHAR(191) NOT NULL,
    `scene_id` VARCHAR(191) NOT NULL,
    `object_key` VARCHAR(191) NULL,
    `interaction_type` VARCHAR(191) NOT NULL,
    `action_result` VARCHAR(191) NULL,
    `payload_json` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `activity_logs_user_id_module_id_scene_id_idx`(`user_id`, `module_id`, `scene_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `scenes` ADD CONSTRAINT `scenes_module_id_fkey` FOREIGN KEY (`module_id`) REFERENCES `modules`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assets` ADD CONSTRAINT `assets_uploaded_by_fkey` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `scene_objects` ADD CONSTRAINT `scene_objects_scene_id_fkey` FOREIGN KEY (`scene_id`) REFERENCES `scenes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `scene_objects` ADD CONSTRAINT `scene_objects_asset_id_fkey` FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `content_blocks` ADD CONSTRAINT `content_blocks_scene_id_fkey` FOREIGN KEY (`scene_id`) REFERENCES `scenes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `interaction_configs` ADD CONSTRAINT `interaction_configs_scene_id_fkey` FOREIGN KEY (`scene_id`) REFERENCES `scenes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `practice_steps` ADD CONSTRAINT `practice_steps_scene_id_fkey` FOREIGN KEY (`scene_id`) REFERENCES `scenes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `evaluations` ADD CONSTRAINT `evaluations_scene_id_fkey` FOREIGN KEY (`scene_id`) REFERENCES `scenes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_progress` ADD CONSTRAINT `user_progress_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_progress` ADD CONSTRAINT `user_progress_module_id_fkey` FOREIGN KEY (`module_id`) REFERENCES `modules`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_progress` ADD CONSTRAINT `user_progress_scene_id_fkey` FOREIGN KEY (`scene_id`) REFERENCES `scenes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `activity_logs` ADD CONSTRAINT `activity_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `activity_logs` ADD CONSTRAINT `activity_logs_module_id_fkey` FOREIGN KEY (`module_id`) REFERENCES `modules`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `activity_logs` ADD CONSTRAINT `activity_logs_scene_id_fkey` FOREIGN KEY (`scene_id`) REFERENCES `scenes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
