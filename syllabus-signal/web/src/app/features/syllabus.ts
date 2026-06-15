import { Component, OnInit, inject, signal } from '@angular/core';
import { DataService } from '../core/data.service';
import { SyllabusNode } from '../core/models';

@Component({
  selector: 'app-syllabus',
  standalone: true,
  template: `
    <div class="page">
      <div class="row between" style="margin-bottom:22px">
        <div><div class="eyebrow">reference</div>
          <h1 class="serif" style="font-size:26px;margin-top:6px">UPSC syllabus</h1></div>
        <button class="btn"><i class="ti ti-download"></i> Offline copy</button>
      </div>

      @if (loading()) { <div class="empty">Loading…</div> }
      @else {
        @for (n of nodes(); track n.id; let i = $index) {
          <div class="card" style="padding:0;margin-bottom:10px">
            <button class="acc" (click)="toggle(i)">
              <span class="row gap12">
                <span class="eyebrow" style="color:var(--accent-text)">{{ n.paper }}</span>
                <span style="font-size:15px;font-weight:500">{{ n.title }}</span>
              </span>
              <i class="ti" [class.ti-chevron-up]="open()===i" [class.ti-chevron-down]="open()!==i"></i>
            </button>
            @if (open() === i) {
              <div style="padding:0 18px 16px;font-size:14.5px;line-height:1.7;color:var(--muted)">{{ n.body }}</div>
            }
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .acc{display:flex;align-items:center;justify-content:space-between;width:100%;
      padding:15px 18px;background:none;border:none;cursor:pointer;text-align:left}
    .acc:hover{background:var(--paper)}
  `],
})
export class Syllabus implements OnInit {
  private data = inject(DataService);
  loading = signal(true);
  nodes = signal<SyllabusNode[]>([]);
  open = signal<number>(0);

  async ngOnInit() {
    this.nodes.set(await this.data.getSyllabus());
    this.loading.set(false);
  }
  toggle(i: number) { this.open.set(this.open() === i ? -1 : i); }
}
