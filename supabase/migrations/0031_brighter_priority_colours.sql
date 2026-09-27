-- The pastel Google-Sheets colours from 0030 were too washed out once used
-- as text/badge colour (not just a light background tint) - swap them for
-- the same red/yellow/green/blue hues but bright enough to read clearly.
update blocked_time_priorities set color = '#dc2626' where name = 'Very High';
update blocked_time_priorities set color = '#f59e0b' where name = 'High';
update blocked_time_priorities set color = '#16a34a' where name = 'Med';
update blocked_time_priorities set color = '#2563eb' where name = 'Low';
