create table "public"."clip_lengths" (
    "clip_name" text not null,
    "length" numeric not null
);


CREATE UNIQUE INDEX clip_lengths_pkey ON public.clip_lengths USING btree (clip_name);

alter table "public"."clip_lengths" add constraint "clip_lengths_pkey" PRIMARY KEY using index "clip_lengths_pkey";

grant delete on table "public"."clip_lengths" to "anon";

grant insert on table "public"."clip_lengths" to "anon";

grant references on table "public"."clip_lengths" to "anon";

grant select on table "public"."clip_lengths" to "anon";

grant trigger on table "public"."clip_lengths" to "anon";

grant truncate on table "public"."clip_lengths" to "anon";

grant update on table "public"."clip_lengths" to "anon";

grant delete on table "public"."clip_lengths" to "authenticated";

grant insert on table "public"."clip_lengths" to "authenticated";

grant references on table "public"."clip_lengths" to "authenticated";

grant select on table "public"."clip_lengths" to "authenticated";

grant trigger on table "public"."clip_lengths" to "authenticated";

grant truncate on table "public"."clip_lengths" to "authenticated";

grant update on table "public"."clip_lengths" to "authenticated";

grant delete on table "public"."clip_lengths" to "service_role";

grant insert on table "public"."clip_lengths" to "service_role";

grant references on table "public"."clip_lengths" to "service_role";

grant select on table "public"."clip_lengths" to "service_role";

grant trigger on table "public"."clip_lengths" to "service_role";

grant truncate on table "public"."clip_lengths" to "service_role";

grant update on table "public"."clip_lengths" to "service_role";


