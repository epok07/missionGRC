import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { Priority, Task, TaskStatus, Workstream } from '../../../shared/models';
import { WorkspaceService } from '../../core/workspace.service';
import {
  PRIORITIES,
  TASK_STATUSES,
  WORKSTREAMS,
  dateKey,
  dueLabel,
  priorityTone,
  taskStatusLabel,
  taskStatusTone,
  workstreamMeta,
} from '../../core/ui';
import { EmptyStateComponent } from '../../shared/empty-state';
import { StatusBadgeComponent } from '../../shared/status-badge';

type TaskFilter = 'all' | 'today' | 'overdue' | 'high';

@Component({
  selector: 'mg-tasks',
  imports: [ReactiveFormsModule, StatusBadgeComponent, EmptyStateComponent],
  templateUrl: './tasks.html',
  styleUrl: './tasks.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TasksPage {
  private readonly workspace = inject(WorkspaceService);
  private readonly formBuilder = inject(FormBuilder);

  readonly tasks = input.required<Task[]>();
  protected readonly state = linkedSignal(() => this.tasks());

  protected readonly today = dateKey();
  protected readonly filter = signal<TaskFilter>('all');
  protected readonly filterOptions: TaskFilter[] = ['all', 'today', 'overdue', 'high'];
  protected readonly search = signal('');
  protected readonly addOpen = signal(false);
  protected readonly busy = signal<string | null>(null);
  protected readonly notice = signal('');
  protected readonly priorities = PRIORITIES;
  protected readonly workstreams = WORKSTREAMS;
  protected readonly taskStatuses = TASK_STATUSES;
  protected readonly dueLabel = dueLabel;
  protected readonly priorityTone = priorityTone;
  protected readonly taskStatusLabel = taskStatusLabel;
  protected readonly taskStatusTone = taskStatusTone;
  protected readonly workstreamMeta = workstreamMeta;

  protected readonly form = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(160)]],
    due: [this.today, [Validators.required]],
    priority: ['medium' as Priority, [Validators.required]],
    workstream: ['triage' as Workstream, [Validators.required]],
    notes: [''],
  });

  protected readonly filtered = computed(() => {
    const query = this.search().trim().toLowerCase();
    const now = this.today;
    return this.state().filter((task) => {
      if (query) {
        const haystack = `${task.ref} ${task.title} ${task.owner} ${task.notes}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      switch (this.filter()) {
        case 'today':
          return task.status !== 'done' && task.due === now;
        case 'overdue':
          return task.status !== 'done' && task.due < now;
        case 'high':
          return task.status !== 'done' && (task.priority === 'critical' || task.priority === 'high');
        default:
          return true;
      }
    });
  });

  protected readonly columns = computed(() =>
    this.taskStatuses.map((status) => ({
      status,
      label: this.taskStatusLabel(status),
      tone: this.taskStatusTone(status),
      tasks: this.filtered().filter((task) => task.status === status),
    })),
  );

  protected readonly stats = computed(() => {
    const tasks = this.state();
    return {
      open: tasks.filter((task) => task.status !== 'done').length,
      dueToday: tasks.filter((task) => task.status !== 'done' && task.due === this.today).length,
      overdue: tasks.filter((task) => task.status !== 'done' && task.due < this.today).length,
      done: tasks.filter((task) => task.status === 'done').length,
    };
  });

  protected toggleAdd(): void {
    this.addOpen.update((open) => !open);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.workspace.createTask(value).subscribe({
      next: (task) => {
        this.state.update((tasks) => [task, ...tasks]);
        this.form.reset({
          title: '',
          due: this.today,
          priority: 'medium',
          workstream: 'triage',
          notes: '',
        });
        this.addOpen.set(false);
        this.showNotice(`${task.ref} added to the board.`);
      },
      error: () => this.showNotice('The task could not be created.'),
    });
  }

  protected changeStatus(task: Task, status: string): void {
    if (this.busy()) return;
    this.busy.set(task.id);
    this.workspace.updateTask(task.id, { status: status as TaskStatus }).subscribe({
      next: (updated) => {
        this.state.update((tasks) => tasks.map((item) => (item.id === updated.id ? updated : item)));
        this.busy.set(null);
      },
      error: () => {
        this.busy.set(null);
        this.showNotice('The task could not be updated.');
      },
    });
  }

  protected remove(task: Task): void {
    if (!confirm(`Delete ${task.ref}: ${task.title}?`)) return;
    this.workspace.deleteTask(task.id).subscribe({
      next: () => {
        this.state.update((tasks) => tasks.filter((item) => item.id !== task.id));
        this.showNotice(`${task.ref} deleted.`);
      },
      error: () => this.showNotice('The task could not be deleted.'),
    });
  }

  protected filterLabel(value: TaskFilter): string {
    return { all: 'All', today: 'Today', overdue: 'Overdue', high: 'High priority' }[value];
  }

  private showNotice(message: string): void {
    this.notice.set(message);
    setTimeout(() => this.notice.set(''), 2400);
  }
}
