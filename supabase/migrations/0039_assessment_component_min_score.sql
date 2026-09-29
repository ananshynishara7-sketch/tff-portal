-- Fixes a scoring bug: "Fluency" and "Confidence" (IEP + Phase 2) and the
-- Umbrella "Assessment Score" aren't 0-floor scores - they're 1-6 and 1-5
-- rating scales (a 1 is the lowest possible mark, not a 0). The app was
-- computing each component's percentage as raw/max*100, which is only
-- correct when the floor is 0. Reproducing the original spreadsheet's own
-- PGI numbers requires (raw - floor) / (max - floor) * 100 instead.
alter table assessment_components add column min_score numeric not null default 0;

update assessment_components set min_score = 1, max_score = 6
where name in ('Fluency', 'Confidence')
  and phase_id in (select id from assessment_phases where name in ('① IEP Baseline', '④ Phase 2'));

update assessment_components set min_score = 1, max_score = 5
where name = 'Assessment Score'
  and phase_id = (select id from assessment_phases where name = '③ Umbrella Problem');
