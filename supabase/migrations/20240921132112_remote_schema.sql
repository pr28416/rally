alter table "public"."cities" add column "state_governor" text;

alter table "public"."cities" alter column "town" drop not null;


