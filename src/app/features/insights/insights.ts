import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, signal } from '@angular/core';
import type { Insight, InsightKind } from '../../../shared/models';
import { insightAudienceLabel } from '../../core/ui';
import { EmptyStateComponent } from '../../shared/empty-state';
import { InsightCardComponent } from '../../shared/insight-card';

type AudienceFilter = 'all' | 'risk-owner' | 'leadership' | 'self';

@Component({
  selector: 'mg-insights',
  imports: [InsightCardComponent, EmptyStateComponent],
  templateUrl: './insights.html',
  styleUrl: './insights.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InsightsPage {
  readonly insights = input.required<Insight[]>();
  protected readonly state = linkedSignal(() => this.insights());

  protected readonly kindFilter = signal<'all' | InsightKind>('all');
  protected readonly audienceFilter = signal<AudienceFilter>('all');
  protected readonly search = signal('');
  protected readonly selectedId = linkedSignal(() => this.state()[0]?.id ?? null);
  protected readonly copiedId = signal<string | null>(null);

  protected readonly insightAudienceLabel = insightAudienceLabel;

  protected readonly filtered = computed(() => {
    const query = this.search().trim().toLowerCase();
    return this.state().filter((insight) => {
      if (this.kindFilter() !== 'all' && insight.kind !== this.kindFilter()) return false;
      if (this.audienceFilter() !== 'all' && insight.audience !== this.audienceFilter()) return false;
      if (!query) return true;
      const haystack = `${insight.text} ${insight.category} ${insight.source ?? ''} ${insight.attribution ?? ''}`.toLowerCase();
      return haystack.includes(query);
    });
  });

  protected readonly featured = computed(
    () =>
      this.filtered().find((insight) => insight.id === this.selectedId()) ??
      this.filtered()[0] ??
      null,
  );

  protected readonly stats = computed(() => ({
    total: this.state().length,
    questions: this.state().filter((insight) => insight.kind === 'question').length,
    quotes: this.state().filter((insight) => insight.kind === 'quote').length,
    forLeaders: this.state().filter((insight) => insight.audience === 'leadership').length,
  }));

  protected rotate(): void {
    const pool = this.filtered();
    if (pool.length < 2) return;
    const current = this.featured();
    const index = current ? pool.findIndex((insight) => insight.id === current.id) : -1;
    const next = pool[(index + 1 + pool.length) % pool.length];
    this.selectedId.set(next.id);
  }

  protected select(insight: Insight): void {
    this.selectedId.set(insight.id);
  }

  protected kindLabel(kind: InsightKind): string {
    return kind === 'quote' ? 'Quote' : 'Question';
  }

  protected audienceOrCategory(insight: Insight): string {
    return insight.kind === 'question'
      ? insightAudienceLabel(insight.audience)
      : insight.category;
  }

  protected async copy(insight: Insight): Promise<void> {
    try {
      await navigator.clipboard?.writeText(insight.text);
      this.copiedId.set(insight.id);
      setTimeout(() => this.copiedId.set(null), 1600);
    } catch {
      this.copiedId.set(null);
    }
  }
}
