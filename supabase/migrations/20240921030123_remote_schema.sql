create table "public"."cities" (
    "id" uuid not null default uuid_generate_v4(),
    "created_at" timestamp with time zone default CURRENT_TIMESTAMP,
    "town" text not null,
    "state" text not null,
    "mayor" text,
    "county_name" text,
    "local_government_actions" text[],
    "significant_political_events" text[],
    "average_income" text,
    "economic_growth" text,
    "birth_rates" text,
    "party_leanings" text,
    "general_vote_history" text,
    "key_issues" text[],
    "causing_issues" text[],
    "things_people_like" text[],
    "relevant_figures" text[],
    "relevant_companies" text[]
);


alter table "public"."campaign_policies" alter column "campaign_topic" set data type character varying using "campaign_topic"::character varying;

CREATE UNIQUE INDEX city_news_pkey ON public.cities USING btree (id);

alter table "public"."cities" add constraint "city_news_pkey" PRIMARY KEY using index "city_news_pkey";

grant delete on table "public"."cities" to "anon";

grant insert on table "public"."cities" to "anon";

grant references on table "public"."cities" to "anon";

grant select on table "public"."cities" to "anon";

grant trigger on table "public"."cities" to "anon";

grant truncate on table "public"."cities" to "anon";

grant update on table "public"."cities" to "anon";

grant delete on table "public"."cities" to "authenticated";

grant insert on table "public"."cities" to "authenticated";

grant references on table "public"."cities" to "authenticated";

grant select on table "public"."cities" to "authenticated";

grant trigger on table "public"."cities" to "authenticated";

grant truncate on table "public"."cities" to "authenticated";

grant update on table "public"."cities" to "authenticated";

grant delete on table "public"."cities" to "service_role";

grant insert on table "public"."cities" to "service_role";

grant references on table "public"."cities" to "service_role";

grant select on table "public"."cities" to "service_role";

grant trigger on table "public"."cities" to "service_role";

grant truncate on table "public"."cities" to "service_role";

grant update on table "public"."cities" to "service_role";


