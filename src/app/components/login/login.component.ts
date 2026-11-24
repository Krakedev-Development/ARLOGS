import { Component, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { ROLE_DEFINITIONS, ScreenId } from '../../models/shipment.model';

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

  email = '';
  password = '';
  showPassword = signal(false);
  isAuthenticating = signal(false);
  errorMessage = signal<string | null>(null);

  async onSubmit(): Promise<void> {
    if (!this.email.trim() || !this.password.trim()) {
      this.errorMessage.set('Por favor ingresa tu correo corporativo y contraseña.');
      this.toastService.warning(
        'Campos incompletos',
        'Ingresa correo y contraseña para iniciar sesión.',
      );
      return;
    }

    this.isAuthenticating.set(true);
    this.errorMessage.set(null);

    if (this.authService.registeredUsers().length === 0) {
      await this.authService.hydrateIamFromDatabase();
    }

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
        res.error || 'El correo o contraseña no coinciden con ninguna cuenta activa en la base de datos.',
      );
    }
  }
}
