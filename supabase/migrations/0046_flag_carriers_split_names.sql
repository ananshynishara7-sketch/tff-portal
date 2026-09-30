-- Split full_name into separate first_name / last_name columns so the app
-- can show and edit them as two fields, matching how the source sheets list
-- people. full_name is kept in sync (first + last) for search/back-compat.
alter table flag_carriers add column first_name text;
alter table flag_carriers add column last_name text;

update flag_carriers
set first_name = split_part(full_name, ' ', 1),
    last_name = case
      when position(' ' in full_name) > 0 then trim(substring(full_name from position(' ' in full_name) + 1))
      else ''
    end;

alter table flag_carriers alter column first_name set not null;
alter table flag_carriers alter column last_name set not null;
alter table flag_carriers alter column first_name set default '';
alter table flag_carriers alter column last_name set default '';

insert into flag_carrier_field_labels (field_key, label) values
  ('first_name', 'First Name'),
  ('last_name', 'Last Name')
on conflict (field_key) do nothing;
