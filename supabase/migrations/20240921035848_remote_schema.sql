alter table "public"."campaign_firecrawl_descriptions" drop constraint "campaign_firecrawl_descriptions_pkey";

drop index if exists "public"."campaign_firecrawl_descriptions_pkey";

alter table "public"."campaign_policies" drop column "campaign_policy";

alter table "public"."campaign_policies" add column "detailed_campaign_policy" text not null;

CREATE UNIQUE INDEX campaign_firecrawl_descriptions_pkey ON public.campaign_firecrawl_descriptions USING btree (url);

alter table "public"."campaign_firecrawl_descriptions" add constraint "campaign_firecrawl_descriptions_pkey" PRIMARY KEY using index "campaign_firecrawl_descriptions_pkey";


