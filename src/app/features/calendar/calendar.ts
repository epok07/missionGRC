import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { Meeting, MeetingType } from '../../../shared/models';
import { WorkspaceService } from '../../core/workspace.service';
import { MEETING_TYPES, dateKey, formatDate, formatTime, meetingTypeMeta } from '../../core/ui';
import { EmptyStateComponent } from '../../shared/empty-state';
import { StatusBadgeComponent } from '../../shared/status-badge';

interface CalendarDay {
  date: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  count: number;
}

function parseKey(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

function monthStart(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

@Component({
  selector: 'mg-calendar',
  imports: [ReactiveFormsModule, StatusBadgeComponent, EmptyStateComponent],
  templateUrl: './calendar.html',
  styleUrl: './calendar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarPage {
  private readonly workspace = inject(WorkspaceService);
  private readonly formBuilder = inject(FormBuilder);

  readonly meetings = input.required<Meeting[]>();
  protected readonly state = linkedSignal(() => this.meetings());

  protected readonly today = dateKey();
  protected readonly view = signal(monthStart(new Date()));
  protected readonly selected = signal(this.today);
  protected readonly addOpen = signal(false);
  protected readonly busy = signal<string | null>(null);
  protected readonly notice = signal('');
  protected readonly meetingTypes = MEETING_TYPES;
  protected readonly weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  protected readonly meetingTypeMeta = meetingTypeMeta;
  protected readonly formatDate = formatDate;
  protected readonly formatTime = formatTime;

  protected readonly form = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(160)]],
    date: [this.selected(), [Validators.required]],
    start: ['09:00', [Validators.required]],
    end: ['09:30', [Validators.required]],
    type: ['decision' as MeetingType, [Validators.required]],
    location: ['Virtual'],
    attendees: [''],
    notes: [''],
  });

  protected readonly monthLabel = computed(() =>
    formatDate(dateKey(this.view()).slice(0, 8) + '01', { month: 'long', year: 'numeric' }),
  );

  protected readonly days = computed<CalendarDay[]>(() => {
    const base = this.view();
    const first = new Date(base.getFullYear(), base.getMonth(), 1);
    const start = new Date(first);
    start.setDate(1 - first.getDay());
    const counts = new Map<string, number>();
    for (const meeting of this.state()) {
      counts.set(meeting.date, (counts.get(meeting.date) ?? 0) + 1);
    }
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
      const key = dateKey(date);
      return {
        date: key,
        day: date.getDate(),
        inMonth: date.getMonth() === base.getMonth(),
        isToday: key === this.today,
        isSelected: key === this.selected(),
        count: counts.get(key) ?? 0,
      };
    });
  });

  protected readonly selectedMeetings = computed(() =>
    this.state()
      .filter((meeting) => meeting.date === this.selected())
      .sort((a, b) => a.start.localeCompare(b.start)),
  );

  protected readonly upcoming = computed(() =>
    this.state()
      .filter((meeting) => meeting.date > this.selected())
      .sort((a, b) => `${a.date}T${a.start}`.localeCompare(`${b.date}T${b.start}`))
      .slice(0, 4),
  );

  protected readonly stats = computed(() => {
    const month = this.view().getMonth();
    const year = this.view().getFullYear();
    const inMonth = this.state().filter((meeting) => {
      const date = parseKey(meeting.date);
      return date.getMonth() === month && date.getFullYear() === year;
    });
    return {
      month: inMonth.length,
      decisions: inMonth.filter((meeting) => meeting.type === 'decision').length,
      vendors: inMonth.filter((meeting) => meeting.type === 'vendor').length,
      audits: inMonth.filter((meeting) => meeting.type === 'audit').length,
    };
  });

  protected changeMonth(delta: number): void {
    this.view.update((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  }

  protected goToday(): void {
    this.view.set(monthStart(new Date()));
    this.selected.set(this.today);
  }

  protected select(date: string): void {
    this.selected.set(date);
    const parsed = parseKey(date);
    if (
      parsed.getMonth() !== this.view().getMonth() ||
      parsed.getFullYear() !== this.view().getFullYear()
    ) {
      this.view.set(monthStart(parsed));
    }
  }

  protected toggleAdd(): void {
    this.addOpen.update((open) => !open);
    if (this.addOpen()) {
      this.form.patchValue({ date: this.selected() });
    }
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.workspace
      .createMeeting({
        title: value.title,
        date: value.date,
        start: value.start,
        end: value.end,
        type: value.type,
        location: value.location,
        attendees: value.attendees
          .split(',')
          .map((person) => person.trim())
          .filter(Boolean),
        notes: value.notes,
      })
      .subscribe({
        next: (meeting) => {
          this.state.update((meetings) =>
            [...meetings, meeting].sort((a, b) =>
              `${a.date}T${a.start}`.localeCompare(`${b.date}T${b.start}`),
            ),
          );
          this.selected.set(meeting.date);
          this.view.set(monthStart(parseKey(meeting.date)));
          this.addOpen.set(false);
          this.form.reset({
            title: '',
            date: meeting.date,
            start: '09:00',
            end: '09:30',
            type: 'decision',
            location: 'Virtual',
            attendees: '',
            notes: '',
          });
          this.showNotice('Meeting added to the decision room.');
        },
        error: () => this.showNotice('The meeting could not be created.'),
      });
  }

  protected remove(meeting: Meeting): void {
    if (!confirm(`Delete “${meeting.title}”?`)) return;
    this.busy.set(meeting.id);
    this.workspace.deleteMeeting(meeting.id).subscribe({
      next: () => {
        this.state.update((meetings) => meetings.filter((item) => item.id !== meeting.id));
        this.busy.set(null);
        this.showNotice('Meeting removed from the calendar.');
      },
      error: () => {
        this.busy.set(null);
        this.showNotice('The meeting could not be deleted.');
      },
    });
  }

  protected dots(count: number): number[] {
    return Array.from({ length: Math.min(count, 3) }, (_, index) => index);
  }

  private showNotice(message: string): void {
    this.notice.set(message);
    setTimeout(() => this.notice.set(''), 2600);
  }
}
