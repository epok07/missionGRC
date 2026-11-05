import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { BoardBrief, BoardStatus } from '../../../shared/models';
import { WorkspaceService } from '../../core/workspace.service';
import { boardStatusTone, dateKey, formatDate } from '../../core/ui';
import { EmptyStateComponent } from '../../shared/empty-state';
import { StatusBadgeComponent } from '../../shared/status-badge';

const BOARD_STATUSES: BoardStatus[] = ['drafting', 'in-review', 'final'];

@Component({
  selector: 'mg-board',
  imports: [ReactiveFormsModule, StatusBadgeComponent, EmptyStateComponent],
  templateUrl: './board.html',
  styleUrl: './board.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardPage {
  private readonly workspace = inject(WorkspaceService);
  private readonly formBuilder = inject(FormBuilder);

  readonly briefs = input.required<BoardBrief[]>();
  protected readonly state = linkedSignal(() => this.briefs());

  protected readonly today = dateKey();
  protected readonly editing = signal(false);
  protected readonly saving = signal(false);
  protected readonly notice = signal('');
  protected readonly statuses = BOARD_STATUSES;
  protected readonly boardStatusTone = boardStatusTone;
  protected readonly formatDate = formatDate;

  protected readonly selectedId = linkedSignal(() => this.state()[0]?.id ?? null);
  protected readonly selected = computed(
    () => this.state().find((brief) => brief.id === this.selectedId()) ?? null,
  );

  protected readonly stats = computed(() => {
    const briefs = this.state();
    return {
      total: briefs.length,
      decisions: briefs.reduce((total, brief) => total + brief.decisions.length, 0),
      final: briefs.filter((brief) => brief.status === 'final').length,
      next: briefs.filter((brief) => brief.date >= this.today).sort((a, b) => a.date.localeCompare(b.date))[0] ?? null,
    };
  });

  protected readonly form = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(180)]],
    date: ['', [Validators.required]],
    audience: ['', [Validators.required]],
    status: ['drafting' as BoardStatus, [Validators.required]],
    decisions: [''],
    body: [''],
  });

  protected select(brief: BoardBrief): void {
    this.selectedId.set(brief.id);
    this.editing.set(false);
  }

  protected beginEdit(): void {
    const brief = this.selected();
    if (!brief) return;
    this.form.reset({
      title: brief.title,
      date: brief.date,
      audience: brief.audience,
      status: brief.status,
      decisions: brief.decisions.join('\n'),
      body: brief.body,
    });
    this.editing.set(true);
  }

  protected cancelEdit(): void {
    this.editing.set(false);
  }

  protected save(): void {
    const brief = this.selected();
    if (!brief || this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.saving.set(true);
    this.workspace
      .updateBoardBrief(brief.id, {
        title: value.title,
        date: value.date,
        audience: value.audience,
        status: value.status,
        decisions: value.decisions
          .split('\n')
          .map((decision) => decision.trim())
          .filter(Boolean),
        body: value.body,
      })
      .subscribe({
        next: (updated) => {
          this.state.update((briefs) => briefs.map((entry) => (entry.id === updated.id ? updated : entry)));
          this.saving.set(false);
          this.editing.set(false);
          this.showNotice('The board brief is saved to Markdown.');
        },
        error: () => {
          this.saving.set(false);
          this.showNotice('The brief could not be saved.');
        },
      });
  }

  protected decisionCount(brief: BoardBrief): string {
    return `${brief.decisions.length} ${brief.decisions.length === 1 ? 'decision' : 'decisions'}`;
  }

  private showNotice(message: string): void {
    this.notice.set(message);
    setTimeout(() => this.notice.set(''), 2600);
  }
}
