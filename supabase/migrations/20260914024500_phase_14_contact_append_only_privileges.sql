-- Phase 14.2 corrective hardening.
--
-- Earlier database default privileges grant service_role broad rights on new public
-- tables. The Phase-14 history/notes/messages domains are intentionally append-only,
-- so reassert their exact table privileges after creation.

revoke all on table
  public.contact_enquiry_history,
  public.contact_enquiry_notes,
  public.contact_enquiry_messages
from service_role;

grant select, insert on table
  public.contact_enquiry_history,
  public.contact_enquiry_notes,
  public.contact_enquiry_messages
to service_role;

-- Browser roles remain denied explicitly as defense in depth.
revoke all on table
  public.contact_enquiry_history,
  public.contact_enquiry_notes,
  public.contact_enquiry_messages
from public, anon, authenticated;
