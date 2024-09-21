create table "public"."voter_records" (
    "id" uuid not null default gen_random_uuid(),
    "first_name" character varying not null,
    "last_name" character varying not null,
    "age" integer,
    "city" character varying,
    "state" character varying,
    "party_affiliation" character varying,
    "campaigns_donated_to" text[],
    "nonprofits_donated_to" text[]
);


CREATE UNIQUE INDEX voter_records_pkey ON public.voter_records USING btree (id);

alter table "public"."voter_records" add constraint "voter_records_pkey" PRIMARY KEY using index "voter_records_pkey";

grant delete on table "public"."voter_records" to "anon";

grant insert on table "public"."voter_records" to "anon";

grant references on table "public"."voter_records" to "anon";

grant select on table "public"."voter_records" to "anon";

grant trigger on table "public"."voter_records" to "anon";

grant truncate on table "public"."voter_records" to "anon";

grant update on table "public"."voter_records" to "anon";

grant delete on table "public"."voter_records" to "authenticated";

grant insert on table "public"."voter_records" to "authenticated";

grant references on table "public"."voter_records" to "authenticated";

grant select on table "public"."voter_records" to "authenticated";

grant trigger on table "public"."voter_records" to "authenticated";

grant truncate on table "public"."voter_records" to "authenticated";

grant update on table "public"."voter_records" to "authenticated";

grant delete on table "public"."voter_records" to "service_role";

grant insert on table "public"."voter_records" to "service_role";

grant references on table "public"."voter_records" to "service_role";

grant select on table "public"."voter_records" to "service_role";

grant trigger on table "public"."voter_records" to "service_role";

grant truncate on table "public"."voter_records" to "service_role";

grant update on table "public"."voter_records" to "service_role";


