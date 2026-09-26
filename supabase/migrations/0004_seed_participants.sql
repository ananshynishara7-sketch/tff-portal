-- One-time import of the 4 families and 45 active participants from the
-- current Phase 3 Google Sheets register, so the portal starts with real
-- data instead of empty tables.

insert into families (name, display_color) values
  ('Arising Brilliance', '#666666'),
  ('Believers', '#000000'),
  ('Benevolent', '#990000'),
  ('Loving', '#022269');

insert into participants (full_name, family_id, joining_date, status) values
  ('Kopina', (select id from families where name = 'Arising Brilliance'), '2026-03-03', 'Active'),
  ('Koshalya', (select id from families where name = 'Arising Brilliance'), '2026-04-20', 'Active'),
  ('Nishany', (select id from families where name = 'Arising Brilliance'), '2026-03-03', 'Active'),
  ('Prashayini', (select id from families where name = 'Arising Brilliance'), '2026-03-03', 'Active'),
  ('Putanthahi', (select id from families where name = 'Arising Brilliance'), '2026-03-09', 'Active'),
  ('Sabina', (select id from families where name = 'Arising Brilliance'), '2026-03-03', 'Active'),
  ('Sahana', (select id from families where name = 'Arising Brilliance'), '2026-03-03', 'Active'),
  ('Sathurshan', (select id from families where name = 'Arising Brilliance'), '2026-03-03', 'Active'),
  ('Sukanja', (select id from families where name = 'Arising Brilliance'), '2026-03-03', 'Active'),
  ('Thanushiyan', (select id from families where name = 'Arising Brilliance'), '2026-03-03', 'Active'),
  ('Thilakshan', (select id from families where name = 'Arising Brilliance'), '2026-03-03', 'Active'),

  ('Alansiya', (select id from families where name = 'Believers'), '2026-03-03', 'Active'),
  ('Anojini', (select id from families where name = 'Believers'), '2026-03-03', 'Active'),
  ('Jishaka', (select id from families where name = 'Believers'), '2026-03-03', 'Active'),
  ('Kamsayini', (select id from families where name = 'Believers'), '2026-03-03', 'Active'),
  ('Karthikan', (select id from families where name = 'Believers'), '2026-03-19', 'Active'),
  ('Kishalan', (select id from families where name = 'Believers'), '2026-03-03', 'Active'),
  ('Lapishanth', (select id from families where name = 'Believers'), '2026-03-03', 'Active'),
  ('Mathusika', (select id from families where name = 'Believers'), '2026-03-03', 'Active'),
  ('Tamilini', (select id from families where name = 'Believers'), '2026-04-28', 'Active'),
  ('Thanusu', (select id from families where name = 'Believers'), '2026-03-03', 'Active'),
  ('Tharanginy', (select id from families where name = 'Believers'), '2026-03-17', 'Active'),

  ('Abarna', (select id from families where name = 'Benevolent'), '2026-03-03', 'Active'),
  ('Akshayan', (select id from families where name = 'Benevolent'), '2026-03-26', 'Active'),
  ('Banusha', (select id from families where name = 'Benevolent'), '2026-03-03', 'Active'),
  ('Kathirshan', (select id from families where name = 'Benevolent'), '2026-03-03', 'Active'),
  ('Nilakshana', (select id from families where name = 'Benevolent'), '2026-03-03', 'Active'),
  ('Parustana', (select id from families where name = 'Benevolent'), '2026-03-03', 'Active'),
  ('Pirasanna', (select id from families where name = 'Benevolent'), '2026-03-26', 'Active'),
  ('Raksayana', (select id from families where name = 'Benevolent'), '2026-03-03', 'Active'),
  ('Sathana', (select id from families where name = 'Benevolent'), '2026-03-03', 'Active'),
  ('Sharony', (select id from families where name = 'Benevolent'), '2026-03-03', 'Active'),
  ('Sujanki', (select id from families where name = 'Benevolent'), '2026-03-03', 'Active'),
  ('Thadsayini', (select id from families where name = 'Benevolent'), '2026-04-23', 'Active'),
  ('Thiviya', (select id from families where name = 'Benevolent'), '2026-03-03', 'Active'),

  ('Acksaya', (select id from families where name = 'Loving'), '2026-03-03', 'Active'),
  ('Hanoji', (select id from families where name = 'Loving'), '2026-04-27', 'Active'),
  ('Jude Vinistan', (select id from families where name = 'Loving'), '2026-03-03', 'Active'),
  ('Juliya Joy', (select id from families where name = 'Loving'), '2026-03-03', 'Active'),
  ('Kalaikshana', (select id from families where name = 'Loving'), '2026-03-03', 'Active'),
  ('Kishani', (select id from families where name = 'Loving'), '2026-03-03', 'Active'),
  ('Mathusha.P', (select id from families where name = 'Loving'), '2026-03-16', 'Active'),
  ('Piraveen', (select id from families where name = 'Loving'), '2026-04-02', 'Active'),
  ('Pirisa', (select id from families where name = 'Loving'), '2026-03-31', 'Active'),
  ('Sivaruban', (select id from families where name = 'Loving'), '2026-03-03', 'Active');
