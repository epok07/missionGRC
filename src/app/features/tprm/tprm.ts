import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import type { Priority, Vendor, VendorStatus } from '../../../shared/models';
import { WorkspaceService } from '../../core/workspace.service';
import {
  dateKey,
  dueLabel,
  formatDate,
  priorityTone,
  vendorStatusLabel,
  vendorStatusTone,
} from '../../core/ui';
import { EmptyStateComponent } from '../../shared/empty-state';
import { StatusBadgeComponent } from '../../shared/status-badge';

type TierFilter = 'all' | 1 | 2 | 3;

function dayFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return dateKey(date);
}

const VENDOR_STATUSES: VendorStatus[] = [
  'not-started',
  'in-review',
  'awaiting-vendor',
  'complete',
  'escalated',
];

@Component({
  selector: 'mg-tprm',
  imports: [StatusBadgeComponent, EmptyStateComponent],
  templateUrl: './tprm.html',
  styleUrl: './tprm.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TprmPage {
  private readonly workspace = inject(WorkspaceService);

  readonly vendors = input.required<Vendor[]>();
  protected readonly state = linkedSignal(() => this.vendors());

  protected readonly today = dateKey();
  protected readonly search = signal('');
  protected readonly tierFilter = signal<TierFilter>('all');
  protected readonly statusFilter = signal<'all' | VendorStatus>('all');
  protected readonly busy = signal<string | null>(null);
  protected readonly notice = signal('');

  protected readonly selectedId = linkedSignal(() => this.state()[0]?.id ?? null);
  protected readonly selected = computed(
    () => this.state().find((vendor) => vendor.id === this.selectedId()) ?? null,
  );

  protected readonly statuses = VENDOR_STATUSES;
  protected readonly tiers: TierFilter[] = ['all', 1, 2, 3];
  protected readonly priorityTone = priorityTone;
  protected readonly vendorStatusLabel = vendorStatusLabel;
  protected readonly vendorStatusTone = vendorStatusTone;
  protected readonly dueLabel = dueLabel;
  protected readonly formatDate = formatDate;

  protected readonly filtered = computed(() => {
    const query = this.search().trim().toLowerCase();
    return this.state().filter((vendor) => {
      if (this.tierFilter() !== 'all' && vendor.tier !== this.tierFilter()) return false;
      if (this.statusFilter() !== 'all' && vendor.status !== this.statusFilter()) return false;
      if (!query) return true;
      const haystack = `${vendor.ref} ${vendor.vendor} ${vendor.service} ${vendor.owner} ${vendor.framework}`.toLowerCase();
      return haystack.includes(query);
    });
  });

  protected readonly stats = computed(() => {
    const vendors = this.state();
    const horizon = dayFromNow(14);
    return {
      total: vendors.length,
      tierOne: vendors.filter((vendor) => vendor.tier === 1).length,
      escalated: vendors.filter((vendor) => vendor.status === 'escalated').length,
      dueSoon: vendors.filter(
        (vendor) => vendor.status !== 'complete' && vendor.reviewDue <= horizon,
      ).length,
      restricted: vendors.filter((vendor) => vendor.dataClass === 'Restricted').length,
    };
  });

  protected readonly priorities = computed(() =>
    this.state()
      .filter((vendor) => vendor.status !== 'complete' && (vendor.status === 'escalated' || vendor.reviewDue <= dayFromNow(10)))
      .sort((a, b) => a.reviewDue.localeCompare(b.reviewDue))
      .slice(0, 4),
  );

  protected select(vendor: Vendor): void {
    this.selectedId.set(vendor.id);
  }

  protected changeStatus(vendor: Vendor, status: string): void {
    if (this.busy()) return;
    this.busy.set(vendor.id);
    this.workspace.updateVendor(vendor.id, { status: status as VendorStatus }).subscribe({
      next: (updated) => {
        this.state.update((vendors) => vendors.map((entry) => (entry.id === updated.id ? updated : entry)));
        this.busy.set(null);
        this.showNotice(`${updated.vendor} moved to ${vendorStatusLabel(updated.status).toLowerCase()}.`);
      },
      error: () => {
        this.busy.set(null);
        this.showNotice('The vendor could not be updated.');
      },
    });
  }

  protected changeProgress(vendor: Vendor, value: string): void {
    const progress = Number(value);
    if (!Number.isFinite(progress)) return;
    this.busy.set(vendor.id);
    this.workspace.updateVendor(vendor.id, { progress }).subscribe({
      next: (updated) => {
        this.state.update((vendors) => vendors.map((entry) => (entry.id === updated.id ? updated : entry)));
        this.busy.set(null);
      },
      error: () => {
        this.busy.set(null);
        this.showNotice('The review progress could not be saved.');
      },
    });
  }

  protected toneFor(rating: Priority): 'is-hot' | 'is-warm' | 'is-cool' {
    if (rating === 'critical') return 'is-hot';
    if (rating === 'high') return 'is-warm';
    return 'is-cool';
  }

  private showNotice(message: string): void {
    this.notice.set(message);
    setTimeout(() => this.notice.set(''), 2600);
  }
}
