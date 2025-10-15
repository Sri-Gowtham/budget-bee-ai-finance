ALTER TABLE `user` ADD `username` text;--> statement-breakpoint
ALTER TABLE `user` ADD `phone_number` text;--> statement-breakpoint
ALTER TABLE `user` ADD `gender` text;--> statement-breakpoint
ALTER TABLE `user` ADD `date_of_birth` text;--> statement-breakpoint
ALTER TABLE `user` ADD `country` text;--> statement-breakpoint
ALTER TABLE `user` ADD `city` text;--> statement-breakpoint
ALTER TABLE `user` ADD `region` text;--> statement-breakpoint
ALTER TABLE `user` ADD `language_preference` text DEFAULT 'en';--> statement-breakpoint
ALTER TABLE `user` ADD `timezone` text;--> statement-breakpoint
ALTER TABLE `user` ADD `theme_mode` text DEFAULT 'auto';--> statement-breakpoint
ALTER TABLE `user` ADD `interest_tags` text;--> statement-breakpoint
ALTER TABLE `user` ADD `notification_preferences` text;--> statement-breakpoint
ALTER TABLE `user` ADD `accessibility_options` text;--> statement-breakpoint
ALTER TABLE `user` ADD `content_preferences` text;--> statement-breakpoint
CREATE UNIQUE INDEX `user_username_unique` ON `user` (`username`);