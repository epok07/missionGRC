import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { Tone } from '../core/ui';

@Component({
  selector: 'mg-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="mg-badge" [class]="'mg-badge mg-badge-' + tone()">
      <span class="mg-badge-dot" aria-hidden="true"></span>
      {{ label() }}
    </span>
  `,
  styles: [
    `
      .mg-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.2rem 0.55rem;
        border-radius: 999px;
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.01em;
        line-height: 1.35;
        white-space: nowrap;
        border: 1px solid transparent;
      }
      .mg-badge-dot {
        width: 0.38rem;
        height: 0.38rem;
        border-radius: 99px;
        background: currentColor;
        opacity: 0.85;
      }
      .mg-badge-red { color: #a33a2b; background: #fbe9e5; border-color: #f3cfc8; }
      .mg-badge-orange { color: #9a5a13; background: #fdf0de; border-color: #f5dcb8; }
      .mg-badge-yellow { color: #82650e; background: #fbf4d7; border-color: #efe1a8; }
      .mg-badge-green { color: #1f6a4a; background: #e6f4ec; border-color: #c7e7d5; }
      .mg-badge-teal { color: #10655e; background: #e2f2ef; border-color: #c2e5df; }
      .mg-badge-azure { color: #1d5b83; background: #e6f0f8; border-color: #c9e0ef; }
      .mg-badge-indigo { color: #464a9a; background: #ebeafa; border-color: #d5d3f1; }
      .mg-badge-purple { color: #6f3a87; background: #f2e8f7; border-color: #e4d1ee; }
      .mg-badge-secondary { color: #5c645f; background: #eef0ee; border-color: #dde2df; }
    `,
  ],
})
export class StatusBadgeComponent {
  readonly label = input.required<string>();
  readonly tone = input<Tone>('secondary');
}
