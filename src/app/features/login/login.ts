import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { DEMO_MODE } from '../../core/runtime';

type DemoAccount = {
  username: string;
  password: string;
  name: string;
  role: string;
  initials: string;
};

@Component({
  selector: 'mg-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly demoMode = DEMO_MODE;
  protected readonly showPassword = signal(false);
  protected readonly submitting = signal(false);
  protected readonly error = signal('');

  protected readonly accounts: DemoAccount[] = [
    {
      username: 'admin',
      password: 'Dare2Hack$',
      name: 'Alex Morgan',
      role: 'GRC Lead',
      initials: 'AM',
    },
    {
      username: 'ki',
      password: 'Dare2ImpressU',
      name: 'Ki',
      role: 'GRC Specialist',
      initials: 'KI',
    },
  ];

  protected readonly form = this.formBuilder.nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
  });

  constructor() {
    this.addStructuredData();
    this.destroyRef.onDestroy(() => {
      this.document.getElementById('mg-login-schema')?.remove();
    });
  }

  protected useAccount(account: DemoAccount): void {
    this.form.setValue({ username: account.username, password: account.password });
    this.error.set('');
  }

  protected submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.error.set('');
    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        const returnTo = new URLSearchParams(this.document.location.search).get('returnTo');
        const destination = returnTo?.startsWith('/') ? returnTo : '/';
        void this.router.navigateByUrl(destination);
      },
      error: (error: HttpErrorResponse) => {
        this.submitting.set(false);
        this.error.set(
          error.status === 429
            ? 'Too many attempts. Take a breath, then try again in a few minutes.'
            : (error.error?.error ?? 'Sign-in failed. Check the workspace connection and try again.'),
        );
      },
    });
  }

  private addStructuredData(): void {
    if (this.document.getElementById('mg-login-schema')) return;
    const script = this.document.createElement('script');
    script.id = 'mg-login-schema';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'MissionGRC',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      description:
        'A daily operation workspace for governance, risk, and compliance specialists. Plan the day, run decision rooms, manage third-party risk, and turn complex risk into board-ready narratives.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    });
    this.document.head.appendChild(script);
  }
}
