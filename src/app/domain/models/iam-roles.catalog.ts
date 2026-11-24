import { RoleDefinition, RoleUser, ScreenDefinition, UserRole } from '../../models/shipment.model';

export const SCREEN_DEFINITIONS: ScreenDefinition[] = [
  {
    id: 'gerencia',
    label: 'Gerencia',
    icon: 'bi-pie-chart-fill',
    description: 'Dashboard ejecutivo, KPIs, cuellos de botella y umbral SLA',
  },
  {
    id: 'operaciones',
    label: 'Operaciones',
    icon: 'bi-layers-fill',
    description: 'Control de embarques, edición de hitos H1-H10 y pesos (sin precios)',
  },
  {
    id: 'pricing',
    label: 'Pricing',
    icon: 'bi-tag-fill',
    description: 'Cotizaciones QR, tarifas, aprobación comercial y activación ARLOGS',
  },
  {
    id: 'facturacion',
    label: 'Facturación',
    icon: 'bi-receipt-cutoff',
    description: 'Contabilidad: cotizado vs facturado real, profit y control de cobros',
  },
  {
    id: 'bodegas',
    label: 'Bodegas Kardex',
    icon: 'bi-building-fill-gear',
    description: 'Operaciones 3: inventario Kardex (2 almacenes) y guías de remisión',
  },
  {
    id: 'cliente',
    label: 'Portal Clientes',
    icon: 'bi-building',
    description: 'Seguimiento aislado por empresa cliente y órdenes de compra',
  },
  {
    id: 'admin',
    label: 'Administración',
    icon: 'bi-shield-lock-fill',
    description: 'CRUD de usuarios, asignación de roles y matriz de accesos',
  },
];

export const ROLE_DEFINITIONS: Record<UserRole, RoleDefinition> = {
  admin: {
    role: 'admin',
    label: 'Administrador',
    summary: 'Gobierno total de accesos, cuentas de usuario y auditoría de roles del sistema.',
    tasks: [
      'Crear, editar, activar/desactivar y eliminar usuarios',
      'Emitir, rotar y controlar credenciales de acceso para clientes',
      'Asignar roles operativos o de cliente y configurar permisos por pantalla',
      'Auditar modificaciones de fechas H1-H10, umbrales SLA y sesiones',
    ],
    defaultScreens: [
      'admin',
      'gerencia',
      'operaciones',
      'pricing',
      'facturacion',
      'bodegas',
      'cliente',
    ],
  },
  gerencia: {
    role: 'gerencia',
    label: 'Gerencia General',
    summary: 'Supervisión estratégica global: tiempos, SLA, proveedores, auditoría y profit.',
    tasks: [
      'Configurar el umbral dinámico de alerta (días abiertos)',
      'Comparar desempeño por proveedor (shipper) y detectar demoras',
      'Revisar cotizado vs facturado real y profit sin depender de Excel',
      'Auditar cambios manuales de hitos H1-H10 y exportar reportes',
    ],
    defaultScreens: ['gerencia', 'operaciones', 'pricing', 'facturacion', 'bodegas', 'cliente'],
  },
  operaciones: {
    role: 'operaciones',
    label: 'Operaciones',
    summary:
      'Ejecución diaria de hitos H1-H10, tracking y pesos (sin acceso a precios ni tarifas).',
    tasks: [
      'Registrar y actualizar fechas de hitos H1 a H10',
      'Controlar peso de origen vs. peso recibido en destino',
      'Consultar tracking por guía máster / contenedor y notificar al cliente',
      'Operación estrictamente aislada de costos, tarifas o facturación',
    ],
    defaultScreens: ['operaciones'],
  },
  pricing: {
    role: 'pricing',
    label: 'Pricing',
    summary:
      'Gestión comercial de cotizaciones QR, costos/tarifas y apertura ARLOGS (no edita ni ve fechas).',
    tasks: [
      'Emitir cotizaciones con código único QR sin duplicidad',
      'Definir tarifa de venta, costo estimado y alerta de flujo por crédito',
      'Aprobar cotizaciones para activar referencias A/F/L/C/AC/I automáticamente',
    ],
    defaultScreens: ['pricing'],
  },
  contabilidad: {
    role: 'contabilidad',
    label: 'Contabilidad / Facturación',
    summary:
      'Emite facturas y gestiona cobros consolidando datos heredados de Pricing y Operaciones.',
    tasks: [
      'Facturar referencias activas sin volver a digitar datos comerciales u operativos',
      'Comparar valor cotizado vs. facturado real y validar profit por embarque',
      'Controlar estado de cobros y alertas de flujo de caja a 30+ días',
    ],
    defaultScreens: ['facturacion'],
  },
  bodegas: {
    role: 'bodegas',
    label: 'Operaciones 3 (Bodegas)',
    summary:
      'Control Kardex físico de 2 bodegas arrendadas y transporte interno sin costeo de inventario.',
    tasks: [
      'Registrar ingresos físicos por conteo en Bodega Norte y Bodega Sur',
      'Controlar saldos disponibles vinculados por Cliente y Orden de Compra',
      'Emitir Guías de Remisión para despachos y movimientos locales (Inland)',
    ],
    defaultScreens: ['bodegas'],
  },
  cliente_a: {
    role: 'cliente_a',
    label: 'Cliente A (Industrias Andinas)',
    summary: 'Consulta exclusiva y aislada de embarques pertenecientes a Industrias Andinas.',
    tasks: [
      'Visualizar avance de hitos de sus propias referencias',
      'Filtrar embarques por mes, shipper, OC, modalidad o Incoterm',
      'Exportar su propio historial de carga sin acceso a terceros',
    ],
    defaultScreens: ['cliente'],
  },
  cliente_b: {
    role: 'cliente_b',
    label: 'Cliente B (Comercial Pacífico)',
    summary: 'Consulta exclusiva y aislada de embarques pertenecientes a Comercial Pacífico.',
    tasks: [
      'Visualizar avance de hitos de sus propias referencias',
      'Filtrar embarques por mes, shipper, OC, modalidad o Incoterm',
      'Exportar su propio historial de carga sin acceso a terceros',
    ],
    defaultScreens: ['cliente'],
  },
};

export const INITIAL_SESSION_PLACEHOLDER: RoleUser = {
  id: 'USR-SESSION-INIT',
  role: 'admin',
  nombre: 'Sesión ARLOGS',
  email: 'session@arlogs.com',
  password: '',
  activo: true,
  cargo: 'Cargando perfil desde BD...',
  avatarIcon: 'bi-shield-lock-fill',
  descripcion: 'Sesión inicializada desde arl_security_user',
};
