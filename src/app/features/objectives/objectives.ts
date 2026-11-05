import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { DailyPlan, Objective, ObjectiveCategory } from '../../../shared/models';
import { WorkspaceService } from '../../core/workspace.service';
import {
  OBJECTIVE_CATEGORIES,
  dateKey,
  formatDate,
  objectiveCategoryMeta,
} from '../../core/ui';
import { EmptyStateComponent } from '../../shared/empty-state';
import { ProgressRingComponent } from '../../shared/progress-ring';
import { StatusBadgeComponent } from '../../shared/status-badge';

interface HistoryPoint {
  date: string;
  done: number;
  total: number;
}

function parseKey(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

@Component({
  selector: 'mg-objectives',
  imports: [ReactiveFormsModule, StatusBadgeComponent, ProgressRingComponent, EmptyStateComponent],
  templateUrl: './objectives.html',
  styleUrl: './objectives.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ObjectivesPage {
  private readonly workspace = inject(WorkspaceService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly location = inject(Location);

  readonly plan = input.required<DailyPlan>();
  protected readonly state = linkedSignal(() => this.plan());

  protected readonly today = dateKey();
  protected readonly categories = OBJECTIVE_CATEGORIES;
  protected readonly formatDate = formatDate;
  protected readonly objectiveCategoryMeta = objectiveCategoryMeta;

  protected readonly history = signal<HistoryPoint[]>([]);
  protected readonly loading = signal(false);
  protected readonly busyObjective = signal<string | null>(null);
  protected readonly notice = signal('');

  protected readonly editingIntent = signal(false);
  protected readonly intentDraft = signal('');
  protected readonly savingIntent = signal(false);

  protected readonly editingId = signal<string | null>(null);
  protected readonly editDraft = signal('');
  protected readonly savingEdit = signal(false);

  protected readonly form = this.formBuilder.nonNullable.group({
    text: ['', [Validators.required, Validators.maxLength(220)]],
    category: ['execution' as ObjectiveCategory, [Validators.required]],
  });

  protected readonly completion = computed(() => this.state().completion);
  protected readonly done = computed(() => this.state().objectives.filter((objective) => objective.done).length);
  protected readonly total = computed(() => this.state().objectives.length);
  protected readonly isToday = computed(() => this.state().date === this.today);

  protected readonly historyPeak = computed(() =>
    Math.max(1, ...this.history().map((point) => point.total)),
  );

  protected readonly streak = computed(() => {
    const points = this.history();
    let index = points.length - 1;
    if (index < 0) return 0;
    if (points[index].done === 0) index -= 1;
    let count = 0;
    while (index >= 0 && points[index].done > 0) {
      count += 1;
      index -= 1;
    }
    return count;
  });

  protected readonly weekRate = computed(() => {
    const points = this.history().slice(-7);
    const total = points.reduce((sum, point) => sum + point.total, 0);
    const done = points.reduce((sum, point) => sum + point.done, 0);
    return total ? Math.round((done / total) * 100) : 0;
  });

  constructor() {
    this.loadHistory();
  }

  protected loadDate(date: string): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.workspace.plan(date).subscribe({
      next: (plan) => {
        this.state.set(plan);
        this.loading.set(false);
        this.editingIntent.set(false);
        this.editingId.set(null);
        this.location.replaceState(`/objectives?date=${plan.date}`);
        this.loadHistory();
      },
      error: () => {
        this.loading.set(false);
        this.showNotice('That day could not be loaded.');
      },
    });
  }

  protected shiftDay(delta: number): void {
    const current = parseKey(this.state().date);
    this.loadDate(dateKey(new Date(current.getFullYear(), current.getMonth(), current.getDate() + delta)));
  }

  protected goToday(): void {
    this.loadDate(this.today);
  }

  protected onDateChange(value: string): void {
    if (!value) return;
    this.loadDate(value);
  }

  protected beginIntent(): void {
    this.intentDraft.set(this.state().intent);
    this.editingIntent.set(true);
  }

  protected saveIntent(): void {
    if (this.savingIntent()) return;
    this.savingIntent.set(true);
    this.workspace.setIntent(this.state().date, this.intentDraft()).subscribe({
      next: (plan) => {
        this.state.set(plan);
        this.savingIntent.set(false);
        this.editingIntent.set(false);
        this.showNotice('The intent is documented.');
      },
      error: () => {
        this.savingIntent.set(false);
        this.showNotice('The intent could not be saved.');
      },
    });
  }

  protected toggle(objective: Objective): void {
    if (this.busyObjective()) return;
    this.busyObjective.set(objective.id);
    this.workspace.updateObjective(this.state().date, objective.id, { done: !objective.done }).subscribe({
      next: (plan) => {
        this.state.set(plan);
        this.busyObjective.set(null);
        this.loadHistory();
        if (plan.objectives.every((item) => item.done) && plan.objectives.length) {
          this.showNotice('Every objective closed. That is a day with evidence.');
        }
      },
      error: () => {
        this.busyObjective.set(null);
        this.showNotice('The objective could not be saved.');
      },
    });
  }

  protected add(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.workspace.addObjective(this.state().date, value).subscribe({
      next: (plan) => {
        this.state.set(plan);
        this.form.reset({ text: '', category: 'execution' });
        this.loadHistory();
        this.showNotice('Objective added to the day.');
      },
      error: () => this.showNotice('The objective could not be added.'),
    });
  }

  protected beginEdit(objective: Objective): void {
    this.editingId.set(objective.id);
    this.editDraft.set(objective.text);
  }

  protected cancelEdit(): void {
    this.editingId.set(null);
    this.editDraft.set('');
  }

  protected saveEdit(objective: Objective): void {
    const text = this.editDraft().trim();
    if (!text || this.savingEdit()) return;
    this.savingEdit.set(true);
    this.workspace.updateObjective(this.state().date, objective.id, { text }).subscribe({
      next: (plan) => {
        this.state.set(plan);
        this.savingEdit.set(false);
        this.editingId.set(null);
        this.loadHistory();
      },
      error: () => {
        this.savingEdit.set(false);
        this.showNotice('The objective could not be updated.');
      },
    });
  }

  protected remove(objective: Objective): void {
    if (!confirm(`Remove “${objective.text}”?`)) return;
    this.workspace.deleteObjective(this.state().date, objective.id).subscribe({
      next: (plan) => {
        this.state.set(plan);
        this.loadHistory();
        this.showNotice('Objective removed.');
      },
      error: () => this.showNotice('The objective could not be removed.'),
    });
  }

  protected barHeight(point: HistoryPoint): number {
    if (!point.total) return 0;
    return Math.max(4, Math.round((point.done / this.historyPeak()) * 100));
  }

  protected dayLabel(date: string): string {
    return formatDate(date, { weekday: 'short' });
  }

  private loadHistory(): void {
    this.workspace.objectiveHistory(14).subscribe({
      next: (points) => this.history.set(points),
      error: () => this.history.set([]),
    });
  }

  private showNotice(message: string): void {
    this.notice.set(message);
    setTimeout(() => this.notice.set(''), 2600);
  }
}
