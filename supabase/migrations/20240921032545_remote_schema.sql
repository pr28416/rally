create table "public"."campaign_firecrawl_descriptions" (
    "url" text not null,
    "markdown" text not null
);


CREATE UNIQUE INDEX campaign_firecrawl_descriptions_pkey ON public.campaign_firecrawl_descriptions USING btree (url, markdown);

alter table "public"."campaign_firecrawl_descriptions" add constraint "campaign_firecrawl_descriptions_pkey" PRIMARY KEY using index "campaign_firecrawl_descriptions_pkey";

grant delete on table "public"."campaign_firecrawl_descriptions" to "anon";

grant insert on table "public"."campaign_firecrawl_descriptions" to "anon";

grant references on table "public"."campaign_firecrawl_descriptions" to "anon";

grant select on table "public"."campaign_firecrawl_descriptions" to "anon";

grant trigger on table "public"."campaign_firecrawl_descriptions" to "anon";

grant truncate on table "public"."campaign_firecrawl_descriptions" to "anon";

grant update on table "public"."campaign_firecrawl_descriptions" to "anon";

grant delete on table "public"."campaign_firecrawl_descriptions" to "authenticated";

grant insert on table "public"."campaign_firecrawl_descriptions" to "authenticated";

grant references on table "public"."campaign_firecrawl_descriptions" to "authenticated";

grant select on table "public"."campaign_firecrawl_descriptions" to "authenticated";

grant trigger on table "public"."campaign_firecrawl_descriptions" to "authenticated";

grant truncate on table "public"."campaign_firecrawl_descriptions" to "authenticated";

grant update on table "public"."campaign_firecrawl_descriptions" to "authenticated";

grant delete on table "public"."campaign_firecrawl_descriptions" to "service_role";

grant insert on table "public"."campaign_firecrawl_descriptions" to "service_role";

grant references on table "public"."campaign_firecrawl_descriptions" to "service_role";

grant select on table "public"."campaign_firecrawl_descriptions" to "service_role";

grant trigger on table "public"."campaign_firecrawl_descriptions" to "service_role";

grant truncate on table "public"."campaign_firecrawl_descriptions" to "service_role";

grant update on table "public"."campaign_firecrawl_descriptions" to "service_role";


