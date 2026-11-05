import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'mg-empty',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mg-empty">
      <span class="mg-empty-icon"><i class="ti" [class]="'ti ' + icon()"></i></span>
      <strong>{{ title() }}</strong>
      <p>{{ message() }}</p>
    </div>
  `,
  styles: [
    `
      .mg-empty {
        display: grid;
        justify-items: center;
        gap: 0.35rem;
        padding: 2.25rem 1.25rem;
        text-align: center;
        color: #7d857f;
      }
      .mg-empty-icon {
        display: inline-grid;
        place-items: center;
        width: 2.8rem;
        height: 2.8rem;
        margin-bottom: 0.4rem;
        border-radius: 12px;
        background: #f1f3f0;
        color: #63736b;
        font-size: 1.35rem;
      }
      strong {
        color: #27443a;
        font-size: 0.92rem;
      }
      p {
        max-width: 30ch;
        margin: 0;
        font-size: 0.8rem;
        line-height: 1.5;
      }
    `,
  ],
})
export class EmptyStateComponent {
  readonly title = input('Nothing here yet');
  readonly message = input('Once there is something to review, it will appear here.');
  readonly icon = input('ti-check');
}
