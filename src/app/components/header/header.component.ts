import {
  Component,
  Input,
  Output,
  EventEmitter,
  HostListener,
  inject,
  computed,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShipmentService } from '../../services/shipment.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { ScreenId, UserRole } from '../../models/shipment.model';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class HeaderComponent {
  @Input() activeTab: ScreenId = 'gerencia';
  @Output() tabChange = new EventEmitter<ScreenId>();
  @Output() logoutRequested = new EventEmitter<void>();

  private readonly shipmentService = inject(ShipmentService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  menuOpen = signal(false);
  userMenuOpen = signal(false);

  readonly currentUser = this.shipmentService.currentUser;
  readonly activeUsers = computed(() => this.authService.registeredUsers().filter((u) => u.activo));

  readonly visibleTabs = computed(() => {
    const allowed = this.authService.allowedScreensForCurrentUser();
    return this.authService.screenDefinitions.filter((s) => allowed.includes(s.id));
  });

  readonly activeTabDef = computed(
    () => this.visibleTabs().find((t) => t.id === this.activeTab) ?? this.visibleTabs()[0] ?? null,
  );

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.menuOpen.set(false);
    this.userMenuOpen.set(false);
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.userMenuOpen()) {
      this.userMenuOpen.set(false);
    }
  }

  toggleMenu(): void {
    this.userMenuOpen.set(false);
    this.menuOpen.update((v) => !v);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  toggleUserMenu(event: Event): void {
    event.stopPropagation();
    this.menuOpen.set(false);
    this.userMenuOpen.update((v) => !v);
  }

  onSelectTab(tab: ScreenId): void {
    this.tabChange.emit(tab);
    this.menuOpen.set(false);
  }

  switchToUser(userId: string): void {
    const user = this.authService.registeredUsers().find((u) => u.id === userId);
    if (!user) return;
    this.shipmentService.setCurrentUser(user);
    const defaultTab = this.authService.getDefaultScreen(user.role);
    this.tabChange.emit(defaultTab);
    this.userMenuOpen.set(false);
    this.menuOpen.set(false);
    this.toastService.info(
      'Actualizado — Perfil activo',
      `Operando como ${user.nombre} (${user.role}).`,
    );
  }

  switchRole(role: UserRole): void {
    const defaultTab = this.authService.switchActiveRole(role);
    this.tabChange.emit(defaultTab);
    this.userMenuOpen.set(false);
    this.toastService.info('Actualizado — Rol activo', `Permisos cambiados a vista ${role}.`);
  }

  exportExcel(): void {
    const jobs = this.shipmentService.authorizedJobs();
    if (!jobs.length) {
      this.toastService.warning(
        'Sin datos para exportar',
        'No hay embarques autorizados en tu perfil actual.',
      );
      return;
    }
    this.shipmentService.exportToExcel(jobs);
    this.menuOpen.set(false);
    this.toastService.success(
      'Correcto — Excel generado',
      `Se exportaron ${jobs.length} embarques autorizados.`,
    );
  }

  onLogout(): void {
    this.menuOpen.set(false);
    this.userMenuOpen.set(false);
    this.toastService.info('Sesión cerrada', 'Has salido de ARLOGS de forma segura.');
    this.logoutRequested.emit();
  }
}
