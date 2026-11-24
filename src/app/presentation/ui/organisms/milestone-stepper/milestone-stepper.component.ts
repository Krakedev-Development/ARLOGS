import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MILESTONE_DEFINITIONS, ServiceType, ShipmentJob } from '../../../../models/shipment.model';
import { MilestoneRulesEngine } from '../../../../domain/services/milestone-rules.engine';

@Component({
  selector: 'app-milestone-stepper',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './milestone-stepper.component.html',
  styles: [
    `
      .letter-spacing-wide {
        letter-spacing: 0.05em;
      }
      .stepper-item {
        min-width: 85px;
        transition: all 0.2s ease;
        border-color: #e2e8f0 !important;
      }
      .node-done {
        background-color: #ecfdf5 !important;
        border-color: #a7f3d0 !important;
      }
      .node-na {
        background-color: #f8fafc !important;
        opacity: 0.55;
      }
      .bg-emerald-600 {
        background-color: #059669 !important;
      }
      .text-emerald-700 {
        color: #047857 !important;
      }
      .text-amber-700 {
        color: #b45309 !important;
      }
    `,
  ],
})
export class MilestoneStepperComponent {
  readonly service = input.required<ServiceType>();
  readonly aduanaPorArlogs = input.required<'SI' | 'NO' | 'N/A'>();
  readonly formState = input.required<Partial<ShipmentJob>>();

  readonly milestoneDefs = MILESTONE_DEFINITIONS;

  isApplicable(num: number): boolean {
    return MilestoneRulesEngine.isMilestoneApplicable(this.service(), this.aduanaPorArlogs(), num);
  }

  getMilestoneDate(num: number): string | null {
    const def = this.milestoneDefs.find((m) => m.num === num);
    if (!def) return null;
    const val = this.formState()[def.field];
    return typeof val === 'string' ? val : null;
  }
}
