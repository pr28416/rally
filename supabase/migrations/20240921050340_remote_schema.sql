create type "public"."topic_enum" as enum ('Immigration', 'Gun Rights', 'Healthcare', 'Climate Change', 'Economy', 'Education', 'National Security', 'Tax Policy', 'Social Security', 'Abortion', 'Civil Rights', 'Criminal Justice Reform', 'Foreign Policy', 'Voting Rights', 'Labor Rights', 'LGBTQ+ Rights', 'Drug Policy', 'Infrastructure', 'Trade Policy', 'Government Spending', 'Other');

alter table "public"."cities" add column "topics" topic_enum[];


