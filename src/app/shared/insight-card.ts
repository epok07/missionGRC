import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import type { Insight } from '../../shared/models';
import { insightAudienceLabel } from '../core/ui';

@Component({
  selector: 'mg-insight-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (insight(); as item) {
      <article class="mg-insight" [class.mg-insight-quote]="item.kind === 'quote'">
        <div class="mg-insight-head">
          <span class="mg-insight-kicker">
            <i class="ti" [class]="'ti ' + (item.kind === 'quote' ? 'ti-quote' : 'ti-message-question')"></i>
            {{ label() || (item.kind === 'quote' ? 'Trust note' : 'Ask this today') }}
          </span>
          <button type="button" class="mg-icon-btn" (click)="rotate.emit()" [attr.aria-label]="actionLabel()">
            <i class="ti ti-refresh"></i>
          </button>
        </div>
        <blockquote>{{ item.text }}</blockquote>
        <div class="mg-insight-foot">
          <span class="mg-insight-meta">
            {{ item.kind === 'question' ? insightAudienceLabel(item.audience) : item.category }}
          </span>
          <div class="mg-insight-actions">
            <button type="button" class="mg-text-btn" (click)="copy(item.text)">
              <i class="ti" [class]="'ti ' + (copied() ? 'ti-check' : 'ti-copy')"></i>
              {{ copied() ? 'Copied' : 'Copy' }}
            </button>
            @if (item.attribution) {
              <span class="mg-insight-source">{{ item.attribution }}</span>
            }
          </div>
        </div>
      </article>
    }
  `,
  styles: [
    `
      .mg-insight {
        display: flex;
        flex-direction: column;
        height: 100%;
        min-height: 230px;
        padding: 1.25rem 1.3rem 1.15rem;
        border-radius: 18px;
        color: #eef7f2;
        background:
          radial-gradient(120% 130% at 100% 0%, rgba(85, 181, 146, 0.24), transparent 55%),
          linear-gradient(145deg, #102c24 0%, #0d241e 55%, #17382e 100%);
        border: 1px solid rgba(185, 226, 207, 0.16);
        box-shadow: 0 16px 40px -24px rgba(12, 38, 30, 0.65);
        overflow: hidden;
        position: relative;
      }
      .mg-insight::after {
        content: '“';
        position: absolute;
        right: 1.1rem;
        bottom: -1.4rem;
        font-family: 'Fraunces Variable', Georgia, serif;
        font-size: 7.5rem;
        line-height: 1;
        color: rgba(255, 255, 255, 0.06);
        pointer-events: none;
      }
      .mg-insight-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
      }
      .mg-insight-kicker {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        font-size: 0.68rem;
        font-weight: 800;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: #8ed3b6;
      }
      .mg-insight-kicker .ti {
        font-size: 1rem;
      }
      .mg-icon-btn {
        display: inline-grid;
        place-items: center;
        width: 1.85rem;
        height: 1.85rem;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.16);
        background: rgba(255, 255, 255, 0.06);
        color: #d9eee4;
        cursor: pointer;
        transition: background 150ms ease, transform 150ms ease;
      }
      .mg-icon-btn:hover {
        background: rgba(255, 255, 255, 0.13);
        transform: rotate(20deg);
      }
      blockquote {
        margin: 0.95rem 0 0;
        font-family: 'Fraunces Variable', Georgia, serif;
        font-size: clamp(1.18rem, 1.1rem + 0.5vw, 1.55rem);
        font-weight: 450;
        line-height: 1.32;
        letter-spacing: -0.01em;
        color: #f4fbf7;
        position: relative;
        z-index: 1;
      }
      .mg-insight-foot {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 1rem;
        margin-top: auto;
        padding-top: 1.2rem;
        position: relative;
        z-index: 1;
      }
      .mg-insight-meta {
        font-size: 0.7rem;
        font-weight: 700;
        color: #9fc7b5;
      }
      .mg-insight-actions {
        display: flex;
        align-items: center;
        gap: 0.6rem;
      }
      .mg-text-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        padding: 0.22rem 0.55rem;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.14);
        background: transparent;
        color: #d9eee4;
        font-size: 0.68rem;
        font-weight: 700;
        cursor: pointer;
      }
      .mg-text-btn:hover {
        background: rgba(255, 255, 255, 0.1);
      }
      .mg-insight-source {
        font-size: 0.64rem;
        color: #7fa896;
      }
    `,
  ],
})
export class InsightCardComponent {
  readonly insight = input<Insight | null>(null);
  readonly label = input('');
  readonly actionLabel = input('Show another prompt');
  readonly rotate = output<void>();
  protected readonly copied = signal(false);
  protected readonly insightAudienceLabel = insightAudienceLabel;

  protected async copy(text: string): Promise<void> {
    try {
      await navigator.clipboard?.writeText(text);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1600);
    } catch {
      this.copied.set(false);
    }
  }
}
