-- Widen the private attachment size ceiling without changing existing rows.
alter table public.contact_message_attachments
  drop constraint if exists contact_message_attachments_size_bytes_check;
alter table public.contact_message_attachments
  add constraint contact_message_attachments_size_bytes_check
  check (size_bytes between 1 and 25000000);

update storage.buckets set file_size_limit = 25000000
where id = 'contact-attachments';

create or replace function public.admin_queue_contact_reply_with_attachments(
  p_admin_id uuid, p_enquiry_id uuid, p_expected_version integer,
  p_subject text, p_body text, p_attachments jsonb default '[]'::jsonb,
  p_ip_hash text default null, p_user_agent text default null
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_result jsonb;
  v_attachment jsonb;
  v_path text;
  v_total bigint;
begin
  if jsonb_typeof(p_attachments) is distinct from 'array' then
    return jsonb_build_object('ok', false, 'code', 'VALIDATION');
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_attachments) a
    where jsonb_typeof(a->'size_bytes') <> 'number'
       or (a->>'size_bytes') !~ '^[0-9]+$'
       or length(a->>'size_bytes') > 8
  ) then
    return jsonb_build_object('ok', false, 'code', 'VALIDATION');
  end if;
  select coalesce(sum((a->>'size_bytes')::bigint), 0)
    into v_total from jsonb_array_elements(p_attachments) a;
  if v_total > 25000000 or exists (
    select 1 from jsonb_array_elements(p_attachments) a
    where (a->>'size_bytes')::bigint < 1
  ) then
    return jsonb_build_object('ok', false, 'code', 'VALIDATION');
  end if;

  v_result := public.admin_queue_contact_enquiry_reply(
    p_admin_id, p_enquiry_id, p_expected_version, p_subject, p_body,
    p_ip_hash, p_user_agent
  );
  if coalesce((v_result->>'ok')::boolean, false) is not true then return v_result; end if;

  for v_attachment in select value from jsonb_array_elements(p_attachments) loop
    v_path := v_attachment->>'storage_path';
    if v_path is null or v_path !~ '^outbound/[0-9a-f-]{36}/[0-9]+$'
       or not exists (
         select 1 from storage.objects
         where bucket_id = 'contact-attachments' and name = v_path
           and (metadata->>'size')::bigint = (v_attachment->>'size_bytes')::bigint
       ) then
      raise exception 'contact attachment missing from private storage';
    end if;
    insert into public.contact_message_attachments (
      outbound_message_id, storage_path, filename, content_type, size_bytes
    ) values (
      (v_result->>'message_id')::uuid, v_path,
      left(v_attachment->>'filename', 255),
      left(v_attachment->>'content_type', 150),
      (v_attachment->>'size_bytes')::integer
    );
  end loop;
  return v_result;
end;
$$;
