import {
  ROLE_DEFINITIONS,
  RoleUser,
  UserRole,
} from '../../models/shipment.model';

export class IamUserFactory {
  static generateTempPassword(prefix: string): string {
    const clean =
      prefix
        .replace(/[^A-Z0-9]/gi, '')
        .slice(0, 4)
        .toUpperCase() || 'ARLG';
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `${clean}-${rand}*26`;
  }

  static formatNow(): string {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }

  static getDefaultMetaForRole(
    role: UserRole,
    explicitClientId?: string,
  ): { avatarIcon: string; clienteId?: string; clienteNombre?: string } {
    switch (role) {
      case 'admin':
        return { avatarIcon: 'bi-shield-lock-fill' };
      case 'gerencia':
        return { avatarIcon: 'bi-speedometer2' };
      case 'operaciones':
        return { avatarIcon: 'bi-gear-wide-connected' };
      case 'pricing':
        return { avatarIcon: 'bi-tag-fill' };
      case 'contabilidad':
        return { avatarIcon: 'bi-receipt-cutoff' };
      case 'bodegas':
        return { avatarIcon: 'bi-building-fill-gear' };
      case 'cliente_a': {
        const cid = explicitClientId || 'CLI-001';
        return {
          avatarIcon: 'bi-building-fill',
          clienteId: cid,
          clienteNombre:
            cid === 'CLI-002'
              ? 'Comercial Pacífico Cía. Ltda.'
              : 'Industrias Andinas S.A.',
        };
      }
      case 'cliente_b': {
        const cid = explicitClientId || 'CLI-002';
        return {
          avatarIcon: 'bi-box-seam-fill',
          clienteId: cid,
          clienteNombre:
            cid === 'CLI-001'
              ? 'Industrias Andinas S.A.'
              : 'Comercial Pacífico Cía. Ltda.',
        };
      }
    }
  }

  static buildClientCredentialUser(
    input: {
      nombre: string;
      email: string;
      cargo: string;
      clienteId: 'CLI-001' | 'CLI-002';
    },
    actorName: string,
  ): { user: RoleUser; clienteNombre: string } {
    const cleanEmail = input.email.trim().toLowerCase();
    const generatedPassword = this.generateTempPassword(input.clienteId);
    const role: UserRole = input.clienteId === 'CLI-001' ? 'cliente_a' : 'cliente_b';
    const clienteNombre =
      input.clienteId === 'CLI-001'
        ? 'Industrias Andinas S.A.'
        : 'Comercial Pacífico Cía. Ltda.';
    const nowTs = this.formatNow();

    const user: RoleUser = {
      id: `user-cli-${Date.now()}`,
      role,
      nombre: input.nombre.trim(),
      email: cleanEmail,
      password: generatedPassword,
      activo: true,
      cargo: input.cargo.trim() || `Portal Cliente - ${clienteNombre}`,
      clienteId: input.clienteId,
      clienteNombre,
      avatarIcon: input.clienteId === 'CLI-001' ? 'bi-building-fill' : 'bi-box-seam-fill',
      descripcion: ROLE_DEFINITIONS[role].summary,
      credencialEmitidaEn: nowTs,
      credencialEmitidaPor: actorName,
    };

    return { user, clienteNombre };
  }

  static buildNewUser(
    input: {
      nombre: string;
      email: string;
      password: string;
      cargo: string;
      role: UserRole;
      activo: boolean;
      clienteId?: string;
    },
    actorName: string,
  ): RoleUser {
    const cleanEmail = input.email.trim().toLowerCase();
    const roleMeta = this.getDefaultMetaForRole(input.role, input.clienteId);
    return {
      id: `user-${Date.now()}`,
      role: input.role,
      nombre: input.nombre.trim(),
      email: cleanEmail,
      password: input.password,
      activo: input.activo,
      cargo: input.cargo.trim() || ROLE_DEFINITIONS[input.role].label,
      avatarIcon: roleMeta.avatarIcon,
      descripcion: ROLE_DEFINITIONS[input.role].summary,
      ...(roleMeta.clienteId
        ? {
            clienteId: roleMeta.clienteId,
            clienteNombre: roleMeta.clienteNombre,
            credencialEmitidaEn: this.formatNow(),
            credencialEmitidaPor: actorName,
          }
        : {}),
    };
  }
}
