import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface KpiStatCardItem {
  readonly label: string;
  readonly value: string | number;
  readonly icon: string;
  readonly iconBgClass: string;
  readonly valueColorClass?: string;
}

@Component({
  selector: 'app-kpi-stat-ribbon',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './kpi-stat-ribbon.component.html',
  styles: [
    `
      .stat-icon {
        width: 32px;
        height: 32px;
        font-size: 1rem;
      }
      @media (min-width: 576px) {
        .border-end-sm {
          border-right: 1px solid #e2e8f0;
        }
      }
    `,
  ],
})
export class KpiStatRibbonComponent {
  readonly items = input.required<readonly KpiStatCardItem[]>();
}
