import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, shareReplay, tap } from 'rxjs';
import type { LoginRequest, LoginResponse, UserSummary } from '../../shared/models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private sessionRequest: Observable<UserSummary | null> | null = null;

  readonly user = signal<UserSummary | null>(null);
  readonly busy = signal(false);

  ensureSession(force = false): Observable<UserSummary | null> {
    if (!force && this.user()) {
      return of(this.user());
    }
    if (!this.sessionRequest || force) {
      this.sessionRequest = this.http.get<{ user: UserSummary }>('/api/auth/me').pipe(
        map((response) => response.user),
        tap((user) => this.user.set(user)),
        catchError((error: HttpErrorResponse) => {
          if (error.status !== 401) {
            console.error('Session check failed', error);
          }
          this.user.set(null);
          return of(null);
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    }
    return this.sessionRequest;
  }

  login(payload: LoginRequest): Observable<UserSummary> {
    this.busy.set(true);
    return this.http.post<LoginResponse>('/api/auth/login', payload).pipe(
      map((response) => response.user),
      tap((user) => {
        this.user.set(user);
        this.sessionRequest = of(user);
        this.busy.set(false);
      }),
      catchError((error: HttpErrorResponse) => {
        this.busy.set(false);
        throw error;
      }),
    );
  }

  logout(): Observable<void> {
    return this.http.post<{ ok: boolean }>('/api/auth/logout', {}).pipe(
      map(() => undefined),
      tap(() => {
        this.user.set(null);
        this.sessionRequest = null;
      }),
    );
  }

  clearLocalSession(): void {
    this.user.set(null);
    this.sessionRequest = null;
  }
}
