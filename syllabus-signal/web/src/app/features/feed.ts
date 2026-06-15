import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DataService } from '../core/data.service';
import { Article, ArticleStatus, Subject } from '../core/models';
import { SubjectPill } from '../shared/subject-pill';

function iso(d: Date) { return d.toISOString().slice(0, 10); }

@Component({
  selector: 'app-feed',
  standalone: true,
  imports: [FormsModule, SubjectPill],
  template: `
    <div class="page">
      <div class="row between wrap" style="gap:12px;margin-bottom:18px">
        <div>
          <div class="eyebrow">daily feed</div>
          <h1 class="serif" style="font-size:26px;margin-top:6px">
            {{ filtering() ? 'Revision set' : 'Stories for ' + prettyDate(date()) }}</h1>
        </div>
        <div class="row gap8">
          <button class="btn" (click)="toggleFilter()">
            <i class="ti" [class.ti-filter]="!filtering()" [class.ti-calendar-event]="filtering()"></i>
            {{ filtering() ? 'Daily view' : 'Revise / filter' }}</button>
          
        </div>
      </div>

      @if (!filtering()) {
        <div class="row gap12 wrap" style="margin-bottom:20px;align-items:flex-end">
          <label class="fld" style="width:200px"><span class="cap">Pick a date</span>
            <input type="date" [(ngModel)]="dateModel" (change)="onDate()" /></label>
          <div class="live"><span class="ping"></span>{{ status() }}</div>
        </div>
      } @else {
        <div class="card" style="margin-bottom:20px">
          <div class="eyebrow" style="margin-bottom:14px"><i class="ti ti-filter"></i> Revision filters</div>
          <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr))">
            <label class="fld"><span class="cap">From</span><input type="date" [(ngModel)]="from" (change)="loadFiltered()" /></label>
            <label class="fld"><span class="cap">To</span><input type="date" [(ngModel)]="to" (change)="loadFiltered()" /></label>
            <label class="fld"><span class="cap">Topic</span>
              <select [(ngModel)]="subjectId" (change)="onSubject()">
                <option value="">All topics</option>
                @for (s of subjects(); track s.id) {<option [value]="s.id">{{ s.name }}</option>}
              </select></label>
            <label class="fld"><span class="cap">Sub-topic</span>
              <select [(ngModel)]="subtopic" (change)="loadFiltered()" [disabled]="!subjectId">
                <option value="">All sub-topics</option>
                @for (t of subtopics(); track t) {<option [value]="t">{{ t }}</option>}
              </select></label>
          </div>
        </div>
      }

      <div class="muted" style="font-size:13px;margin-bottom:14px">
        {{ articles().length }} {{ articles().length === 1 ? 'story' : 'stories' }}</div>

      @if (loading()) {
        <div class="empty">Loading stories…</div>
      } @else if (!articles().length) {
        <div class="empty"><i class="ti ti-mood-empty" style="font-size:22px"></i>
          <div style="margin-top:8px">Nothing here. Widen the dates, clear a filter, or refresh the feed.</div></div>
      } @else {
        <div class="grid cards">
          @for (a of articles(); track a.id) {
            <div class="card tap" (click)="open(a)">
              <div class="row gap8 wrap" style="margin-bottom:11px">
                <app-pill [subject]="primary(a)"></app-pill>
                @if (overlap(a) > 0) { <span class="pill plain">+{{ overlap(a) }}</span> }
                @if (status(a.id) === 'missed') { <span class="pill bad"><i class="ti ti-alert-triangle"></i> missed</span> }
              </div>
              <div class="serif" style="font-size:18px;line-height:1.32;margin-bottom:12px">{{ a.title }}</div>
              <div class="row between eyebrow">
                <span>{{ a.published_at ? prettyDate(a.published_at.slice(0,10)) : '' }}</span>
                <span style="color:var(--accent-text)">Open <i class="ti ti-arrow-right"></i></span>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class Feed implements OnInit {
  private data = inject(DataService);
  private router = inject(Router);

  date = signal(iso(new Date()));
  dateModel = iso(new Date());
  filtering = signal(false);
  from = iso(new Date(Date.now() - 6 * 864e5));
  to = iso(new Date());
  subjectId = '';
  subtopic = '';

  subjects = signal<Subject[]>([]);
  subtopics = signal<string[]>([]);
  articles = signal<Article[]>([]);
  statuses = signal<Record<string, ArticleStatus>>({});
  loading = signal(true);
  refreshing = signal(false);
  status = (id?: string) => id ? this.statuses()[id] : this.lastUpdated();
  private lastUpdated = signal('Up to date');

  async ngOnInit() {
    this.subjects.set(await this.data.getSubjects());
    this.statuses.set(await this.data.getArticleStatuses());
    await this.loadDay();
  }

  prettyDate(d: string) {
    return new Date(`${d}T00:00:00`).toLocaleDateString(undefined,
      { weekday: 'short', day: 'numeric', month: 'short' });
  }

  toggleFilter() {
    this.filtering.update((v) => !v);
    this.filtering() ? this.loadFiltered() : this.loadDay();
  }
  onDate() { this.date.set(this.dateModel); this.loadDay(); }
  async onSubject() {
    this.subtopic = '';
    this.subtopics.set(this.subjectId ? await this.data.getSubtopics(this.subjectId) : []);
    this.loadFiltered();
  }

  async loadDay() {
    this.loading.set(true);
    this.articles.set(await this.data.getArticlesByDate(this.date()));
    this.loading.set(false);
  }
  async loadFiltered() {
    this.loading.set(true);
    this.articles.set(await this.data.getArticlesFiltered(
      this.from, this.to, this.subjectId || undefined, this.subtopic || undefined));
    this.loading.set(false);
  }

  async refresh() {
    this.refreshing.set(true);
    try {
      const r = await this.data.refreshFeed();
      this.lastUpdated.set(`+${r?.new ?? 0} new · ${new Date().toLocaleTimeString()}`);
      this.statuses.set(await this.data.getArticleStatuses());
      this.filtering() ? await this.loadFiltered() : await this.loadDay();
    } catch (e: any) {
      this.lastUpdated.set(e.message || 'Refresh failed');
    } finally {
      this.refreshing.set(false);
    }
  }

  primary(a: Article): Subject | undefined {
    const links = a.article_subjects ?? [];
    return (links.find((l) => l.is_primary) ?? links[0])?.subjects;
  }
  overlap(a: Article) { return Math.max(0, (a.article_subjects?.length ?? 1) - 1); }

  open(a: Article) { this.router.navigate(['/article', a.id]); }
}
