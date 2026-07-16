CREATE TABLE "platform_probe" (
	"id" uuid PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"seeded_at" timestamp with time zone DEFAULT now() NOT NULL
);
