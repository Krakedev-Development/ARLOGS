import { Injectable, inject, signal, computed } from '@angular/core';
import {
  ROLE_DEFINITIONS,
  RoleDefinition,
  RoleUser,
  SCREEN_DEFINITIONS,
  ScreenId,
  UserRole,
} from '../models/shipment.model';
import { ShipmentService } from './shipment.service';
import { AuditService } from './audit.service';
import { IamUserFactory } from '../application/iam/iam-user.factory';
import { ArlogsRemoteSyncAdapter } from '../infrastructure/http/arlogs-remote-sync.adapter';

export interface LoginResult {
  ok: boolean;
  error?: string;
  user?: RoleUser;
  defaultScreen?: ScreenId;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly shipmentService = inject(ShipmentService);
  private readonly auditService = inject(AuditService);
  private readonly remoteSync = inject(ArlogsRemoteSyncAdapter);

  readonly isLoggedIn = signal<boolean>(false);
  readonly registeredUsers = signal<RoleUser[]>([]);
  readonly currentUser = this.shipmentService.currentUser;

  readonly roleScreenMatrix = signal<Record<UserRole, ScreenId[]>>({
    admin: [...ROLE_DEFINITIONS.admin.defaultScreens],
    gerencia: [...ROLE_DEFINITIONS.gerencia.defaultScreens],
    operaciones: [...ROLE_DEFINITIONS.operaciones.defaultScreens],
    pricing: [...ROLE_DEFINITIONS.pricing.defaultScreens],
    contabilidad: [...ROLE_DEFINITIONS.contabilidad.defaultScreens],
    bodegas: [...ROLE_DEFINITIONS.bodegas.defaultScreens],
    cliente_a: [...ROLE_DEFINITIONS.cliente_a.defaultScreens],
    cliente_b: [...ROLE_DEFINITIONS.cliente_b.defaultScreens],
  });

  readonly screenDefinitions = SCREEN_DEFINITIONS;
  readonly roleDefinitions = ROLE_DEFINITIONS;

  readonly allowedScreensForCurrentUser = computed<ScreenId[]>(() => {
    const role = this.currentUser().role;
    return this.roleScreenMatrix()[role] ?? ['cliente'];
  });

  readonly clientUsers = computed<RoleUser[]>(() =>
    this.registeredUsers().filter((u) => u.role === 'cliente_a' || u.role === 'cliente_b'),
  );

  constructor() {
    void this.hydrateIamFromDatabase();
  }

  async hydrateIamFromDatabase(): Promise<void> {
    const { users, matrix } = await this.remoteSync.fetchUsersAndRbac();
    if (users.length > 0) {
      this.registeredUsers.set(users);
      this.shipmentService.setCurrentUser(users[0]);
    }
    if (Object.keys(matrix).length > 0) {
      this.roleScreenMatrix.update((prev) => ({ ...prev, ...matrix }));
    }
  }

  authenticateCredentials(email: string, password: string): LoginResult {
    const normalizedEmail = email.trim().toLowerCase();
    const user = this.registeredUsers().find((u) => u.email.toLowerCase() === normalizedEmail);

    if (!user || user.password !== password) {
      this.recordAudit('SESION', normalizedEmail || 'LOGIN', 'Intento Fallido de Ingreso', 'Contraseña incorrecta o correo no registrado', user);
      return { ok: false, error: 'Credenciales incorrectas. Verifica tu correo y contraseña.' };
    }
    if (!user.activo) {
      this.recordAudit('SESION', user.email, 'Acceso Bloqueado (Cuenta Suspendida)', 'Intento de inicio de sesión con cuenta desactivada', user);
      return { ok: false, error: 'Esta cuenta está desactivada. Contacta al Administrador.' };
    }
    if (this.getAllowedScreens(user.role).length === 0) {
      return { ok: false, error: 'Este rol no tiene pantallas asignadas actualmente.' };
    }

    const updatedUser: RoleUser = { ...user, ultimoAcceso: IamUserFactory.formatNow() };
    this.registeredUsers.update((list) => list.map((u) => (u.id === user.id ? updatedUser : u)));
    this.shipmentService.setCurrentUser(updatedUser);
    this.recordAudit('SESION', updatedUser.clienteId ?? updatedUser.email, 'Inicio de Sesión Exitoso', `Acceso concedido como ${ROLE_DEFINITIONS[updatedUser.role].label}`, updatedUser);

    return { ok: true, user: updatedUser, defaultScreen: this.getDefaultScreen(updatedUser.role) };
  }

  commitSession(): void {
    this.isLoggedIn.set(true);
  }

  login(email: string, password: string): LoginResult {
    const res = this.authenticateCredentials(email, password);
    if (res.ok) this.commitSession();
    return res;
  }

  logout(): void {
    const actor = this.currentUser();
    this.recordAudit('SESION', actor.email, 'Cierre de Sesión', 'Sesión finalizada manualmente por el usuario', actor);
    this.isLoggedIn.set(false);
  }

  hasScreenAccess(role: UserRole, screen: ScreenId): boolean {
    return (this.roleScreenMatrix()[role] ?? []).includes(screen);
  }

  getAllowedScreens(role: UserRole): ScreenId[] {
    return this.roleScreenMatrix()[role] ?? [];
  }

  getDefaultScreen(role: UserRole): ScreenId {
    const allowed = this.getAllowedScreens(role);
    if (allowed.length === 0) return 'cliente';
    const roleScreenMap: Record<UserRole, ScreenId> = {
      admin: 'admin',
      gerencia: 'gerencia',
      operaciones: 'operaciones',
      pricing: 'pricing',
      contabilidad: 'facturacion',
      bodegas: 'bodegas',
      cliente_a: 'cliente',
      cliente_b: 'cliente',
    };
    const preferred = roleScreenMap[role];
    return allowed.includes(preferred) ? preferred : allowed[0];
  }

  getRoleDefinition(role: UserRole): RoleDefinition {
    return ROLE_DEFINITIONS[role];
  }

  toggleRoleScreenAccess(role: UserRole, screen: ScreenId): { ok: boolean; error?: string } {
    if (role === 'admin' && screen === 'admin') {
      return { ok: false, error: 'El rol Administrador debe conservar acceso al módulo de Administración.' };
    }
    let enabled = false;
    this.roleScreenMatrix.update((matrix) => {
      const current = matrix[role] ?? [];
      const exists = current.includes(screen);
      enabled = !exists;
      return { ...matrix, [role]: exists ? current.filter((s) => s !== screen) : [...current, screen] };
    });
    void this.remoteSync.pushRbacToggle(role, screen, enabled);
    this.recordAudit('SEGURIDAD_ROLES', `${role} -> ${screen}`, 'Actualización Matriz RBAC', `Pantalla '${screen}' ${enabled ? 'HABILITADA' : 'REVOCADA'} para rol ${ROLE_DEFINITIONS[role].label}`);
    return { ok: true };
  }

  issueClientCredentials(input: { nombre: string; email: string; cargo: string; clienteId: 'CLI-001' | 'CLI-002' }): { ok: boolean; error?: string; user?: RoleUser } {
    const cleanEmail = input.email.trim().toLowerCase();
    if (!input.nombre.trim() || !cleanEmail) return { ok: false, error: 'Nombre del contacto y correo corporativo son obligatorios.' };
    if (this.registeredUsers().some((u) => u.email.toLowerCase() === cleanEmail)) return { ok: false, error: `Ya existe una credencial para el correo ${cleanEmail}.` };

    const { user, clienteNombre } = IamUserFactory.buildClientCredentialUser(input, this.currentUser().nombre);
    this.registeredUsers.update((list) => [user, ...list]);
    void this.remoteSync.pushCreateUser(user);
    this.recordAudit('CREDENCIAL_CLIENTE', cleanEmail, 'Emisión de Credencial Cliente', `Acceso emitido para ${clienteNombre} (${input.clienteId}) | Contacto: ${user.nombre}`);
    return { ok: true, user };
  }

  regenerateClientPassword(userId: string): { ok: boolean; error?: string; newPassword?: string } {
    const target = this.registeredUsers().find((u) => u.id === userId);
    if (!target) return { ok: false, error: 'Cuenta de cliente no encontrada.' };
    const newPassword = IamUserFactory.generateTempPassword(target.clienteId || 'CLI');
    const actor = this.currentUser();
    const nowTs = IamUserFactory.formatNow();

    this.registeredUsers.update((list) =>
      list.map((u) => (u.id === userId ? { ...u, password: newPassword, credencialEmitidaEn: nowTs, credencialEmitidaPor: actor.nombre } : u)),
    );
    void this.remoteSync.pushUpdateUser(userId, { password: newPassword });
    this.recordAudit('CREDENCIAL_CLIENTE', target.email, 'Rotación de Clave Cliente', `Nueva clave temporal generada para ${target.clienteNombre || target.nombre}`);
    return { ok: true, newPassword };
  }

  createUser(input: { nombre: string; email: string; password: string; cargo: string; role: UserRole; activo: boolean; clienteId?: string }): { ok: boolean; error?: string; user?: RoleUser } {
    const cleanEmail = input.email.trim().toLowerCase();
    if (!input.nombre.trim() || !cleanEmail || !input.password.trim()) return { ok: false, error: 'Nombre, correo y contraseña son obligatorios.' };
    if (this.registeredUsers().some((u) => u.email.toLowerCase() === cleanEmail)) return { ok: false, error: `Ya existe un usuario registrado con el correo ${cleanEmail}.` };

    const newUser = IamUserFactory.buildNewUser(input, this.currentUser().nombre);
    this.registeredUsers.update((list) => [newUser, ...list]);
    void this.remoteSync.pushCreateUser(newUser);
    this.recordAudit(newUser.clienteId ? 'CREDENCIAL_CLIENTE' : 'SEGURIDAD_ROLES', cleanEmail, 'Creación de Usuario', `Usuario ${newUser.nombre} creado con rol ${ROLE_DEFINITIONS[input.role].label}`);
    return { ok: true, user: newUser };
  }

  updateUser(id: string, changes: { nombre: string; email: string; password: string; cargo: string; role: UserRole; activo: boolean; clienteId?: string }): { ok: boolean; error?: string } {
    const cleanEmail = changes.email.trim().toLowerCase();
    if (!changes.nombre.trim() || !cleanEmail || !changes.password.trim()) return { ok: false, error: 'Nombre, correo y contraseña son obligatorios.' };
    if (this.registeredUsers().some((u) => u.id !== id && u.email.toLowerCase() === cleanEmail)) return { ok: false, error: `El correo ${cleanEmail} ya pertenece a otro usuario.` };
    if (id === this.currentUser().id && !changes.activo) return { ok: false, error: 'No puedes desactivar tu propia sesión activa.' };

    const previous = this.registeredUsers().find((u) => u.id === id);
    const roleMeta = IamUserFactory.getDefaultMetaForRole(changes.role, changes.clienteId);
    let updatedRef: RoleUser | null = null;

    this.registeredUsers.update((list) =>
      list.map((u) => {
        if (u.id !== id) return u;
        updatedRef = {
          ...u,
          nombre: changes.nombre.trim(),
          email: cleanEmail,
          password: changes.password,
          cargo: changes.cargo.trim() || ROLE_DEFINITIONS[changes.role].label,
          role: changes.role,
          activo: changes.activo,
          avatarIcon: roleMeta.avatarIcon,
          descripcion: ROLE_DEFINITIONS[changes.role].summary,
          clienteId: roleMeta.clienteId,
          clienteNombre: roleMeta.clienteNombre,
        };
        return updatedRef;
      }),
    );

    if (updatedRef && id === this.currentUser().id) this.shipmentService.setCurrentUser(updatedRef);
    void this.remoteSync.pushUpdateUser(id, changes);
    this.recordAudit('SEGURIDAD_ROLES', cleanEmail, 'Edición de Usuario / Rol', `Rol: ${previous?.role ?? '?'} -> ${changes.role} | Estado: ${changes.activo ? 'Activo' : 'Suspendido'}`);
    return { ok: true };
  }

  toggleUserActive(id: string): { ok: boolean; error?: string } {
    const target = this.registeredUsers().find((u) => u.id === id);
    if (!target) return { ok: false, error: 'Usuario no encontrado.' };
    if (target.id === this.currentUser().id) return { ok: false, error: 'No puedes desactivar tu propia cuenta mientras está en uso.' };

    const nextActive = !target.activo;
    this.registeredUsers.update((list) => list.map((u) => (u.id === id ? { ...u, activo: nextActive } : u)));
    void this.remoteSync.pushUpdateUser(id, { activo: nextActive });
    this.recordAudit(target.clienteId ? 'CREDENCIAL_CLIENTE' : 'SEGURIDAD_ROLES', target.email, nextActive ? 'Activación de Cuenta' : 'Suspensión de Cuenta', `Estado actualizado a ${nextActive ? 'ACTIVO' : 'SUSPENDIDO'}`);
    return { ok: true };
  }

  deleteUser(id: string): { ok: boolean; error?: string } {
    if (id === this.currentUser().id) return { ok: false, error: 'No puedes eliminar el usuario con sesión activa.' };
    const target = this.registeredUsers().find((u) => u.id === id);
    if (!target) return { ok: false, error: 'Usuario no encontrado.' };
    if (target.role === 'admin' && this.registeredUsers().filter((u) => u.role === 'admin').length <= 1) {
      return { ok: false, error: 'Debe existir al menos un Administrador en el sistema.' };
    }
    this.registeredUsers.update((list) => list.filter((u) => u.id !== id));
    void this.remoteSync.pushDeleteUser(id);
    this.recordAudit('SEGURIDAD_ROLES', target.email, 'Eliminación de Usuario', `Cuenta ${target.nombre} (${ROLE_DEFINITIONS[target.role].label}) eliminada`);
    return { ok: true };
  }

  private recordAudit(categoria: Parameters<AuditService['record']>[0]['categoria'], entidad: string, accion: string, detalle: string, explicitActor?: RoleUser): void {
    const actor = explicitActor ?? this.currentUser();
    this.auditService.record({
      usuario: actor?.nombre ?? 'Desconocido',
      email: actor?.email ?? 'vacío',
      rol: actor?.role ?? 'cliente_a',
      categoria,
      entidad,
      accion,
      detalle,
    });
  }
}
