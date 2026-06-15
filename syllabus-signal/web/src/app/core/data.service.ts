import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';
import {
  Article, ArticleStatus, Question, Retention, Subject, SyllabusNode,
} from './models';

const ARTICLE_SELECT = '*, article_subjects(*, subjects(*))';

function dayBounds(date: string) {
  const start = new Date(`${date}T00:00:00`);
  const end = new Date(start); end.setDate(end.getDate() + 1);
  return { startISO: start.toISOString(), endISO: end.toISOString() };
}

@Injectable({ providedIn: 'root' })
export class DataService {
  constructor(private sb: SupabaseService, private auth: AuthService) {}
  private get db() { return this.sb.client; }

  async getSubjects(): Promise<Subject[]> {
    const { data } = await this.db.from('subjects').select('*').order('sort_order');
    return data ?? [];
  }

  async getArticlesByDate(date: string): Promise<Article[]> {
    const { startISO, endISO } = dayBounds(date);
    const { data } = await this.db.from('articles')
      .select(ARTICLE_SELECT)
      .gte('published_at', startISO).lt('published_at', endISO)
      .order('published_at', { ascending: false });
    return data ?? [];
  }

  // Revision filters: date range + optional subject + optional sub-topic.
  async getArticlesFiltered(
    from: string, to: string, subjectId?: string, subtopic?: string
  ): Promise<Article[]> {
    const { startISO } = dayBounds(from);
    const { endISO } = dayBounds(to);
    let ids: string[] | null = null;
    if (subjectId) {
      let q = this.db.from('article_subjects').select('article_id').eq('subject_id', subjectId);
      if (subtopic) q = q.eq('subtopic', subtopic);
      const { data } = await q;
      ids = (data ?? []).map((r: any) => r.article_id);
      if (!ids.length) return [];
    }
    let q = this.db.from('articles').select(ARTICLE_SELECT)
      .gte('published_at', startISO).lt('published_at', endISO)
      .order('published_at', { ascending: false });
    if (ids) q = q.in('id', ids);
    const { data } = await q;
    return data ?? [];
  }

  async getArticle(id: string): Promise<Article | null> {
    const { data } = await this.db.from('articles').select(ARTICLE_SELECT).eq('id', id).single();
    return data ?? null;
  }

  // Pool the most recent questions, shuffle, take a handful for the daily check.
  async getDailyQuestions(limit = 8): Promise<Question[]> {
    const { data } = await this.db.from('questions')
      .select('*, subjects(*)')
      .order('created_at', { ascending: false }).limit(60);
    const pool = (data ?? []) as Question[];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, limit);
  }

  async submitResponse(q: Question, selectedIndex: number) {
    const user_id = this.auth.userId;
    if (!user_id) return;
    await this.db.from('responses').insert({
      user_id, question_id: q.id, article_id: q.article_id,
      subject_id: q.subject_id, selected_index: selectedIndex,
      is_correct: selectedIndex === q.correct_index,
    });
  }

  async getRetention(): Promise<Retention[]> {
    const { data } = await this.db.from('v_user_subject_retention').select('*');
    return data ?? [];
  }

  // Map of article_id -> 'correct' | 'missed' for the signed-in user.
  async getArticleStatuses(): Promise<Record<string, ArticleStatus>> {
    const { data } = await this.db.from('v_user_article_status').select('article_id, status');
    const map: Record<string, ArticleStatus> = {};
    (data ?? []).forEach((r: any) => (map[r.article_id] = r.status));
    return map;
  }

  async getSyllabus(): Promise<SyllabusNode[]> {
    const { data } = await this.db.from('syllabus_nodes')
      .select('*').order('sort_order');
    return data ?? [];
  }

  // Every article that touches a subject — full links preserved so the UI can
  // show the OTHER subjects each story overlaps.
  async getTopicArticles(subjectId: string): Promise<Article[]> {
    const { data: links } = await this.db.from('article_subjects')
      .select('article_id').eq('subject_id', subjectId);
    const ids = (links ?? []).map((r: any) => r.article_id);
    if (!ids.length) return [];
    const { data } = await this.db.from('articles')
      .select(ARTICLE_SELECT).in('id', ids)
      .order('published_at', { ascending: false });
    return data ?? [];
  }

  async getSubtopics(subjectId: string): Promise<string[]> {
    const { data } = await this.db.from('subtopics')
      .select('name').eq('subject_id', subjectId).order('name');
    return (data ?? []).map((r: any) => r.name);
  }

  // Manual feed refresh — triggers the Claude ingest pipeline.
  async refreshFeed(): Promise<any> {    const res = await fetch(environment.ingestUrl, { method: 'POST' });
    if (!res.ok) throw new Error(`Refresh failed (${res.status})`);
    return res.json();
  }
}
