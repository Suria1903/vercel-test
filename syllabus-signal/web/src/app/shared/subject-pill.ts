import { Component, Input } from '@angular/core';
import { Subject } from '../core/models';

@Component({
  selector: 'app-pill',
  standalone: true,
  template: `
    <span class="pill" [style.background]="subject?.color_bg" [style.color]="subject?.color_fg">
      <span class="dot" [style.background]="subject?.color_fg"></span>{{ subject?.name }}
    </span>
  `,
})
export class SubjectPill {
  @Input() subject?: Subject;
}
