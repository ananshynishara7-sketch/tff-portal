-- Historical Flag Carriers roster + status-update rounds, from the
-- Class of 2024 tracking sheet (Overview + Status - May 2025 + Status - June 2026).

insert into flag_carriers (full_name, family_id, main_diploma, nic, date_of_birth, gender, mobile, whatsapp, email, address) values
  ('Banujan Kamaleshwaran', (select id from families where name = 'Believers'), 'Participation', '200101500251', '2001-01-15', 'Male', '771515164', '771515164', 'kamaleswaranbanujan@gmail.com', 'Sornavadali lane , Kokkuvil west , Kokuvil.'),
  ('Bhobyhaasan Sureshananthan', (select id from families where name = 'Arising Brilliance'), 'Achievement', null, null, 'Male', null, null, null, null),
  ('Dayana Chandran', (select id from families where name = 'Loving'), 'Completion', '200385000100', '2003-12-15', 'Female', '0778186075', '0778186075', 'dayanachanthiran@gmail.com', 'Velanai east 4th ward , Kanagasabai Chandran'),
  ('Jaanuja Jerad', (select id from families where name = 'Believers'), 'Completion', '200361100592', '2003-04-20', 'Female', '0701349826', '0760612917', 'janujajerad278@gmail.com', '1st word puthukkudiyiruppu'),
  ('Jalarasi Jokaraja', (select id from families where name = 'Benevolent'), 'Completion', '200071702520', '2023-08-04', 'Female', '761935672', '761935672', 'jalarasijokaraya@gmail.com', 'School road jeyapuram south jeyapuramn'),
  ('Jancika Partheepan', (select id from families where name = 'Loving'), 'Completion', '200256601112', '2002-03-06', 'Female', '768950321', '768950321', 'jancikapartheepan3@gmail.com', '14/2 Rasavin Thooddam, Jaffna'),
  ('Jeparaj Senthilnathan', (select id from families where name = 'Believers'), 'Achievement', null, '2007-06-07', 'Male', '766753394', '766753394', 'senthilnathanjeparaj@gmail.com', null),
  ('Kabilraj Moganarasa', (select id from families where name = 'Arising Brilliance'), 'Completion', '200309800293', '2003-04-07', 'Male', '0762059586', '0762059586', 'kabilrajk9@gmail.com', '05 ward.delftwest.delft (Mr Ganaponrajah address)'),
  ('Kamalraj Mohanarasa', (select id from families where name = 'Loving'), 'Achievement', '200419500078', '2004-07-13', 'Male', '0761769760', '0779410848', 'Kamalrajsarmila@gmail.com', 'Kandy Road Jaffna (Mr Ganaponrajah)'),
  ('Kavistan Jeyamohan', (select id from families where name = 'Arising Brilliance'), 'Completion', '200612501141', '2006-05-04', 'Male', '775185878', null, 'kavistanjeyamohan@gmail.com', 'Mamoolai Mulliyawalai'),
  ('Luxapiriyan Sivalingam', (select id from families where name = 'Loving'), 'Completion', '9745794225', '2003-06-25', 'Male', '077 295 4802', '(077) 295 4802', 'piriyanluxan@gmail.com', 'Velanai East, Ward No. 3, Velanai.'),
  ('Mathusiya Jayamohan', null, 'Achievement', '20046480061', '2004-05-27', 'Female', '768452692', '768452692', 'mathusiyajeyamohan@gmail.com', 'Uri Kalapoomi , Karainagar.'),
  ('Menuja Robert John', (select id from families where name = 'Believers'), 'Achievement', '200473100291', '2004-08-18', 'Female', '0763124478', '+94 71 729 9003', 'robertjohnmenuja@gmail.com', 'No.06 new park road , Kurunager, Jaffna'),
  ('Menujan Pathmalingam', (select id from families where name = 'Arising Brilliance'), 'Completion', '200326800262', '2003-09-24', 'Male', '775736153', '775736153', 'pmenujan@gmail.com', 'Ward no 15, Delft East.'),
  ('Piraveena Puvanenthiran', null, 'Participation', '200369000046', '2003-07-08', 'Female', '0768984592', '0768984592', 'Puvanstar2003@gmail.com', '6th ward velanai west velanai Kanapuram'),
  ('Pyula Prabakaran', (select id from families where name = 'Benevolent'), 'Completion', '200359600509', '2003-04-05', 'Female', '0760463829', '0760463829', 'pirabakaranpyula@gmail.com', 'Mamoolai Mulliyawalai'),
  ('Rishika Kirubakaran', null, 'Participation', '200280901856', '2002-11-04', 'Female', '(077) 253 7766', '704830145', 'rishikirupa@gmail.com', 'Velanai East, Ward No. 3, Velanai.'),
  ('Sanuja Yogaiya', null, 'Completion', '200463600392', '2004-04-15', 'Female', '760457965', '760457965', 'luxluxan@gmail.com', 'Palavodai Kalapomi , Karainagar.'),
  ('Sarujan Marianesan', (select id from families where name = 'Benevolent'), 'Completion', '200316300350', '2003-06-11', 'Male', '0770247415', '0770247415', 'saru59427@gmail.com', 'No.19, Racca, Road, Chundikuli, Jaffna'),
  ('Sathrack Uthayakumar', (select id from families where name = 'Loving'), 'Completion', null, '2005-05-21', 'Male', '764237428', '762379447', 'sathrakuthayakumar@gmail.com', 'Kayambu Road , Valanthalai , Karainagar.'),
  ('Simhan Sameem Mohamed', (select id from families where name = 'Believers'), 'Completion', '200421000507', '2004-07-28', 'Male', '0773298391', '0773298391', 'simhansameem2004@icloud.com', 'Musali school rd, musali sillawathurai, mannar'),
  ('Steena Suresinpanath', (select id from families where name = 'Loving'), 'Completion', '200470600341', '2004-07-24', 'Female', '762798224', '762798224', 'kanasteena@gmail.com', 'Koddapulam , Kalapumi , Karainagar.'),
  ('Tharushan Thayalan', (select id from families where name = 'Benevolent'), 'Completion', '200303600589', '2003-02-05', 'Male', '776298552', '776298552', 't.tharushan5@gmail.com', 'Jeyamakali Alvai North, Alavai Viyaparimoolai , Pointpedro'),
  ('Thuvaraga Murugananthan', (select id from families where name = 'Arising Brilliance'), 'Achievement', '200454410034', '2004-04-13', 'Female', '779165761', '779165761', 'thuvaragamurugananthan@gmail.com', 'Kalapoomi , Karainagar.'),
  ('Thuvathiga Sivakumaran', (select id from families where name = 'Arising Brilliance'), 'Achievement', null, null, 'Female', null, null, 'thikathuva@gmail.com', null),
  ('Yohan Enes Janzson Methusael', (select id from families where name = 'Loving'), 'Completion', '200333000200', '2003-11-25', 'Male', '0768701596', '0768701596', 'Yohanjazson25@gmail.com', 'Palaly Road,Urumpirai South,Urumpirai.');

-- Round: May 2025 (the sheet's looser first attempt - just employment/education text)
insert into flag_carrier_updates (flag_carrier_id, round_label, round_date, studying, working, notes)
select fc.id, 'May 2025', '2025-05-01',
  v.studying, v.working, v.notes
from flag_carriers fc
join (values
    ('Banujan Kamaleshwaran', true, false, null),
    ('Bhobyhaasan Sureshananthan', true, false, 'He is studying for a Bachelor''s degree in Engineering at the University of Moratuwa.'),
    ('Dayana Chandran', false, true, 'Internship at The Flag Forum'),
    ('Jaanuja Jerad', false, true, 'She is working part-time at the British Council, Jaffna as a teaching assistant'),
    ('Jalarasi Jokaraja', true, false, 'Psychology degree'),
    ('Jancika Partheepan', false, true, 'Working as a part-time teacher at a preschool in Nallur'),
    ('Jeparaj Senthilnathan', false, false, null),
    ('Kabilraj Moganarasa', true, true, 'Studying at Ocean University in Jaffna. Working part-time at KFC'),
    ('Kamalraj Mohanarasa', false, false, null),
    ('Kavistan Jeyamohan', false, true, 'Working at JAC restaurant'),
    ('Luxapiriyan Sivalingam', false, true, 'Planning to go abroad. But currently doing construction work with his uncle.'),
    ('Mathusiya Jayamohan', false, false, null),
    ('Menuja Robert John', false, true, 'Internship at The Flag Forum'),
    ('Menujan Pathmalingam', true, true, 'He is working at KFC in Jaffna and studying at AAT in Jaffna'),
    ('Piraveena Puvanenthiran', false, false, null),
    ('Pyula Prabakaran', false, false, null),
    ('Rishika Kirubakaran', false, false, null),
    ('Sanuja Yogaiya', false, false, null),
    ('Sarujan Marianesan', true, true, 'Following HD in Software Engineering and Computing at ICBT Campus.'),
    ('Sathrack Uthayakumar', false, true, 'Working at Jenusha Food City'),
    ('Simhan Sameem Mohamed', false, true, 'He is working in his dad''s business and waiting to go abroad.'),
    ('Steena Suresinpanath', false, true, 'She is currently working in a clothing store in Jaffna and waiting for her university entrance'),
    ('Tharushan Thayalan', true, true, 'He is working at SP Hotel Jaffna'),
    ('Thuvaraga Murugananthan', false, false, null),
    ('Thuvathiga Sivakumaran', false, false, null),
    ('Yohan Enes Janzson Methusael', true, false, 'Studying at NSBM')
) as v(full_name, studying, working, notes) on v.full_name = fc.full_name
on conflict (flag_carrier_id, round_label) do nothing;

-- Round: June 2026 (the properly structured survey format, going forward)
insert into flag_carrier_updates (flag_carrier_id, round_label, round_date, studying, study_mode, program_course, institution, working, work_mode, job_role, employer, areas_of_interest, salary, notes, follow_up)
select fc.id, 'June 2026', '2026-06-01',
  v.studying, v.study_mode, v.program_course, v.institution, v.working, v.work_mode, v.job_role, v.employer, v.areas_of_interest, v.salary, v.notes, v.follow_up
from flag_carriers fc
join (values
    ('Banujan Kamaleshwaran', true, 'Full-time', 'Cybersecurity Engineering', 'BCAS', true, 'Part-time', 'Delivery', 'Uber, Colombo', 'Engineering, IT/Software', null, 'I''m a little happier studying because I''m studying something I like.', false),
    ('Bhobyhaasan Sureshananthan', true, 'Full-time', 'IT', 'University of Moratuwa', false, null, null, null, 'IT/Software, Education/Teaching', null, null, false),
    ('Dayana Chandran', true, 'Part-time', 'Higher National Diploma in English', 'Advanced Technological Institute, Jaffna', true, 'Full-time', 'Underwriter Assistant', 'HNB General Insurance, Jaffna', 'Education/Teaching', null, 'Now I am doing work and study. Studies are going well. But I want to focus on a teaching career in the future.', false),
    ('Jaanuja Jerad', true, 'Full-time', null, null, true, 'Part-time', null, null, 'Finance', null, null, true),
    ('Jalarasi Jokaraja', true, 'Part-time', 'Bachelor''s in Social Science', 'Vavuniya Private University', false, null, null, null, 'Social Science', null, 'I am currently studying and urgently need a part-time job to support my studies.', false),
    ('Jancika Partheepan', false, null, null, null, true, 'Part-time', null, null, 'Education', null, null, true),
    ('Jeparaj Senthilnathan', false, null, null, null, false, null, null, null, null, null, null, true),
    ('Kabilraj Moganarasa', false, null, null, null, true, 'Full-time', null, null, 'Marine', null, null, true),
    ('Kamalraj Mohanarasa', false, null, null, null, false, null, null, null, 'IT/Software, Social Science, Law', null, 'Currently unemployed and job-searching. Note: mobile number on the form (0761769760) differs from the one previously on file (0779410848) — please confirm which is current.', false),
    ('Kavistan Jeyamohan', false, null, null, null, false, null, null, null, null, null, null, true),
    ('Luxapiriyan Sivalingam', false, null, null, null, true, 'Full-time', 'Cooking Helper', 'Ultimate, Qatar', 'Business/Entrepreneurship', 'LKR 25,000–50,000 (approx., as reported)', null, false),
    ('Mathusiya Jayamohan', false, null, null, null, true, 'Full-time', 'Studio Assistant', 'I Vision Studio, Karainagar', 'Education/Teaching, Arts/Design/Media', 'LKR Under 25,000 (approx., as reported)', 'Note: mobile number on the form (0741100527) differs from the one previously on file  confirm which is current.', false),
    ('Menuja Robert John', true, 'Full-time', 'Business Management', 'De Montfort University', true, 'Part-time', 'Cashier', 'Bull Head, Coventry, UK', 'Business/Entrepreneurship, Education/Teaching', null, 'Currently studying Business and Management in the UK, focusing on improving academic knowledge, communication skills, and practical business skills.', false),
    ('Menujan Pathmalingam', false, null, null, null, true, 'Full-time', 'KFC Supervisor', 'KFC, Jaffna', 'Business/Entrepreneurship, Hospitality/Tourism', 'LKR 50,000–100,000 (approx., as reported)', null, false),
    ('Piraveena Puvanenthiran', true, 'Full-time', null, 'Jaffna National College of Education, Kopay', false, null, null, null, 'Teaching', null, null, false),
    ('Pyula Prabakaran', false, null, null, null, true, 'Full-time', 'Bank Staff', 'Hatton National Bank', 'Finance/Banking', null, null, false),
    ('Rishika Kirubakaran', false, null, null, null, false, null, null, null, null, null, null, true),
    ('Sanuja Yogaiya', false, null, null, null, false, null, null, null, null, null, null, true),
    ('Sarujan Marianesan', true, 'Part-time', 'Software Engineering', 'ICBT Campus', false, null, null, null, 'Engineering, IT/Software', null, 'Currently focused on studies and continuously learning new technologies.', false),
    ('Sathrack Uthayakumar', false, null, null, null, false, null, null, null, null, null, null, true),
    ('Simhan Sameem Mohamed', false, null, null, null, false, null, null, null, 'Business/Entrepreneurship', null, 'Currently in Qatar (Doha), looking for good opportunities. Previously reported as working (Storekeeper) — now between jobs.', false),
    ('Steena Suresinpanath', true, 'Full-time', null, 'University of Jaffna', false, null, null, null, 'Arts/Design/Media', null, 'Only studying right now.', false),
    ('Tharushan Thayalan', false, null, null, null, true, 'Full-time', 'Crew Member', 'KFC, Jaffna', 'Business/Entrepreneurship, Hospitality/Tourism', 'LKR 25,000-50,000 (approx., as reported)', null, false),
    ('Thuvaraga Murugananthan', false, null, null, null, false, null, null, null, null, null, null, true),
    ('Thuvathiga Sivakumaran', false, null, null, null, true, 'Part-time', 'Field Staff', 'Seed, Mullaithivu', 'IT/Software, Education/Teaching', 'LKR Under 25,000 (approx., as reported)', null, false),
    ('Yohan Enes Janzson Methusael', true, 'Full-time', 'BSc (Hons) Computer Science', 'NSBM Green University', true, 'Part-time', 'Developer / IT Admin', 'AISHA Consultant, Cambridge, UK', 'Engineering, IT/Software, Education/Teaching, Business/Entrepreneurship', null, 'Currently finishing 2nd year, entering 3rd year. Looking for an internship in Software or IT.', false)
) as v(full_name, studying, study_mode, program_course, institution, working, work_mode, job_role, employer, areas_of_interest, salary, notes, follow_up) on v.full_name = fc.full_name
on conflict (flag_carrier_id, round_label) do nothing;
