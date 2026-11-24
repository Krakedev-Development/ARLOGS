import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { App } from './app';
import { API_ENDPOINTS, NETWORK_CONFIG } from './core/config/api-endpoints.config';
import { MilestoneRulesEngine } from './domain/services/milestone-rules.engine';
import { ShipmentJob } from './models/shipment.model';

describe('App & Hexagonal Domain Architecture', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient()],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should resolve centralized API endpoints from single NETWORK_CONFIG port', () => {
    expect(API_ENDPOINTS.auth.login()).toContain(`:${NETWORK_CONFIG.backendPort}/api/v1/auth/login`);
    expect(API_ENDPOINTS.shipments.byRef('A901-2026')).toContain(
      `:${NETWORK_CONFIG.backendPort}/api/v1/shipments/A901-2026`,
    );
  });

  it('should compute official PDF acceptance rules accurately via MilestoneRulesEngine', () => {
    const refDate = new Date('2026-11-11T00:00:00');
    const sampleJob: ShipmentJob = {
      refArlogs: 'A901-2026',
      qrCode: 'QR-001-26',
      clienteId: 'CLI-001',
      cliente: 'Industrias Andinas S.A.',
      servicio: 'AEREO',
      serviceCode: 'A',
      aduanaPorArlogs: 'SI',
      shipper: 'Shanghai Precision Tools',
      paisOrigen: 'China',
      puertoEmbarque: 'PVG',
      incoterm: 'FOB',
      ordenesCompra: ['OC-1001'],
      guiaMaster: '999-12345675',
      hawbHbl: 'HAWB-8801',
      contenedor: 'N/A',
      pesoOrigen: 420,
      pesoRecibido: 420,
      h1_asignacion: '2026-10-05',
      h2_respuestaShipper: '2026-10-06',
      h3_cargaLista: '2026-10-09',
      h4_zarpeAtd: '2026-10-11',
      h5_arriboAta: '2026-10-13',
      h6_pesoRecibido: '2026-10-13',
      h7_declaracion: '2026-10-15',
      h8_pagoLiquidacion: '2026-10-16',
      h9_salidaAutorizada: '2026-10-18',
      h10_informeSalida: '2026-10-19',
    };
    const calc = MilestoneRulesEngine.calculateJobMetrics(sampleJob, 15, refDate);
    expect(calc.diasRespuestaShipper).toBe(1);
    expect(calc.diasAlistamiento).toBe(4);
    expect(calc.diasTransito).toBe(2);
    expect(calc.diasCicloTotal).toBe(14);
    expect(calc.estado).toBe('CERRADO');
  });
});
