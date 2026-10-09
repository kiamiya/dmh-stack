-- ============================================================
-- DMH & Associés — S39-7 (CR réunion Loïc/Delphine du 09/10) : rappels
-- avant les RDV confirmés. pg_cron appelle l'Edge Function
-- `booking-reminders` toutes les 15 minutes, avec la clé service_role lue
-- dans le Vault (`app_service_role_key`, même secret que les automatisations
-- — migrations 030 et suivantes). Secret vide → aucun appel (pas d'erreur).
-- ============================================================

create or replace function public.call_booking_reminders()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_service_role_key text;
begin
  select decrypted_secret into v_service_role_key
  from vault.decrypted_secrets where name = 'app_service_role_key';

  if v_service_role_key is null or v_service_role_key = '' then
    return;
  end if;

  perform net.http_post(
    url => 'https://hkonylfpcstbvxswyxyh.supabase.co/functions/v1/booking-reminders',
    body => '{}'::jsonb,
    headers => jsonb_build_object('Authorization', 'Bearer ' || v_service_role_key, 'Content-Type', 'application/json')
  );
end;
$$;

revoke execute on function public.call_booking_reminders() from public, anon, authenticated;

select cron.schedule('booking-reminders', '*/15 * * * *', 'select public.call_booking_reminders();');
