import { Injectable, signal } from '@angular/core';
import { Session, User } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly session = signal<Session | null>(null);
  readonly ready = signal(false);

  constructor(private sb: SupabaseService) {
    this.sb.client.auth.getSession().then(({ data }) => {
      this.session.set(data.session);
      this.ready.set(true);
    });
    this.sb.client.auth.onAuthStateChange((_e, s) => this.session.set(s));
  }

  get user(): User | null { return this.session()?.user ?? null; }
  get userId(): string | undefined { return this.user?.id; }

  signIn(email: string, password: string) {
    return this.sb.client.auth.signInWithPassword({ email, password });
  }
  signUp(email: string, password: string) {
    return this.sb.client.auth.signUp({ email, password });
  }
  signOut() { return this.sb.client.auth.signOut(); }
}
