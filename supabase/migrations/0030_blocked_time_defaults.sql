-- The priority tags are now renamed/added/removed from the app (see
-- blocked_time_priorities), so the old hardcoded list of allowed values on
-- weekly_blocked_time.priority no longer fits - drop it and let the app
-- manage valid values instead.
alter table weekly_blocked_time drop constraint if exists weekly_blocked_time_priority_check;

-- Match the requested pastel colour scheme (red/yellow/green/blue tags).
update blocked_time_priorities set color = '#f4cccc' where name = 'Very High';
update blocked_time_priorities set color = '#fff2cc' where name = 'High';
update blocked_time_priorities set color = '#d9ead3' where name = 'Med';
update blocked_time_priorities set color = '#c9daf8' where name = 'Low';
