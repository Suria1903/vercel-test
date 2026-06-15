-- Seed: static subjects (slugs MUST match the enum in api/_lib/schemas.js),
-- their sub-topics, starter RSS sources, and a slice of the syllabus tree.
-- NOTE: verify each rss_url against the publisher before relying on it.

insert into subjects (slug, name, color_bg, color_fg, sort_order) values
  ('polity',      'Polity & Governance',     '#E6F1FB', '#0C447C', 1),
  ('economy',     'Economy',                 '#EAF3DE', '#27500A', 2),
  ('ir',          'International Relations',  '#EEEDFE', '#3C3489', 3),
  ('scitech',     'Science & Technology',     '#FAECE7', '#712B13', 4),
  ('environment', 'Environment & Ecology',    '#E1F5EE', '#085041', 5),
  ('geography',   'Geography',                '#FAEEDA', '#633806', 6),
  ('history',     'History & Culture',        '#FBEAF0', '#72243E', 7),
  ('society',     'Society & Social Justice', '#F1EFE8', '#444441', 8);

insert into subtopics (subject_id, name)
select id, t.name from subjects s
join (values
  ('polity','Judiciary'),('polity','Legislature'),('polity','Executive'),('polity','Federalism'),
  ('economy','Monetary policy'),('economy','Fiscal policy'),('economy','External sector'),('economy','Agriculture'),
  ('ir','Bilateral relations'),('ir','Multilateral groupings'),('ir','Neighbourhood'),
  ('scitech','Space technology'),('scitech','Biotechnology'),('scitech','IT & computing'),
  ('environment','Coastal regulation'),('environment','Climate change'),('environment','Biodiversity'),
  ('geography','Climatology'),('geography','Physical geography'),('geography','Economic geography'),
  ('history','Modern India'),('history','Art & culture'),('history','World history'),
  ('society','Welfare schemes'),('society','Population & urbanisation')
) as t(slug, name) on t.slug = s.slug;

insert into sources (name, rss_url) values
  ('PIB',            'https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3'),
  ('The Hindu',      'https://www.thehindu.com/news/national/feeder/default.rss'),
  ('Indian Express', 'https://indianexpress.com/section/india/feed/'),
  ('Down To Earth',  'https://www.downtoearth.org.in/rss/news'),
  ('PRS Legislative','https://prsindia.org/rss');

-- A small slice of the syllabus tree (extend with the full official text).
insert into syllabus_nodes (paper, title, body, sort_order) values
  ('Prelims', 'General Studies I', 'Current events, history & freedom struggle, Indian & world geography, polity & governance, economic & social development, environment & biodiversity, general science.', 1),
  ('GS-I',    'Indian heritage, history, society & geography', 'Heritage & culture, modern Indian history, world history, society, physical & human geography.', 2),
  ('GS-II',   'Governance, polity, social justice & IR', 'Constitution, polity, governance, statutory bodies, social justice, welfare schemes, international relations.', 3),
  ('GS-III',  'Economy, technology, environment & security', 'Indian economy, agriculture, science & technology, environment & biodiversity, internal security, disaster management.', 4),
  ('GS-IV',   'Ethics, integrity & aptitude', 'Attitude, emotional intelligence, public service values, probity in governance, case studies.', 5);
