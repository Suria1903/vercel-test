import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div style="min-height:100vh;min-height:100dvh;display:grid;place-items:center;padding:24px">
      <div style="width:100%;max-width:380px">
        <div class="row gap12" style="margin-bottom:26px">
          <div class="mark" style="width:40px;height:40px;border-radius:10px;background:var(--accent);display:grid;place-items:center;color:#fff;font-size:21px"><i class="ti ti-radar-2"></i></div>
          <div>
            <div class="serif" style="font-size:21px">Syllabus &amp; Signal</div>
            <div class="eyebrow">current affairs, mapped</div>
          </div>
        </div>

        <div class="card">
          <h2 style="font-size:19px;margin-bottom:4px">{{ mode()==='in' ? 'Welcome back' : 'Create your account' }}</h2>
          <p class="muted" style="font-size:13.5px;margin:0 0 18px">
            {{ mode()==='in' ? 'Sign in to pick up your revision.' : 'Set up takes only a few seconds.' }}
          </p>

          <label class="fld" style="margin-bottom:12px">
            <span class="cap">Email</span>
            <input type="email" [(ngModel)]="email" autocomplete="email" placeholder="you@example.com" />
          </label>
          <label class="fld" style="margin-bottom:16px">
            <span class="cap">Password</span>
            <input type="password" [(ngModel)]="password" autocomplete="current-password" placeholder="••••••••" />
          </label>

          @if (error()) {
            <div class="pill bad" style="display:block;margin-bottom:14px;padding:9px 12px;border-radius:var(--r-sm)">{{ error() }}</div>
          }
          @if (notice()) {
            <div class="pill good" style="display:block;margin-bottom:14px;padding:9px 12px;border-radius:var(--r-sm)">{{ notice() }}</div>
          }

          <button class="btn primary" style="width:100%" [disabled]="busy()" (click)="submit()">
            {{ busy() ? 'One moment…' : (mode()==='in' ? 'Sign in' : 'Sign up') }}
          </button>
        </div>

        <p class="muted" style="text-align:center;font-size:13.5px;margin-top:16px">
          {{ mode()==='in' ? 'New here?' : 'Already have an account?' }}
          <a (click)="toggle()" style="color:var(--accent-text);cursor:pointer;font-weight:500">
            {{ mode()==='in' ? 'Create one' : 'Sign in' }}</a>
        </p>
      </div>
    </div>
  `,
})
export class Login {
  private auth = inject(AuthService);
  private router = inject(Router);

  email = ''; password = '';
  mode = signal<'in' | 'up'>('in');
  busy = signal(false);
  error = signal('');
  notice = signal('');

  toggle() { this.mode.set(this.mode() === 'in' ? 'up' : 'in'); this.error.set(''); this.notice.set(''); }

  async submit() {
    this.error.set(''); this.notice.set('');
    if (!this.email || !this.password) { this.error.set('Enter your email and password.'); return; }
    this.busy.set(true);
    try {
      if (this.mode() === 'in') {
        const { error } = await this.auth.signIn(this.email, this.password);
        if (error) { this.error.set(error.message); return; }
        this.router.navigateByUrl('/');
      } else {
        const { data, error } = await this.auth.signUp(this.email, this.password);
        if (error) { this.error.set(error.message); return; }
        if (data.session) this.router.navigateByUrl('/');
        else this.notice.set('Check your inbox to confirm, then sign in.');
      }
    } finally {
      this.busy.set(false);
    }
  }
}
