import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from './core/auth.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="shell">
      <nav class="rail">
        <div class="brand">
          <div class="mark"><i class="ti ti-radar-2"></i></div>
          <div>
            <div class="name">Syllabus &amp; Signal</div>
            <div class="sub">current affairs, mapped</div>
          </div>
        </div>

        <a class="nav-item" routerLink="/" routerLinkActive="active"
           [routerLinkActiveOptions]="{exact:true}"><i class="ti ti-home"></i><span>Home</span></a>
        <a class="nav-item" routerLink="/feed" routerLinkActive="active"><i class="ti ti-layout-cards"></i><span>Daily feed</span></a>
        <a class="nav-item" routerLink="/syllabus" routerLinkActive="active"><i class="ti ti-list-details"></i><span>Syllabus</span></a>
        <a class="nav-item" routerLink="/retention" routerLinkActive="active"><i class="ti ti-chart-bar"></i><span>Retention</span></a>
        <a class="nav-item" routerLink="/topics" routerLinkActive="active"><i class="ti ti-cards"></i><span>Topic map</span></a>

        <div class="rail-foot">
          <div class="rail-user">
            <div class="avatar">{{ initial }}</div>
            <div class="who">{{ email }}</div>
            <button class="signout" (click)="signOut()" aria-label="Sign out"><i class="ti ti-logout"></i></button>
          </div>
        </div>
      </nav>

      <main class="content"><router-outlet></router-outlet></main>
    </div>
  `,
})
export class Shell {
  private auth = inject(AuthService);
  private router = inject(Router);

  get email() { return this.auth.user?.email ?? ''; }
  get initial() { return (this.email[0] ?? '?').toUpperCase(); }

  async signOut() {
    await this.auth.signOut();
    this.router.navigateByUrl('/login');
  }
}
