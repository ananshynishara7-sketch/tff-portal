-- Links a family to whichever facilitator leads it, so that facilitator can
-- see "their" family's attendance on their dashboard. No such link existed
-- before - families and facilitators were only connected indirectly through
-- participants.
alter table families add column if not exists lead_facilitator_id uuid references profiles(id) on delete set null;

-- Wire up the four leaders as given: Nishara - Arising Brilliance,
-- Gajan - Believers, Jenny - Benevolent, Rageethan - Loving.
-- This only takes effect for a leader once they actually have a login
-- (facilitators.profile_id set) - harmless no-op otherwise, can be re-run
-- after they log in for the first time.
update families set lead_facilitator_id = (
  select profile_id from facilitators where full_name = 'Nishara' and profile_id is not null
) where name = 'Arising Brilliance';

update families set lead_facilitator_id = (
  select profile_id from facilitators where full_name = 'Gajan' and profile_id is not null
) where name = 'Believers';

update families set lead_facilitator_id = (
  select profile_id from facilitators where full_name = 'Jenny' and profile_id is not null
) where name = 'Benevolent';

update families set lead_facilitator_id = (
  select profile_id from facilitators where full_name = 'Rageethan' and profile_id is not null
) where name = 'Loving';
