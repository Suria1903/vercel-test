import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DataService } from '../core/data.service';
import { Article, ArticleStatus, Retention, Subject } from '../core/models';
import { SubjectPill } from '../shared/subject-pill';

@Component({
  selector: 'app-topic-map',
  standalone: true,
  imports: [SubjectPill],
  template: `
    <div class="page" style="max-width:720px">
      <div class="page-head">
        <div class="eyebrow">topic → current affairs</div>
        <h1 class="serif" style="font-size:26px;margin-top:6px">Topic map</h1>
        <p>Flip a topic to see every story it touches — with overlaps, recall strength, and anything you missed.</p>
      </div>

      @if (loading()) { <div class="empty">Loading…</div> }
      @else {
        @if (subject(); as s) {
          <div class="card" style="min-height:230px" (click)="flip()">
          @if (!flipped()) {
            <div style="text-align:center;padding:34px 0">
              <div style="margin-bottom:14px"><app-pill [subject]="s"></app-pill></div>
              <div class="serif" style="font-size:24px">{{ s.name }}</div>
              @if (missedCount() > 0) {
                <div style="margin-top:14px"><span class="pill bad">
                  <i class="ti ti-alert-triangle"></i> {{ missedCount() }} missed</span></div>
              }
              <div class="eyebrow" style="margin-top:18px">
                <i class="ti ti-hand-finger"></i> {{ articles().length }} linked
                {{ articles().length === 1 ? 'story' : 'stories' }} · tap to reveal</div>
            </div>
          } @else {
            <div class="row between" style="margin-bottom:12px">
              <span class="eyebrow">linked current affairs</span>
              <span class="pill" style="background:var(--paper)" [style.color]="strengthColor()">
                <i class="ti ti-brain"></i> recall {{ pct() }}% · {{ strengthLabel() }}</span>
            </div>
            <div class="bar" style="margin-bottom:14px"><i [style.width.%]="pct()" [style.background]="strengthColor()"></i></div>

            @if (missedCount() > 0) {
              <div class="card" style="background:var(--bad-soft);border-color:var(--bad);color:var(--bad);padding:11px 14px;margin-bottom:10px;font-size:13px">
                <i class="ti ti-alert-triangle"></i> You answered {{ missedCount() }} of these wrong. Tap to reread.</div>
            }

            @for (a of articles(); track a.id) {
              <div class="art" [class.miss]="statuses()[a.id]==='missed'" (click)="open($event, a)">
                <i class="ti ti-news" style="color:var(--accent);margin-top:2px"></i>
                <div style="flex:1">
                  <div style="font-size:14.5px">{{ a.title }}</div>
                  @if (overlaps(a, s.id); as ov) {
                    @if (ov.length) { <div class="eyebrow" style="margin-top:3px">
                      <i class="ti ti-affiliate"></i> also in: {{ ov.join(' · ') }}</div> }
                  }
                </div>
                @if (statuses()[a.id] === 'missed') { <span class="pill bad"><i class="ti ti-alert-triangle"></i> missed</span> }
                @else if (statuses()[a.id] === 'correct') { <span class="pill good"><i class="ti ti-check"></i> recalled</span> }
                @else { <span class="pill plain">not tested</span> }
                <i class="ti ti-chevron-right faint"></i>
              </div>
            }
            <div class="eyebrow" style="text-align:center;margin-top:12px">
              <i class="ti ti-rotate"></i> tap a card edge to flip back</div>
          }
        </div>

        <div class="row between" style="margin-top:14px">
          <button class="btn" (click)="step(-1)"><i class="ti ti-arrow-left"></i> Prev</button>
          <span class="eyebrow">{{ index()+1 }} / {{ subjects().length }}</span>
          <button class="btn" (click)="step(1)">Next <i class="ti ti-arrow-right"></i></button>
        </div>
        }
      }
    </div>
  `,
  styles: [`
    .art{display:flex;align-items:center;gap:10px;cursor:pointer;padding:11px 0;border-bottom:1px solid var(--line)}
    .art:hover{filter:brightness(.99)}
    .art.miss{background:var(--bad-soft);border:1px solid var(--bad);border-radius:var(--r-sm);padding:11px 13px;margin:6px 0}
  `],
})
export class TopicMap implements OnInit {
  private data = inject(DataService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  loading = signal(true);
  subjects = signal<Subject[]>([]);
  index = signal(0);
  flipped = signal(false);
  articles = signal<Article[]>([]);
  statuses = signal<Record<string, ArticleStatus>>({});
  private retention = signal<Map<string, Retention>>(new Map());

  subject = () => this.subjects()[this.index()];

  async ngOnInit() {
    const [subjects, statuses, retention] = await Promise.all([
      this.data.getSubjects(), this.data.getArticleStatuses(), this.data.getRetention(),
    ]);
    this.subjects.set(subjects);
    this.statuses.set(statuses);
    this.retention.set(new Map(retention.map((r) => [r.subject_id, r])));

    const wanted = this.route.snapshot.queryParamMap.get('subject');
    const i = wanted ? subjects.findIndex((s) => s.id === wanted) : 0;
    this.index.set(i >= 0 ? i : 0);
    this.flipped.set(!!wanted);
    this.loading.set(false);
    await this.loadArticles();
  }

  async loadArticles() {
    const s = this.subject();
    if (s) this.articles.set(await this.data.getTopicArticles(s.id));
  }

  flip() { this.flipped.update((v) => !v); }
  async step(dir: number) {
    const n = this.subjects().length;
    this.index.set((this.index() + dir + n) % n);
    this.flipped.set(false);
    await this.loadArticles();
  }

  pct() { return this.retention().get(this.subject()?.id)?.retention_pct ?? 0; }
  strengthLabel() { const p = this.pct(); return p < 50 ? 'weak' : p < 70 ? 'moderate' : 'strong'; }
  strengthColor() { const p = this.pct(); return p < 50 ? 'var(--bad)' : p < 70 ? 'var(--warn)' : 'var(--good)'; }
  missedCount() { return this.articles().filter((a) => this.statuses()[a.id] === 'missed').length; }

  overlaps(a: Article, currentId: string): string[] {
    return (a.article_subjects ?? [])
      .filter((l) => l.subject_id !== currentId)
      .map((l) => l.subjects?.name || '').filter(Boolean);
  }

  open(ev: Event, a: Article) {
    ev.stopPropagation();
    this.router.navigate(['/article', a.id], { queryParams: { via: this.subject()?.id } });
  }
}
