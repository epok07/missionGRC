import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { DashboardData, Insight, Objective, Task } from '../../../shared/models';
import { WorkspaceService } from '../../core/workspace.service';
import {
  dateKey,
  dueLabel,
  formatDate,
  formatTime,
  greeting,
  meetingTypeMeta,
  objectiveCategoryMeta,
  priorityTone,
  riskStatusTone,
  riskTypeIcon,
  riskTypeLabel,
  taskStatusLabel,
  vendorStatusLabel,
  vendorStatusTone,
  boardStatusTone,
} from '../../core/ui';
import { EmptyStateComponent } from '../../shared/empty-state';
import { InsightCardComponent } from '../../shared/insight-card';
import { MetricCardComponent } from '../../shared/metric-card';
import { ProgressRingComponent } from '../../shared/progress-ring';
import { StatusBadgeComponent } from '../../shared/status-badge';

@Component({
  selector: 'mg-dashboard',
  imports: [
    RouterLink,
    StatusBadgeComponent,
    ProgressRingComponent,
    MetricCardComponent,
    InsightCardComponent,
    EmptyStateComponent,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  private readonly workspace = inject(WorkspaceService);

  readonly dashboard = input.required<DashboardData>();
  protected readonly state = linkedSignal(() => this.dashboard());

  protected readonly today = dateKey();
  protected readonly greetingText = greeting();
  protected readonly firstName = computed(() => this.state().user.name.split(' ')[0]);
  protected readonly plan = computed(() => this.state().plan);
  protected readonly meetingsToday = computed(() =>
    this.state().meetings.filter((meeting) => meeting.date === this.today),
  );
  protected readonly meetingsNext = computed(() =>
    this.state().meetings.filter((meeting) => meeting.date > this.today).slice(0, 3),
  );
  protected readonly weekPeak = computed(() =>
    Math.max(
      1,
      ...this.state().week.map((point) => point.tasksDone + point.objectivesDone),
    ),
  );
  protected readonly weekTasks = computed(() =>
    this.state().week.reduce((total, point) => total + point.tasksDone, 0),
  );
  protected readonly weekObjectives = computed(() =>
    this.state().week.reduce((total, point) => total + point.objectivesDone, 0),
  );

  protected readonly editingIntent = signal(false);
  protected readonly intentDraft = signal('');
  protected readonly savingIntent = signal(false);
  protected readonly busyObjective = signal<string | null>(null);
  protected readonly busyTask = signal<string | null>(null);
  protected readonly loadingInsight = signal(false);
  protected readonly notice = signal('');

  protected readonly dueLabel = dueLabel;
  protected readonly formatDate = formatDate;
  protected readonly formatTime = formatTime;
  protected readonly priorityTone = priorityTone;
  protected readonly riskStatusTone = riskStatusTone;
  protected readonly riskTypeIcon = riskTypeIcon;
  protected readonly riskTypeLabel = riskTypeLabel;
  protected readonly taskStatusLabel = taskStatusLabel;
  protected readonly vendorStatusLabel = vendorStatusLabel;
  protected readonly vendorStatusTone = vendorStatusTone;
  protected readonly boardStatusTone = boardStatusTone;
  protected readonly meetingTypeMeta = meetingTypeMeta;
  protected readonly objectiveCategoryMeta = objectiveCategoryMeta;

  protected toggleObjective(objective: Objective): void {
    if (this.busyObjective()) return;
    this.busyObjective.set(objective.id);
    const date = this.plan().date;
    this.workspace.updateObjective(date, objective.id, { done: !objective.done }).subscribe({
      next: (plan) => {
        this.state.update((current) => ({
          ...current,
          plan,
          pulse: {
            ...current.pulse,
            objectivesDone: plan.objectives.filter((item) => item.done).length,
            objectivesTotal: plan.objectives.length,
          },
        }));
        this.busyObjective.set(null);
      },
      error: () => {
        this.busyObjective.set(null);
        this.showNotice('The objective could not be saved.');
      },
    });
  }

  protected beginIntent(): void {
    this.intentDraft.set(this.plan().intent);
    this.editingIntent.set(true);
  }

  protected saveIntent(): void {
    const intent = this.intentDraft().trim();
    if (!intent || this.savingIntent()) return;
    this.savingIntent.set(true);
    this.workspace.setIntent(this.plan().date, intent).subscribe({
      next: (plan) => {
        this.state.update((current) => ({ ...current, plan }));
        this.savingIntent.set(false);
        this.editingIntent.set(false);
        this.showNotice('Today’s intent is documented.');
      },
      error: () => {
        this.savingIntent.set(false);
        this.showNotice('The intent could not be saved.');
      },
    });
  }

  protected markTaskDone(task: Task): void {
    if (this.busyTask()) return;
    this.busyTask.set(task.id);
    this.workspace.updateTask(task.id, { status: 'done' }).subscribe({
      next: (updated) => {
        this.state.update((current) => ({
          ...current,
          focusTasks: current.focusTasks.filter((item) => item.id !== updated.id),
          pulse: {
            ...current.pulse,
            openTasks: Math.max(0, current.pulse.openTasks - 1),
            doneToday: current.pulse.doneToday + 1,
          },
          week: current.week.map((point) =>
            point.date === this.today ? { ...point, tasksDone: point.tasksDone + 1 } : point,
          ),
        }));
        this.busyTask.set(null);
        this.showNotice(`${updated.ref} closed with evidence.`);
      },
      error: () => {
        this.busyTask.set(null);
        this.showNotice('The task could not be updated.');
      },
    });
  }

  protected rotateInsight(): void {
    if (this.loadingInsight()) return;
    this.loadingInsight.set(true);
    this.workspace.insights().subscribe({
      next: (insights) => {
        const current = this.state().insight;
        const pool = insights.filter((insight) => insight.id !== current.id);
        const next = pool[Math.floor(Math.random() * pool.length)] as Insight | undefined;
        if (next) {
          this.state.update((value) => ({ ...value, insight: next }));
        }
        this.loadingInsight.set(false);
      },
      error: () => {
        this.loadingInsight.set(false);
        this.showNotice('The trust library could not be reached.');
      },
    });
  }

  protected barHeight(tasksDone: number, objectivesDone: number): number {
    return Math.max(5, Math.round(((tasksDone + objectivesDone) / this.weekPeak()) * 100));
  }

  protected showNotice(message: string): void {
    this.notice.set(message);
    setTimeout(() => this.notice.set(''), 2600);
  }
}
