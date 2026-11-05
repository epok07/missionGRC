import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'mg-progress-ring',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="mg-ring"
      [style.width.px]="size()"
      [style.height.px]="size()"
      [attr.aria-label]="label() + ': ' + value() + '%'"
      role="img"
    >
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle class="mg-ring-track" cx="50" cy="50" r="42" />
        <circle
          class="mg-ring-value"
          cx="50"
          cy="50"
          r="42"
          [attr.stroke-dasharray]="circumference"
          [attr.stroke-dashoffset]="dashOffset()"
          [style.stroke]="color()"
        />
      </svg>
      <span class="mg-ring-label" [style.color]="labelColor()">
        <strong>{{ value() }}</strong>
        <small>%</small>
      </span>
    </div>
  `,
  styles: [
    `
      .mg-ring {
        position: relative;
        display: inline-grid;
        place-items: center;
        flex: 0 0 auto;
      }
      svg {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        transform: rotate(-90deg);
      }
      circle {
        fill: none;
        stroke-width: 7;
      }
      .mg-ring-track {
        stroke: rgba(18, 51, 43, 0.1);
      }
      .mg-ring-value {
        stroke-linecap: round;
        transition: stroke-dashoffset 500ms ease;
      }
      .mg-ring-label {
        display: flex;
        align-items: baseline;
        gap: 1px;
        color: #173b31;
        font-variant-numeric: tabular-nums;
      }
      .mg-ring-label strong {
        font-size: 1.15rem;
        line-height: 1;
      }
      .mg-ring-label small {
        font-size: 0.62rem;
        font-weight: 700;
        opacity: 0.6;
      }
    `,
  ],
})
export class ProgressRingComponent {
  readonly value = input(0);
  readonly size = input(68);
  readonly label = input('Progress');
  readonly color = input('#1f7a5c');
  readonly labelColor = input('#173b31');

  protected readonly circumference = 2 * Math.PI * 42;
  protected readonly dashOffset = computed(
    () => this.circumference - (Math.max(0, Math.min(100, this.value())) / 100) * this.circumference,
  );
}
