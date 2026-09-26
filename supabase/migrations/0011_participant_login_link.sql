-- Links a participant row to their login account (auth.users / profiles),
-- so that once a participant logs in, the portal knows which participant
-- record is theirs. Needed before participants can submit leave requests
-- or see their own attendance.
alter table participants
  add column profile_id uuid references profiles(id) on delete set null;

create unique index if not exists participants_profile_id_key
  on participants (profile_id)
  where profile_id is not null;
