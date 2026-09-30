-- Backfill family and diploma for the Class of 2025 cohort - present in the
-- Overview tab of the source spreadsheet but missed on the first import.
with data(full_name, family_name, diploma) as (
  values
    ('Aadarshan Chelliah Sivapathasundaram Sriskandan', 'Loving', 'Completion'),
    ('Abishaliny Santhirapalan', 'Arising Brilliance', 'Participation'),
    ('Abishana Varatharajan', 'Arising Brilliance', 'Participation'),
    ('Anosha Santhiravarnan', 'Benevolent', 'Participation'),
    ('Catharin Sayanu Anton Joseph', 'Believers', 'Completion'),
    ('Daksika Kugathas', 'Loving', 'Participation'),
    ('Daniyal Sathiyaseelan', 'Loving', 'Completion'),
    ('Denita Nagarathinam', 'Believers', 'Participation'),
    ('Difna Ananthanayagam', 'Believers', 'Participation'),
    ('Dilakshana Kajandran', 'Arising Brilliance', 'Participation'),
    ('Ishara Thilrukshi Devalagama Arachchige Senawirathna', 'Benevolent', 'Completion'),
    ('Jericksha Wesley Judeson Divera', 'Arising Brilliance', 'Completion'),
    ('John Kayas', 'Arising Brilliance', 'Participation'),
    ('Kabishan Manimaran', 'Benevolent', 'Completion'),
    ('Kesayan Nanthakumar', 'Believers', 'Participation'),
    ('Kevin Derikshan Sahaya Jehan', 'Believers', 'Participation'),
    ('Kirithiga Thavarasa', 'Loving', 'Completion'),
    ('Kishani Ravinthirakumar', 'Loving', 'Participation'),
    ('Kruthikan Vasathanayagam Josepious', 'Believers', 'Participation'),
    ('Leesiya Suvarnan', 'Arising Brilliance', 'Participation'),
    ('Majuran Selvarasa', 'Arising Brilliance', 'Completion'),
    ('Mary Rakshana Antony', 'Believers', 'Completion'),
    ('Mary Shiromy Thomas Edison', 'Arising Brilliance', 'Participation'),
    ('Mathusan Jeevaranjan', 'Benevolent', 'Completion'),
    ('Meenuya Saththiyaseelan', 'Believers', 'Participation'),
    ('Nalajini Palasuparamaniyam', 'Benevolent', 'Participation'),
    ('Napitha Kirushnarasa', 'Loving', 'Completion'),
    ('Niroy Vincent Burton', 'Benevolent', 'Participation'),
    ('Noel Richwini Fernando', 'Arising Brilliance', 'Completion'),
    ('Prashanth Regan', 'Loving', 'Participation'),
    ('Rachel Jemimah Enes Janzson', 'Believers', 'Completion'),
    ('Sampavi Sivanantham', 'Benevolent', 'Participation'),
    ('Sanushika Kajenthirakumar', 'Believers', 'Participation'),
    ('Sathurshana Paskaran', 'Loving', 'Completion'),
    ('Senthury Vasinthiran', 'Benevolent', 'Participation'),
    ('Sharon Raveendran', 'Arising Brilliance', 'Participation'),
    ('Thamilarasi Kasinkumar', 'Benevolent', 'Participation'),
    ('Theepiga Parameswaran', 'Loving', 'Participation'),
    ('Thipika Satheeswaran', 'Benevolent', 'Completion'),
    ('Thiponigaa Jeyathas', 'Arising Brilliance', 'Completion'),
    ('Thulasika Navaraththinam', 'Loving', 'Participation'),
    ('Tishanthy Sivananthan', 'Benevolent', 'Completion'),
    ('Venujan Balachandran', 'Loving', 'Participation'),
    ('Vithuja Thevaseelan', 'Benevolent', 'Participation')
)
update flag_carriers fc
set family_id = f.id,
    main_diploma = d.diploma
from data d
join families f on f.name = d.family_name
where fc.full_name = d.full_name and fc.cohort_year = '2025';
