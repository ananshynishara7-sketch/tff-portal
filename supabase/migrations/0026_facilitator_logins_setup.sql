-- Prerequisite for facilitator login accounts: links a facilitator record to
-- their eventual login (profiles.id), same pattern as
-- participants.profile_id from migration 0011. Also fills in the email
-- addresses Nishara provided, so the next script (0027) knows who to create
-- accounts for.
alter table facilitators add column profile_id uuid references profiles(id) on delete set null;
create unique index if not exists facilitators_profile_id_key on facilitators (profile_id) where profile_id is not null;

-- Suba is not a Flag Forum facilitator (she just teaches some lessons), so
-- she's deliberately left with no email and gets no login account.
update facilitators set email = 'leadfacilitator@theflagforum.com' where full_name = 'Jeyastan';
update facilitators set email = 'ananshyntff@gmail.com' where full_name = 'Nishara';
update facilitators set email = 'gajan.btff@gmail.com' where full_name = 'Gajan';
update facilitators set email = 'jenny.vtff@gmail.com' where full_name = 'Jenny';
update facilitators set email = 'rageethanmtff@gmail.com' where full_name = 'Rageethan';
update facilitators set email = 'thuvarahanntff@gmail.com' where full_name = 'Thuvarahan';
update facilitators set email = 'daksiktff@gmail.com' where full_name = 'Dakshika';
update facilitators set email = 'jerickshawtff@gmail.com' where full_name = 'Jericksha';
