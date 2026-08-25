-- Pengaman form dukungan hasil audit:
-- Policy insert publik (with check true) memungkinkan client anon
-- mengirim kolom status arbitrer (mis. 'resolved'). Trigger ini
-- memaksa status = 'new' pada SETIAP insert, apa pun payload client,
-- sehingga alur tiket tidak bisa dipalsukan dari sisi publik.
-- Update status oleh admin (policy update) tidak terpengaruh karena
-- trigger hanya aktif untuk INSERT.

create or replace function public.support_message_force_new_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.status := 'new';

  return new;
end;
$$;

drop trigger if exists support_messages_force_new_status
  on public.support_messages;

create trigger support_messages_force_new_status
  before insert on public.support_messages
  for each row
  execute function public.support_message_force_new_status();
