import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DataService } from '../core/data.service';
import { Subject } from '../core/models';

interface Row { subject: Subject; pct: number; answered: number; }

@Component({
  selector: 'app-retention',
  standalone: true,
  template: `
    <div class="page" style="max-width:760px">
      <div class="page-head">
        <div class="eyebrow">your recall</div>
        <h1 class="serif" style="font-size:26px;margin-top:6px">Retention map</h1>
        <p>Weakest subjects first. Tap one to revise its current affairs.</p>
      </div>

      @if (loading()) { <div class="empty">Loading…</div> }
      @else if (!rows().length) { <div class="empty">Answer a few daily checks and your recall map fills in here.</div> }
      @else {
        @for (r of rows(); track r.subject.id) {
          <div class="card tap row between" style="gap:18px;margin-bottom:10px" (click)="revise(r.subject)">
            <div style="flex:1">
              <div class="row between" style="margin-bottom:7px">
                <span style="font-size:14.5px">{{ r.subject.name }}
                  @if (r.pct < 50) { <i class="ti ti-alert-triangle" style="color:var(--bad)"></i> }</span>
                <span style="font-size:13px;color:{{ color(r.pct) }}">
                  {{ r.answered ? r.pct + '%' : 'not tested' }}</span>
              </div>
              <div class="bar"><i [style.width.%]="r.pct" [style.background]="color(r.pct)"></i></div>
            </div>
            <span class="eyebrow" style="color:var(--accent-text);white-space:nowrap">Revise <i class="ti ti-arrow-right"></i></span>
          </div>
        }
        <div class="card" style="background:var(--bad-soft);border-color:var(--bad);color:var(--bad);margin-top:14px;font-size:13.5px">
          <i class="ti ti-target-arrow"></i> {{ focus() }}</div>
      }
    </div>
  `,
})
export class RetentionView implements OnInit {
  private data = inject(DataService);
  private router = inject(Router);
  loading = signal(true);
  rows = signal<Row[]>([]);

  async ngOnInit() {
    const [subjects, retention] = await Promise.all([
      this.data.getSubjects(), this.data.getRetention(),
    ]);
    const byId = new Map(retention.map((r) => [r.subject_id, r]));
    const rows = subjects.map((s) => {
      const r = byId.get(s.id);
      return { subject: s, pct: r?.retention_pct ?? 0, answered: r?.answered ?? 0 };
    }).sort((a, b) => a.pct - b.pct);
    this.rows.set(rows);
    this.loading.set(false);
  }

  color(pct: number) { return pct < 50 ? 'var(--bad)' : pct < 70 ? 'var(--warn)' : 'var(--good)'; }
  focus() {
    const weak = this.rows().filter((r) => r.answered && r.pct < 50).map((r) => r.subject.name);
    return weak.length ? `Focus next: ${weak.join(', ')} — below 50%.`
      : 'Keep going — no subject has dropped below 50%.';
  }
  revise(s: Subject) { this.router.navigate(['/topics'], { queryParams: { subject: s.id } }); }
}
