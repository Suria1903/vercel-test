export interface Subject {
  id: string; slug: string; name: string;
  color_bg: string; color_fg: string; sort_order: number;
}

export interface ArticleSubject {
  id: string; article_id: string; subject_id: string;
  is_primary: boolean; subtopic: string | null;
  rationale: string; syllabus_ref: string | null;
  subjects?: Subject;            // embedded
}

export interface Article {
  id: string; source_id: string | null; url: string;
  title: string; summary: string | null; content: string | null;
  image_url: string | null; video_url: string | null;
  published_at: string | null; fetched_at: string; processed: boolean;
  article_subjects?: ArticleSubject[];   // embedded
}

export interface Question {
  id: string; article_id: string; subject_id: string;
  stem: string; options: string[]; correct_index: number;
  explanation: string; subjects?: Subject;
}

export interface Retention {
  subject_id: string; answered: number; correct: number; retention_pct: number;
}

export interface SyllabusNode {
  id: string; paper: string; title: string; body: string | null; sort_order: number;
}

export type ArticleStatus = 'correct' | 'missed';
