-- Allow half-point ratings (e.g. 8.5, 9.5) in monthly reflections.
-- Rating columns were integer, which silently rounds decimals on insert.
-- Convert them to numeric so half scores persist.
alter table monthly_reflections
  alter column rating_overall type numeric(4, 1),
  alter column rating_health type numeric(4, 1),
  alter column rating_career type numeric(4, 1),
  alter column rating_finances type numeric(4, 1),
  alter column rating_friends type numeric(4, 1),
  alter column rating_family type numeric(4, 1),
  alter column rating_romance type numeric(4, 1),
  alter column rating_fun type numeric(4, 1),
  alter column rating_growth type numeric(4, 1),
  alter column rating_mental_health type numeric(4, 1),
  alter column rating_spirituality type numeric(4, 1),
  alter column rating_environment type numeric(4, 1),
  alter column rating_productivity type numeric(4, 1);
