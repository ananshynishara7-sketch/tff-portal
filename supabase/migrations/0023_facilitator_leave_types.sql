-- Facilitator leave now uses your fixed leave types instead of a free-text
-- reason, so the new dashboard can count "who's on leave today" by type.
alter table facilitator_leave
  add column leave_type text not null default 'Full day - casual' check (
    leave_type in (
      'Full day - sick leave',
      'Half day - sick',
      'Full day - casual',
      'Half day - casual',
      'Short leave'
    )
  );

-- The default above was only so existing rows don't break; new rows always
-- pick a type explicitly from the app, so the default isn't needed going
-- forward, but leaving it in place is harmless.
