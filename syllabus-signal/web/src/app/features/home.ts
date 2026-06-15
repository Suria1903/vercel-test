import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { DataService } from '../core/data.service';
import { Question } from '../core/models';
import { SubjectPill } from '../shared/subject-pill';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [SubjectPill],
  template: `
    <div class="page">
      <div class="page-head">
        <div class="eyebrow">{{ today }}</div>
        <h1 class="serif" style="font-size:30px;margin-top:6px">Today's check-in</h1>
      </div>

      <div class="metrics" style="margin-bottom:26px">
        <div class="metric"><div class="v">{{ streak() }}</div><div class="l">Quiz streak</div></div>
        <div class="metric"><div class="v" style="color:var(--bad)">{{ missedCount() }}</div><div class="l">Articles missed</div></div>
        <div class="metric"><div class="v" style="color:var(--bad)">{{ weakCount() }}</div><div class="l">Weak subjects</div></div>
        <div class="metric"><div class="v">{{ answered() }}</div><div class="l">Answered today</div></div>
      </div>

      @if (loading()) {
        <div class="card"><div class="empty">Loading your daily check…</div></div>
      } @else if (!current()) {
        <div class="card"><div class="empty">No questions yet. Refresh the feed to generate today's check.</div></div>
      } @else {
        <div class="card">
          <div class="row between" style="margin-bottom:14px">
            <div class="eyebrow"><i class="ti ti-bulb"></i> Daily retention check</div>
            <div class="muted" style="font-size:12.5px">{{ index()+1 }} / {{ questions().length }}</div>
          </div>

          <div style="margin-bottom:14px"><app-pill [subject]="current()!.subjects"></app-pill></div>
          <div class="serif" style="font-size:21px;line-height:1.35;margin-bottom:18px">{{ current()!.stem }}</div>

          @for (opt of current()!.options; track $index) {
            <button class="opt-btn" [disabled]="picked()!==null"
              [class.correct]="picked()!==null && $index===current()!.correct_index"
              [class.wrong]="picked()===$index && $index!==current()!.correct_index"
              (click)="answer($index)">{{ opt }}</button>
          }

          @if (picked()!==null) {
            <div style="margin-top:14px;font-size:14px;line-height:1.6">
              @if (picked()===current()!.correct_index) {
                <span style="color:var(--good);font-weight:500">Correct.</span>
              } @else {
                <span style="color:var(--bad);font-weight:500">Not quite.</span>
              }
              {{ current()!.explanation }}
              @if (picked()!==current()!.correct_index) {
                <div class="muted" style="font-size:12.5px;margin-top:6px">
                  Flagged the linked story as missed — find it in Topic map.</div>
              }
            </div>
            <button class="btn" style="margin-top:16px" (click)="next()">
              {{ index()+1 < questions().length ? 'Next question' : 'Done for now' }}
              <i class="ti ti-arrow-right"></i></button>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .opt-btn{display:block;width:100%;text-align:left;font-size:15px;padding:13px 15px;margin:8px 0;
      min-height:48px;border:1px solid var(--line-strong);border-radius:var(--r-sm);
      background:var(--surface);cursor:pointer}
    .opt-btn:hover:not(:disabled){background:#F3F2EE}
    .opt-btn.correct{border-color:var(--good);background:var(--good-soft);color:var(--good)}
    .opt-btn.wrong{border-color:var(--bad);background:var(--bad-soft);color:var(--bad)}
  `],
})
export class Home implements OnInit {
  private data = inject(DataService);
  private router = inject(Router);

  today = new Date().toLocaleDateString(undefined, { weekday:'long', day:'numeric', month:'long' });

  loading = signal(true);
  questions = signal<Question[]>([]);
  index = signal(0);
  picked = signal<number | null>(null);
  streak = signal(0);
  answered = signal(0);
  missedCount = signal(0);
  weakCount = signal(0);

  current = computed(() => this.questions()[this.index()] ?? null);

  async ngOnInit() {
    const [qs, statuses, retention] = await Promise.all([
      this.data.getDailyQuestions(),
      this.data.getArticleStatuses(),
      this.data.getRetention(),
    ]);
    this.questions.set(qs);
    this.missedCount.set(Object.values(statuses).filter((s) => s === 'missed').length);
    this.weakCount.set(retention.filter((r) => r.retention_pct < 50).length);
    this.loading.set(false);
  }

  async answer(i: number) {
    if (this.picked() !== null) return;
    this.picked.set(i);
    const q = this.current()!;
    await this.data.submitResponse(q, i);
    this.answered.update((n) => n + 1);
    if (i === q.correct_index) this.streak.update((n) => n + 1);
    else this.streak.set(0);
  }

  next() {
    if (this.index() + 1 < this.questions().length) {
      this.index.update((n) => n + 1);
      this.picked.set(null);
    } else {
      this.router.navigateByUrl('/feed');
    }
  }
}
