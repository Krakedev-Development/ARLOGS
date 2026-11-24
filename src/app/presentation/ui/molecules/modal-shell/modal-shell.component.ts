import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal-shell',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal-shell.component.html',
})
export class ModalShellComponent {
  readonly title = input.required<string>();
  readonly icon = input<string>('bi-layers-fill');
  readonly iconColorClass = input<string>('text-warning');
  readonly sizeClass = input<string>('modal-lg');

  readonly closed = output<void>();
}
