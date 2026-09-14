-- Phase 14 hardening — covering indexes for administrator foreign keys used by
-- contact notes and outbound reply history. Forward-only, no data mutation.

create index if not exists contact_enquiry_notes_admin_id_idx
  on public.contact_enquiry_notes(admin_id);

create index if not exists contact_enquiry_messages_created_by_admin_id_idx
  on public.contact_enquiry_messages(created_by_admin_id);

comment on index public.contact_enquiry_notes_admin_id_idx is
  'Phase 14 covering index for contact_enquiry_notes.admin_id foreign key.';

comment on index public.contact_enquiry_messages_created_by_admin_id_idx is
  'Phase 14 covering index for contact_enquiry_messages.created_by_admin_id foreign key.';
