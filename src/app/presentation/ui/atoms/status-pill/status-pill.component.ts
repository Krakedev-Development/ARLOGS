import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-status-pill',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="status-pill" [ngClass]="pillClass()">
      <span class="dot"></span>{{ status() || 'N/A' }}
    </span>
  `,
})
export class StatusPillComponent {
  readonly status = input<string | undefined>('N/A');

  readonly pillClass = computed(() => {
    switch (this.status()) {
      case 'ABIERTO':
      case 'FACTURADA':
      case 'PARCIAL':
        return 'status-abierto';
      case 'REVISAR':
      case 'VENCIDA':
      case 'PENDIENTE_FACTURAR':
        return 'status-revisar';
      case 'CERRADO':
      case 'COBRADA':
      case 'EN_BODEGA':
        return 'status-cerrado';
      default:
        return 'status-na';
    }
  });
}
