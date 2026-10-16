-- ============================================================
-- DMH & Associés — S41-2 : création de compte DMH depuis l'écran de
-- connexion (demande de Loïc, 2026-10-16), réservée aux adresses
-- @dmhassocies.com.
--
-- L'Edge Function `staff-signup` vérifie le domaine et envoie une invitation
-- par e-mail. Ce trigger accorde l'accès staff (ligne `staff_members`, qui
-- ouvre toutes les données via RLS) seulement quand l'adresse est CONFIRMÉE
-- — clic sur le lien d'invitation ou de confirmation — et seulement pour le
-- domaine DMH, quel que soit le chemin de création du compte (invitation,
-- inscription directe à l'API Auth, création par un administrateur). Taper
-- l'adresse d'un collègue sans avoir accès à sa boîte ne donne donc rien, et
-- un compte d'un autre domaine (futurs comptes clients) n'est jamais staff.
--
-- Un compte déjà staff n'est pas modifié (on conflict do nothing). Une
-- erreur d'insertion ne bloque jamais la confirmation du compte (journalisée).
-- ============================================================

create or replace function public.grant_staff_on_dmh_email_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(new.email));
  v_name text;
begin
  if new.email_confirmed_at is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.email_confirmed_at is not null and old.email is not distinct from new.email then
    return new;
  end if;
  -- Domaine exact (pas de sous-domaine ni de domaine qui ne fait que commencer pareil).
  if split_part(v_email, '@', 2) <> 'dmhassocies.com' or v_email !~ '^[^@\s]+@[^@\s]+$' then
    return new;
  end if;

  v_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    split_part(v_email, '@', 1)
  );

  -- Ne jamais faire échouer l'authentification elle-même : une erreur ici
  -- annulerait la confirmation du compte. Elle est signalée dans les logs.
  begin
    insert into staff_members (id, name, email)
    values (new.id, v_name, v_email)
    on conflict (id) do nothing;
  exception when others then
    raise warning 'grant_staff_on_dmh_email_confirmed: % (%)', sqlerrm, new.id;
  end;

  return new;
end;
$$;

revoke execute on function public.grant_staff_on_dmh_email_confirmed() from public, anon, authenticated;

drop trigger if exists on_auth_user_dmh_email_confirmed on auth.users;
create trigger on_auth_user_dmh_email_confirmed
  after insert or update of email_confirmed_at, email on auth.users
  for each row execute function public.grant_staff_on_dmh_email_confirmed();
