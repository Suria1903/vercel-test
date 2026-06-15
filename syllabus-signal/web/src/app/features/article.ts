import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { DataService } from '../core/data.service';
import { Article, ArticleStatus } from '../core/models';
import { SubjectPill } from '../shared/subject-pill';

@Component({
  selector: 'app-article',
  standalone: true,
  imports: [SubjectPill],
  template: `
    <div class="page" style="max-width:760px">
      <button class="btn ghost" style="margin-bottom:18px;padding-left:0" (click)="back()">
        <i class="ti ti-arrow-left"></i> Back</button>

      @if (loading()) {
        <div class="empty">Loading…</div>
      } @else {
        @if (article(); as a) {
          @if (myStatus() === 'missed') {
            <div class="card" style="background:var(--bad-soft);border-color:var(--bad);color:var(--bad);margin-bottom:16px;padding:13px 16px;font-size:13.5px">
              <i class="ti ti-alert-triangle"></i> You answered the check on this wrong. Reread — it returns in your next check.</div>
          }

        <div class="eyebrow" style="margin-bottom:8px">{{ source(a) }}</div>
        <h1 class="serif" style="font-size:30px;line-height:1.22;margin-bottom:20px">{{ a.title }}</h1>

        <div class="card" style="background:var(--paper);margin-bottom:22px">
          <div class="eyebrow" style="margin-bottom:4px"><i class="ti ti-link"></i>
            Why this is filed under {{ links(a).length > 1 ? 'these topics' : 'this topic' }}</div>
          @if (links(a).length > 1) {
            <div class="muted" style="font-size:12.5px;margin-bottom:12px">
              Spans {{ links(a).length }} subjects — revise it from any of them.</div>
          }
          @for (l of links(a); track l.id; let i = $index) {
            <div [style.border-top]="i ? '1px solid var(--line)' : 'none'" style="padding:12px 0">
              <div class="row gap8 wrap" style="margin-bottom:6px">
                <app-pill [subject]="l.subjects"></app-pill>
                @if (l.is_primary) { <span class="pill accent">primary</span> }
                @else { <span class="pill plain">overlap</span> }
                @if (l.subject_id === via()) { <span class="pill good"><i class="ti ti-eye"></i> viewing from here</span> }
              </div>
              <div style="font-size:14px;line-height:1.55">{{ l.rationale }}</div>
              @if (l.syllabus_ref) { <div class="eyebrow" style="margin-top:5px">{{ l.syllabus_ref }}</div> }
            </div>
          }
        </div>

        <div class="row" style="gap:6px;border-bottom:1px solid var(--line);margin-bottom:18px">
          <button class="tab" [class.on]="tab()==='story'" (click)="tab.set('story')">The story</button>
          <button class="tab" [class.on]="tab()==='syll'" (click)="tab.set('syll')">
            <i class="ti ti-school"></i> Syllabus detail</button>
        </div>

        @if (tab() === 'story') {
          <div style="background:var(--ink);border-radius:var(--r);height:200px;display:grid;place-items:center;color:#7E8C99;margin-bottom:18px">
            <div style="text-align:center"><i class="ti ti-player-play" style="font-size:30px"></i>
              <div class="eyebrow" style="margin-top:6px">video brief</div></div>
          </div>
          <p class="serif" style="font-size:17px;line-height:1.7">{{ a.summary || a.content }}</p>
          @if (a.url) {
            <a [href]="a.url" target="_blank" rel="noopener" class="btn ghost" style="padding-left:0;margin-top:10px">
              Read full source <i class="ti ti-external-link"></i></a>
          }
        } @else {
          <div class="muted" style="font-size:13.5px;margin-bottom:10px">Syllabus pointers</div>
          @for (l of links(a); track l.id) {
            <div style="display:flex;gap:10px;padding:11px 0;border-bottom:1px solid var(--line);font-size:14.5px">
              <i class="ti ti-point" style="color:var(--accent);margin-top:3px"></i>
              <span><strong style="font-weight:500">{{ l.subjects?.name }}</strong>
                @if (l.subtopic) { · {{ l.subtopic }} }
                @if (l.syllabus_ref) { — {{ l.syllabus_ref }} }</span>
            </div>
          }
        }
        } @else {
          <div class="empty">Story not found.</div>
        }
      }
    </div>
  `,
  styles: [`
    .tab{font-size:14px;padding:9px 14px;border:none;background:none;cursor:pointer;
      color:var(--muted);border-bottom:2px solid transparent;margin-bottom:-1px}
    .tab.on{color:var(--text);border-bottom-color:var(--accent)}
  `],
})
export class ArticleView implements OnInit {
  private data = inject(DataService);
  private route = inject(ActivatedRoute);
  private location = inject(Location);

  loading = signal(true);
  article = signal<Article | null>(null);
  myStatus = signal<ArticleStatus | undefined>(undefined);
  via = signal<string>('');
  tab = signal<'story' | 'syll'>('story');

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.via.set(this.route.snapshot.queryParamMap.get('via') ?? '');
    const [a, statuses] = await Promise.all([
      this.data.getArticle(id), this.data.getArticleStatuses(),
    ]);
    this.article.set(a);
    this.myStatus.set(statuses[id]);
    this.loading.set(false);
  }

  links(a: Article) {
    return [...(a.article_subjects ?? [])].sort((x, y) => Number(y.is_primary) - Number(x.is_primary));
  }
  source(a: Article) {
    const d = a.published_at ? new Date(a.published_at).toLocaleDateString() : '';
    return d;
  }
  back() { this.location.back(); }
}
