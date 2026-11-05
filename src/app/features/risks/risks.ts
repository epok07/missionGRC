import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { Priority, RiskItem, RiskStatus, RiskType } from '../../../shared/models';
import { WorkspaceService } from '../../core/workspace.service';
import {
  PRIORITIES,
  RISK_STATUSES,
  RISK_TYPES,
  dateKey,
  dueLabel,
  formatDate,
  priorityTone,
  riskStatusLabel,
  riskStatusTone,
  riskTypeIcon,
  riskTypeLabel,
} from '../../core/ui';
import { EmptyStateComponent } from '../../shared/empty-state';
import { StatusBadgeComponent } from '../../shared/status-badge';

type TypeFilter = 'all' | RiskType;

function dayFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return dateKey(date);
}

@Component({
  selector: 'mg-risks',
  imports: [ReactiveFormsModule, StatusBadgeComponent, EmptyStateComponent],
  templateUrl: './risks.html',
  styleUrl: './risks.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RisksPage {
  private readonly workspace = inject(WorkspaceService);
  private readonly formBuilder = inject(FormBuilder);

  readonly risks = input.required<RiskItem[]>();
  protected readonly state = linkedSignal(() => this.risks());

  protected readonly today = dateKey();
  protected readonly search = signal('');
  protected readonly typeFilter = signal<TypeFilter>('all');
  protected readonly statusFilter = signal<'all' | RiskStatus>('all');
  protected readonly addOpen = signal(false);
  protected readonly busy = signal<string | null>(null);
  protected readonly notice = signal('');

  protected readonly selectedId = linkedSignal(() => this.state()[0]?.id ?? null);
  protected readonly selected = computed(
    () => this.state().find((item) => item.id === this.selectedId()) ?? null,
  );

  protected readonly types = RISK_TYPES;
  protected readonly statuses = RISK_STATUSES;
  protected readonly priorities = PRIORITIES;
  protected readonly priorityTone = priorityTone;
  protected readonly riskStatusTone = riskStatusTone;
  protected readonly riskStatusLabel = riskStatusLabel;
  protected readonly riskTypeIcon = riskTypeIcon;
  protected readonly riskTypeLabel = riskTypeLabel;
  protected readonly dueLabel = dueLabel;
  protected readonly formatDate = formatDate;

  protected readonly form = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(180)]],
    type: ['risk' as RiskType, [Validators.required]],
    severity: ['high' as Priority, [Validators.required]],
    owner: ['', [Validators.required]],
    businessUnit: ['Enterprise'],
    due: [dayFromNow(7), [Validators.required]],
    framework: ['ISO 27001'],
    control: [''],
    exposure: [''],
    decisionNeeded: [false],
    notes: [''],
  });

  protected readonly filtered = computed(() => {
    const query = this.search().trim().toLowerCase();
    return this.state().filter((item) => {
      if (this.typeFilter() !== 'all' && item.type !== this.typeFilter()) return false;
      if (this.statusFilter() !== 'all' && item.status !== this.statusFilter()) return false;
      if (!query) return true;
      const haystack = `${item.ref} ${item.title} ${item.owner} ${item.businessUnit} ${item.framework} ${item.control}`.toLowerCase();
      return haystack.includes(query);
    });
  });

  protected readonly stats = computed(() => {
    const items = this.state();
    const open = items.filter((item) => item.status !== 'closed');
    return {
      open: open.length,
      critical: open.filter((item) => item.severity === 'critical').length,
      decisions: open.filter((item) => item.type === 'decision' || item.decisionNeeded).length,
      overdue: open.filter((item) => item.due < this.today && item.status !== 'monitoring').length,
    };
  });

  protected toggleAdd(): void {
    this.addOpen.update((open) => !open);
  }

  protected select(item: RiskItem): void {
    this.selectedId.set(item.id);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.workspace.createRisk(value).subscribe({
      next: (risk) => {
        this.state.update((items) => [risk, ...items]);
        this.selectedId.set(risk.id);
        this.typeFilter.set('all');
        this.statusFilter.set('all');
        this.search.set('');
        this.addOpen.set(false);
        this.form.reset({
          title: '',
          type: 'risk',
          severity: 'high',
          owner: '',
          businessUnit: 'Enterprise',
          due: dayFromNow(7),
          framework: 'ISO 27001',
          control: '',
          exposure: '',
          decisionNeeded: false,
          notes: '',
        });
        this.showNotice(`${risk.ref} added to the open items register.`);
      },
      error: () => this.showNotice('The open item could not be created.'),
    });
  }

  protected changeStatus(item: RiskItem, status: string): void {
    if (this.busy()) return;
    this.busy.set(item.id);
    this.workspace.updateRisk(item.id, { status: status as RiskStatus }).subscribe({
      next: (updated) => {
        this.state.update((items) => items.map((entry) => (entry.id === updated.id ? updated : entry)));
        this.busy.set(null);
        this.showNotice(`${updated.ref} is now ${riskStatusLabel(updated.status).toLowerCase()}.`);
      },
      error: () => {
        this.busy.set(null);
        this.showNotice('The open item could not be updated.');
      },
    });
  }

  protected typeTone(type: RiskType): string {
    return { risk: 'red', issue: 'orange', decision: 'indigo', action: 'azure' }[type];
  }

  private showNotice(message: string): void {
    this.notice.set(message);
    setTimeout(() => this.notice.set(''), 2600);
  }
}
