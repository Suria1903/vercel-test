-- Purge all ingested content and user responses while keeping:
-- ✓ User accounts (profiles, auth.users)
-- ✓ Reference data (subjects, subtopics, sources, syllabus_nodes)
--
-- This clears:
-- ✗ All articles and their categorizations
-- ✗ All questions
-- ✗ All user responses

-- Start transaction for safety
begin;

-- Delete user responses (linked to questions/articles)
delete from responses;

-- Delete questions (linked to articles)
delete from questions;

-- Delete article-subject mappings
delete from article_subjects;

-- Delete articles
delete from articles;

commit;

-- Verify cleanup
select 
  (select count(*) from articles) as articles_count,
  (select count(*) from article_subjects) as article_subjects_count,
  (select count(*) from questions) as questions_count,
  (select count(*) from responses) as responses_count,
  (select count(*) from profiles) as profiles_count,
  (select count(*) from subjects) as subjects_count,
  (select count(*) from sources) as sources_count;
