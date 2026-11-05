import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { Tone } from '../core/ui';

@Component({
  selector: 'mg-metric',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="mg-metric" [class]="'mg-metric mg-tone-' + tone()">
      <div class="mg-metric-top">
        <span class="mg-metric-label">{{ label() }}</span>
        <span class="mg-metric-icon" aria-hidden="true"><i class="ti" [class]="'ti ' + icon()"></i></span>
      </div>
      <div class="mg-metric-value">{{ value() }}</div>
      <div class="mg-metric-foot">
        <span>{{ hint() }}</span>
        @if (detail()) {
          <span class="mg-metric-detail">{{ detail() }}</span>
        }
      </div>
    </article>
  `,
  styles: [
    `
      .mg-metric {
        position: relative;
        height: 100%;
        padding: 0.95rem 1rem 0.9rem;
        border-radius: 14px;
        border: 1px solid #e6e4dc;
        background: #fffefb;
        overflow: hidden;
      }
      .mg-metric::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        bottom: 0;
        width: 3px;
        background: var(--metric-accent, #8d9a94);
      }
      .mg-metric-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
      }
      .mg-metric-label {
        font-size: 0.69rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.09em;
        color: #75807a;
      }
      .mg-metric-icon {
        display: inline-grid;
        place-items: center;
        width: 1.85rem;
        height: 1.85rem;
        border-radius: 9px;
        background: var(--metric-soft, #f1f3f1);
        color: var(--metric-accent, #58635d);
        font-size: 1rem;
      }
      .mg-metric-value {
        margin-top: 0.45rem;
        font-family: 'Fraunces Variable', Georgia, serif;
        font-size: 1.85rem;
        font-weight: 600;
        line-height: 1;
        color: #142f27;
        font-variant-numeric: tabular-nums;
      }
      .mg-metric-foot {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.3rem 0.55rem;
        margin-top: 0.48rem;
        font-size: 0.72rem;
        color: #7d857f;
      }
      .mg-metric-detail {
        font-weight: 700;
        color: var(--metric-accent, #58635d);
      }
      .mg-tone-red { --metric-accent: #b74d3a; --metric-soft: #fbece7; }
      .mg-tone-orange { --metric-accent: #b2701f; --metric-soft: #fdf2e2; }
      .mg-tone-yellow { --metric-accent: #8e7216; --metric-soft: #fbf5da; }
      .mg-tone-green { --metric-accent: #247454; --metric-soft: #e7f4ed; }
      .mg-tone-teal { --metric-accent: #15756c; --metric-soft: #e3f3ef; }
      .mg-tone-azure { --metric-accent: #236b94; --metric-soft: #e8f2f9; }
      .mg-tone-indigo { --metric-accent: #5055a8; --metric-soft: #ecebfa; }
      .mg-tone-purple { --metric-accent: #7a4391; --metric-soft: #f4ebf8; }
      .mg-tone-secondary { --metric-accent: #66736c; --metric-soft: #f0f2f0; }
    `,
  ],
})
export class MetricCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly hint = input('');
  readonly detail = input('');
  readonly icon = input('ti-activity');
  readonly tone = input<Tone>('teal');
}
