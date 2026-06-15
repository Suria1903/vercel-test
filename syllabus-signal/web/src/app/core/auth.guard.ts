import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Wait until the initial getSession() resolves.
  while (!auth.ready()) { await new Promise((r) => setTimeout(r, 30)); }

  if (auth.session()) return true;
  return router.parseUrl('/login');
};
