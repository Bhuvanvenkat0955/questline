CREATE TABLE `activity_labels` (
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`label` text NOT NULL,
	PRIMARY KEY(`kind`, `name`)
);
--> statement-breakpoint
CREATE TABLE `depends_reviews` (
	`date` text NOT NULL,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`useful_percent` integer NOT NULL,
	PRIMARY KEY(`date`, `kind`, `name`)
);
--> statement-breakpoint
CREATE TABLE `usage` (
	`date` text NOT NULL,
	`hour` integer NOT NULL,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`seconds` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`date`, `hour`, `kind`, `name`)
);
