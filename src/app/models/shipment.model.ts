export type ServiceType = 'AEREO' | 'FCL' | 'LCL' | 'CUSTOMS' | 'COURIER' | 'INLAND';
export type ServicePrefix = 'A' | 'F' | 'L' | 'C' | 'AC' | 'I';
export type UserRole =
  | 'admin'
  | 'gerencia'
  | 'operaciones'
  | 'pricing'
  | 'contabilidad'
  | 'bodegas'
  | 'cliente_a'
  | 'cliente_b';
export type ScreenId =
  | 'gerencia'
  | 'operaciones'
  | 'pricing'
  | 'facturacion'
  | 'bodegas'
  | 'cliente'
  | 'admin';
export type JobStatus = 'ABIERTO' | 'REVISAR' | 'CERRADO' | 'N/A';

export interface ClientRecord {
  id: string;
  nombre: string;
}

export interface Quotation {
  id: string;
  clienteId: string;
  cliente: string;
  servicio: ServiceType;
  serviceCode: ServicePrefix;
  shipper: string;
  paisOrigen: string;
  puertoEmbarque: string;
  incoterm: string;
  ordenesCompra: string[];
  aduanaPorArlogs: 'SI' | 'NO' | 'N/A';
  fechaCotizacion: string;
  estado: 'PENDIENTE' | 'APROBADA';
  refArlogsGenerada?: string;
  valorVentaCotizado?: number;
  costoEstimadoCotizado?: number;
  plazoPagoDias?: number;
}

export interface ShipmentJob {
  refArlogs: string;
  qrCode: string;
  cliente: string;
  clienteId: string;
  servicio: ServiceType;
  serviceCode: ServicePrefix;
  aduanaPorArlogs: 'SI' | 'NO' | 'N/A';
  shipper: string;
  paisOrigen: string;
  puertoEmbarque: string;
  incoterm: string;
  ordenesCompra: string[];
  guiaMaster: string;
  hawbHbl: string;
  contenedor: string;
  pesoOrigen: number | null;
  pesoRecibido: number | null;
  h1_asignacion: string | null;
  h2_respuestaShipper: string | null;
  h3_cargaLista: string | null;
  h4_zarpeAtd: string | null;
  h5_arriboAta: string | null;
  h6_pesoRecibido: string | null;
  h7_declaracion: string | null;
  h8_pagoLiquidacion: string | null;
  h9_salidaAutorizada: string | null;
  h10_informeSalida: string | null;
  responsablePago?: string;
  regimenAduana?: string;
  distritoAduana?: string;
  aforoAduana?: string;
  valorVentaCotizado?: number;
  costoEstimadoCotizado?: number;
  plazoPagoDias?: number;
  facturaNumero?: string;
  valorFacturadoReal?: number;
  costoReal?: number;
  estadoCobro?: 'PENDIENTE_FACTURAR' | 'FACTURADA' | 'COBRADA' | 'VENCIDA';
  fechaFactura?: string;
  diasRespuestaShipper?: number | 'N/A';
  diasAlistamiento?: number | 'N/A';
  diasCoordinacionOrigen?: number | 'N/A';
  diasTransito?: number | 'N/A';
  diasGestionSinAduana?: number | 'N/A';
  diasArriboDeclaracion?: number | 'N/A';
  diasDeclaracionPago?: number | 'N/A';
  diasPagoInforme?: number | 'N/A';
  diasEnAduana?: number | 'N/A';
  diasCicloTotal?: number | 'N/A';
  diasAbiertos?: number | 'N/A';
  diferenciaPesoPct?: string | 'N/A';
  estado?: JobStatus;
  alertaDemora?: boolean;
}

export interface MilestoneDefinition {
  num: number;
  codigo: string;
  nombre: string;
  etapa: 'Origen' | 'Destino' | 'Aduana';
  responsableDefault: string;
  field: keyof ShipmentJob;
}

export const MILESTONE_DEFINITIONS: MilestoneDefinition[] = [
  {
    num: 1,
    codigo: 'H1',
    nombre: 'Asignación del trabajo',
    etapa: 'Origen',
    responsableDefault: 'ARLOGS Operaciones',
    field: 'h1_asignacion',
  },
  {
    num: 2,
    codigo: 'H2',
    nombre: 'Primera respuesta shipper',
    etapa: 'Origen',
    responsableDefault: 'Shipper (Proveedor)',
    field: 'h2_respuestaShipper',
  },
  {
    num: 3,
    codigo: 'H3',
    nombre: 'Carga lista / alistamiento',
    etapa: 'Origen',
    responsableDefault: 'Shipper (Proveedor)',
    field: 'h3_cargaLista',
  },
  {
    num: 4,
    codigo: 'H4',
    nombre: 'Zarpe / Salida real (ATD)',
    etapa: 'Origen',
    responsableDefault: 'Línea de transporte / Forwarder',
    field: 'h4_zarpeAtd',
  },
  {
    num: 5,
    codigo: 'H5',
    nombre: 'Arribo real (ATA)',
    etapa: 'Destino',
    responsableDefault: 'Línea de transporte',
    field: 'h5_arriboAta',
  },
  {
    num: 6,
    codigo: 'H6',
    nombre: 'Peso recibido en destino',
    etapa: 'Destino',
    responsableDefault: 'Terminal / Bodega',
    field: 'h6_pesoRecibido',
  },
  {
    num: 7,
    codigo: 'H7',
    nombre: 'Declaración (DAI / DAE)',
    etapa: 'Aduana',
    responsableDefault: 'Agente de Aduana ARLOGS',
    field: 'h7_declaracion',
  },
  {
    num: 8,
    codigo: 'H8',
    nombre: 'Pago liquidación',
    etapa: 'Aduana',
    responsableDefault: 'Responsable de pago',
    field: 'h8_pagoLiquidacion',
  },
  {
    num: 9,
    codigo: 'H9',
    nombre: 'Salida autorizada',
    etapa: 'Aduana',
    responsableDefault: 'Aduana (SENAE)',
    field: 'h9_salidaAutorizada',
  },
  {
    num: 10,
    codigo: 'H10',
    nombre: 'Informe de salida',
    etapa: 'Aduana',
    responsableDefault: 'ARLOGS Operaciones',
    field: 'h10_informeSalida',
  },
];

export interface ScreenDefinition {
  id: ScreenId;
  label: string;
  icon: string;
  description: string;
}

export interface RoleDefinition {
  role: UserRole;
  label: string;
  summary: string;
  tasks: string[];
  defaultScreens: ScreenId[];
}

export type AuditCategory =
  | 'OPERACION_HITOS'
  | 'PRICING_QR'
  | 'FACTURACION'
  | 'BODEGA_KARDEX'
  | 'GERENCIA_SLA'
  | 'CREDENCIAL_CLIENTE'
  | 'SEGURIDAD_ROLES'
  | 'SESION';

export type WarehouseId = 'BODEGA_1' | 'BODEGA_2';

export interface WarehouseItem {
  id: string;
  bodegaId: WarehouseId;
  bodegaNombre: string;
  clienteId: string;
  cliente: string;
  refArlogs: string;
  ordenCompra: string;
  descripcion: string;
  cantidadInicial: number;
  cantidadDisponible: number;
  unidad: string;
  pesoKg: number;
  fechaIngreso: string;
  ubicacionRack: string;
  estado: 'EN_BODEGA' | 'PARCIAL' | 'DESPACHADO';
  ultimaGuiaRemision?: string;
}

export interface WarehouseMovement {
  id: string;
  itemId: string;
  bodegaNombre: string;
  tipo: 'INGRESO' | 'SALIDA';
  cantidad: number;
  guiaRemision: string;
  ordenCompra: string;
  cliente: string;
  descripcion: string;
  transporteInland?: string;
  responsable: string;
  fecha: string;
  observacion: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  usuario: string;
  email: string;
  rol: UserRole;
  categoria: AuditCategory;
  entidad: string;
  accion: string;
  detalle: string;
}

export interface RoleUser {
  id: string;
  role: UserRole;
  nombre: string;
  email: string;
  password: string;
  activo: boolean;
  cargo: string;
  clienteId?: string;
  clienteNombre?: string;
  avatarIcon: string;
  descripcion: string;
  ultimoAcceso?: string;
  credencialEmitidaEn?: string;
  credencialEmitidaPor?: string;
}

export {
  INITIAL_SESSION_PLACEHOLDER,
  ROLE_DEFINITIONS,
  SCREEN_DEFINITIONS,
} from '../domain/models/iam-roles.catalog';
