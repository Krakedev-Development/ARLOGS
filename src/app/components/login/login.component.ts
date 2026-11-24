import { Component, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { DEMO_USERS, ROLE_DEFINITIONS, ScreenId, UserRole } from '../../models/shipment.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  @Output() loginSuccess = new EventEmitter<ScreenId>();

  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  email = 'admin@arlogs.com';
  password = '••••••••••••';
  showPassword = signal(false);
  isAuthenticating = signal(false);
  errorMessage = signal<string | null>(null);

  readonly quickProfiles: {
    role: UserRole;
    label: string;
    badgeBg: string;
    scope: string;
  }[] = [
    { role: 'admin', label: 'Admin', badgeBg: 'bg-slate-900', scope: 'Control total' },
    { role: 'gerencia', label: 'Gerencia', badgeBg: 'bg-slate-800', scope: 'SLA y Profit' },
    { role: 'operaciones', label: 'Operaciones', badgeBg: 'bg-slate-700', scope: 'Hitos H1-H10' },
    { role: 'pricing', label: 'Pricing', badgeBg: 'bg-slate-600', scope: 'Cotizaciones' },
    { role: 'contabilidad', label: 'Contabilidad', badgeBg: 'bg-slate-600', scope: 'Facturación' },
    { role: 'bodegas', label: 'Bodegas', badgeBg: 'bg-slate-600', scope: 'Kardex y Guías' },
    { role: 'cliente_a', label: 'Ind. Andinas', badgeBg: 'bg-slate-700', scope: 'Portal Cliente' },
    { role: 'cliente_b', label: 'Com. Pacífico', badgeBg: 'bg-slate-700', scope: 'Portal Cliente' },
  ];

  onSubmit(): void {
    if (!this.email || !this.password) {
      this.errorMessage.set('Por favor ingresa usuario y contraseña.');
      this.toastService.warning(
        'Campos incompletos',
        'Ingresa usuario y contraseña para continuar.',
      );
      return;
    }

    this.isAuthenticating.set(true);
    this.errorMessage.set(null);

    const res = this.authService.login(this.email, this.password);
    this.isAuthenticating.set(false);

    if (res.ok && res.user && res.defaultScreen) {
      this.toastService.success(
        'Sesión iniciada',
        `Bienvenido, ${res.user.nombre} (${ROLE_DEFINITIONS[res.user.role].label})`,
      );
      this.loginSuccess.emit(res.defaultScreen);
    } else {
      this.errorMessage.set(res.error || 'Credenciales no válidas.');
      this.toastService.error(
        'Error de autenticación',
        res.error || 'El correo o contraseña no coinciden con ninguna cuenta activa.',
      );
    }
  }

  quickSignIn(role: UserRole): void {
    const demoUser = DEMO_USERS.find((u) => u.role === role);
    if (demoUser) {
      this.email = demoUser.email;
      this.password = demoUser.password;
      this.onSubmit();
    }
  }
}
