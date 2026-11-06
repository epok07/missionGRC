import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AppTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const routeTitle = this.buildTitle(snapshot);
    const pageTitle = routeTitle ? `${routeTitle} · MissionGRC` : 'MissionGRC · Trust is the work';
    this.title.setTitle(pageTitle);

    let node = snapshot.root;
    while (node.firstChild) node = node.firstChild;
    const data = node.data as { description?: string; robots?: string; ogType?: string };
    const description =
      data.description ??
      'MissionGRC is a daily operating workspace for governance, risk, and compliance professionals.';
    const robots = data.robots ?? 'noindex, nofollow';

    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ name: 'robots', content: robots });
    this.meta.updateTag({ property: 'og:title', content: pageTitle });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:type', content: data.ogType ?? 'website' });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary' });
    this.meta.updateTag({ name: 'theme-color', content: '#0c1f1a' });

    let canonical = this.document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = this.document.createElement('link');
      canonical.rel = 'canonical';
      this.document.head.appendChild(canonical);
    }
    const baseHref = this.document.querySelector('base')?.getAttribute('href') ?? '/';
    const basePath = baseHref.replace(/\/$/, '');
    canonical.href = `${this.document.location.origin}${basePath}${snapshot.url.split('?')[0]}`;
  }
}
