import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';

interface NavigationItem {
  path: string;
  label: string;
  icon: string;
  exact?: boolean;
}

interface NavigationGroup {
  label: string;
  items: NavigationItem[];
}

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class ShellComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly user = this.auth.user;
  protected readonly menuOpen = signal(false);
  protected readonly todayLabel = computed(() =>
    new Intl.DateTimeFormat('en', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(new Date()),
  );

  protected readonly groups: NavigationGroup[] = [
    {
      label: 'Command',
      items: [{ path: '/', label: 'Today', icon: 'ti-layout-dashboard', exact: true }],
    },
    {
      label: 'Set the pace',
      items: [
        { path: '/objectives', label: 'Daily objectives', icon: 'ti-target-arrow' },
        { path: '/calendar', label: 'Decision room', icon: 'ti-calendar-event' },
        { path: '/tasks', label: 'Tasks', icon: 'ti-checklist' },
      ],
    },
    {
      label: 'Assure',
      items: [
        { path: '/risks', label: 'Open items', icon: 'ti-alert-triangle' },
        { path: '/tprm', label: 'Third-party risk', icon: 'ti-building-bank' },
      ],
    },
    {
      label: 'Influence',
      items: [
        { path: '/board', label: 'Board room', icon: 'ti-presentation' },
        { path: '/insights', label: 'Trust library', icon: 'ti-quote' },
      ],
    },
  ];

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  protected logout(): void {
    this.auth.logout().subscribe({
      next: () => void this.router.navigate(['/login']),
      error: () => {
        this.auth.clearLocalSession();
        void this.router.navigate(['/login']);
      },
    });
  }
}
