import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { AuditService } from '../../services/audit.service';
import { ShipmentService } from '../../services/shipment.service';
import { ToastService } from '../../services/toast.service';
import { AuditCategory, RoleUser, ScreenId, UserRole } from '../../models/shipment.model';
import { PaginationBarComponent } from '../../presentation/ui/molecules/pagination-bar/pagination-bar.component';
import { ModalShellComponent } from '../../presentation/ui/molecules/modal-shell/modal-shell.component';
import {
  KpiStatCardItem,
  KpiStatRibbonComponent,
} from '../../presentation/ui/organisms/kpi-stat-ribbon/kpi-stat-ribbon.component';

interface UserFormState {
  id?: string;
  nombre: string;
  email: string;
  password: string;
  cargo: string;
  role: UserRole;
  activo: boolean;
  clienteId: string;
}

const ROLE_BADGE_MAP: Record<UserRole, string> = {
  admin: 'badge-subtle badge-subtle-dark',
  gerencia: 'badge-subtle badge-subtle-blue',
  operaciones: 'badge-subtle badge-subtle-slate',
  pricing: 'badge-subtle badge-subtle-amber',
  contabilidad: 'badge-subtle badge-subtle-slate',
  bodegas: 'badge-subtle badge-subtle-slate',
  cliente_a: 'badge-subtle badge-subtle-emerald',
  cliente_b: 'badge-subtle badge-subtle-emerald',
};

const AUDIT_BADGE_MAP: Record<AuditCategory, string> = {
  OPERACION_HITOS: 'badge-subtle badge-subtle-slate',
  PRICING_QR: 'badge-subtle badge-subtle-amber',
  FACTURACION: 'badge-subtle badge-subtle-emerald',
  BODEGA_KARDEX: 'badge-subtle badge-subtle-blue',
  GERENCIA_SLA: 'badge-subtle badge-subtle-rose',
  CREDENCIAL_CLIENTE: 'badge-subtle badge-subtle-slate',
  SEGURIDAD_ROLES: 'badge-subtle badge-subtle-dark',
  SESION: 'badge-subtle badge-subtle-slate',
};

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationBarComponent, ModalShellComponent, KpiStatRibbonComponent],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css',
})
export class AdminComponent {
  private readonly authService = inject(AuthService);
  private readonly auditService = inject(AuditService);
  private readonly shipmentService = inject(ShipmentService);
  private readonly toastService = inject(ToastService);

  readonly clients = this.shipmentService.clients;
  readonly users = this.authService.registeredUsers;
  readonly clientAccounts = this.authService.clientUsers;
  readonly auditLogs = this.auditService.logs;
  readonly currentUser = this.authService.currentUser;
  readonly screens = this.authService.screenDefinitions;
  readonly roleOrder: UserRole[] = ['admin', 'gerencia', 'operaciones', 'pricing', 'contabilidad', 'bodegas', 'cliente_a', 'cliente_b'];

  activeSection = signal<'users' | 'clients' | 'roles' | 'audit'>('users');
  modalError = signal<string | null>(null);
  userPendingDelete = signal<RoleUser | null>(null);

  searchQuery = signal('');
  filterRole = signal<UserRole | 'ALL'>('ALL');
  auditSearch = signal('');
  auditCategoryFilter = signal<AuditCategory | 'ALL'>('ALL');

  userPage = signal(1);
  userPageSize = signal(5);
  auditPage = signal(1);
  auditPageSize = signal(6);

  showUserModal = false;
  showClientCredModal = false;
  isEditMode = false;
  form: UserFormState = this.emptyForm();
  clientCredForm: { clienteId: string; nombre: string; email: string; cargo: string } = { clienteId: '', nombre: '', email: '', cargo: '' };

  readonly kpiItems = computed<readonly KpiStatCardItem[]>(() => [
    { label: 'Total Cuentas', value: this.users().length, icon: 'bi-people', iconBgClass: 'bg-slate-100 text-dark', valueColorClass: 'text-dark' },
    { label: 'Accesos Clientes', value: this.clientAccounts().length, icon: 'bi-key', iconBgClass: 'bg-blue-50 text-primary', valueColorClass: 'text-primary' },
    { label: 'Roles Configurados', value: this.roleOrder.length, icon: 'bi-shield-check', iconBgClass: 'bg-emerald-50 text-success', valueColorClass: 'text-dark' },
    { label: 'Eventos Auditados', value: this.auditLogs().length, icon: 'bi-journal-text', iconBgClass: 'bg-amber-50 text-warning', valueColorClass: 'text-dark' },
  ]);

  readonly filteredUsers = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const role = this.filterRole();
    return this.users().filter((u) => (role === 'ALL' || u.role === role) && (!q || u.nombre.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.cargo.toLowerCase().includes(q)));
  });

  readonly paginatedUsers = computed(() => {
    const total = Math.max(1, Math.ceil(this.filteredUsers().length / this.userPageSize()));
    const start = (Math.min(this.userPage(), total) - 1) * this.userPageSize();
    return this.filteredUsers().slice(start, start + this.userPageSize());
  });

  readonly filteredAuditLogs = computed(() => {
    const q = this.auditSearch().trim().toLowerCase();
    const cat = this.auditCategoryFilter();
    return this.auditLogs().filter((l) => (cat === 'ALL' || l.categoria === cat) && (!q || l.entidad.toLowerCase().includes(q) || l.usuario.toLowerCase().includes(q) || l.accion.toLowerCase().includes(q) || l.detalle.toLowerCase().includes(q)));
  });

  readonly paginatedAuditLogs = computed(() => {
    const total = Math.max(1, Math.ceil(this.filteredAuditLogs().length / this.auditPageSize()));
    const start = (Math.min(this.auditPage(), total) - 1) * this.auditPageSize();
    return this.filteredAuditLogs().slice(start, start + this.auditPageSize());
  });

  emptyForm(): UserFormState {
    const firstClient = this.clients()[0];
    return { nombre: '', email: '', password: '', cargo: '', role: 'operaciones', activo: true, clienteId: firstClient?.id ?? '' };
  }

  getRoleLabel(role: UserRole): string {
    return this.authService.getRoleDefinition(role).label;
  }

  getRoleDef(role: UserRole) {
    return this.authService.getRoleDefinition(role);
  }

  getScreenLabel(screen: ScreenId): string {
    return this.screens.find((s) => s.id === screen)?.label ?? screen;
  }

  getAllowedScreens(role: UserRole): ScreenId[] {
    return this.authService.getAllowedScreens(role);
  }

  hasAccess(role: UserRole, screen: ScreenId): boolean {
    return this.authService.hasScreenAccess(role, screen);
  }

  countUsersInRole(role: UserRole): number {
    return this.users().filter((u) => u.role === role).length;
  }

  getRoleBadgeClass(role: UserRole): string {
    return ROLE_BADGE_MAP[role];
  }

  getAuditBadgeClass(cat: AuditCategory): string {
    return AUDIT_BADGE_MAP[cat];
  }

  onToggleScreen(role: UserRole, screen: ScreenId): void {
    const current = this.hasAccess(role, screen);
    this.authService.toggleRoleScreenAccess(role, screen);
    this.toastService.info('Permiso actualizado', `${this.getRoleLabel(role)} -> ${this.getScreenLabel(screen)}: ${!current ? 'Permitido' : 'Revocado'}`);
  }

  toggleActive(userId: string): void {
    const target = this.users().find((u) => u.id === userId);
    if (!target) return;
    if (target.id === this.currentUser().id) {
      this.toastService.warning('Acción no permitida', 'No puedes suspender tu propia cuenta activa.');
      return;
    }
    if (this.authService.toggleUserActive(userId).ok) {
      const nextState = !target.activo;
      this.toastService.info(nextState ? 'Cuenta activada' : 'Cuenta suspendida', `El usuario ${target.nombre} ahora está ${nextState ? 'Activo' : 'Suspendido'}.`);
    }
  }

  openCreateModal(): void {
    this.isEditMode = false;
    this.form = this.emptyForm();
    this.modalError.set(null);
    this.showUserModal = true;
  }

  openEditModal(user: RoleUser): void {
    this.isEditMode = true;
    const firstClient = this.clients()[0];
    this.form = { id: user.id, nombre: user.nombre, email: user.email, password: user.password, cargo: user.cargo, role: user.role, activo: user.activo, clienteId: user.clienteId ?? firstClient?.id ?? '' };
    this.modalError.set(null);
    this.showUserModal = true;
  }

  closeUserModal(): void {
    this.showUserModal = false;
    this.modalError.set(null);
  }

  submitUserForm(): void {
    if (!this.form.nombre || !this.form.email || !this.form.password) {
      this.modalError.set('Completa los campos obligatorios.');
      return;
    }
    const res = this.isEditMode && this.form.id ? this.authService.updateUser(this.form.id, this.form) : this.authService.createUser(this.form);
    if (!res.ok) {
      this.modalError.set(res.error || 'Error al procesar usuario');
      return;
    }
    this.toastService.success(this.isEditMode ? 'Usuario actualizado' : 'Usuario creado', `${this.form.nombre} guardado exitosamente.`);
    this.closeUserModal();
  }

  confirmDeleteUser(user: RoleUser): void {
    if (user.id === this.currentUser().id) {
      this.toastService.warning('Acción denegada', 'No puedes eliminar la cuenta en sesión actual.');
      return;
    }
    this.userPendingDelete.set(user);
  }

  executeDelete(): void {
    const user = this.userPendingDelete();
    if (!user) return;
    const res = this.authService.deleteUser(user.id);
    this.userPendingDelete.set(null);
    if (res.ok) this.toastService.info('Usuario eliminado', `Se eliminó la cuenta de ${user.nombre}.`);
    else this.toastService.error('Error al eliminar', res.error || 'No se pudo eliminar el usuario.');
  }

  openClientCredModal(): void {
    const firstClient = this.clients()[0];
    this.clientCredForm = { clienteId: firstClient?.id ?? '', nombre: '', email: '', cargo: '' };
    this.modalError.set(null);
    this.showClientCredModal = true;
  }

  submitClientCredential(): void {
    if (!this.clientCredForm.nombre || !this.clientCredForm.email) {
      this.modalError.set('Nombre y correo son obligatorios.');
      return;
    }
    const res = this.authService.issueClientCredentials(this.clientCredForm);
    if (!res.ok) {
      this.modalError.set(res.error || 'Error al emitir credencial.');
      return;
    }
    this.showClientCredModal = false;
    this.toastService.success('Credencial emitida', `Acceso creado para ${this.clientCredForm.nombre}.`);
  }

  copyClientInvite(cli: RoleUser): void {
    navigator.clipboard?.writeText(`ARLOGS Portal Cliente\nUsuario: ${cli.email}\nContraseña: ${cli.password}\nEmpresa: ${cli.clienteNombre}`);
    this.toastService.info('Copiado al portapapeles', `Datos de acceso de ${cli.nombre} listos para enviar.`);
  }

  rotateClientPassword(cli: RoleUser): void {
    const res = this.authService.regenerateClientPassword(cli.id);
    if (res.ok) this.toastService.success('Clave rotada', `Nueva contraseña generada para ${cli.nombre}.`);
    else this.toastService.error('Error', res.error || 'No se pudo rotar la contraseña.');
  }

  exportAudit(): void {
    this.auditService.exportAuditExcel(this.filteredAuditLogs());
    this.toastService.success('Exportación completa', 'Bitácora de auditoría descargada en formato Excel.');
  }
}
