import { Injectable } from '@angular/core';
import { SpreadsheetExporterPort } from '../../domain/ports/spreadsheet-exporter.port';
import { AuditEntry, ShipmentJob, UserRole } from '../../models/shipment.model';

@Injectable({
  providedIn: 'root',
})
export class XlsxSpreadsheetExporterAdapter implements SpreadsheetExporterPort {
  async exportShipments(jobs: readonly ShipmentJob[], viewerRole: UserRole): Promise<void> {
    const canSeeFinancials =
      viewerRole === 'gerencia' || viewerRole === 'admin' || viewerRole === 'contabilidad';
    const isClientRole = viewerRole === 'cliente_a' || viewerRole === 'cliente_b';

    const rows = jobs.map((j) => {
      const base: Record<string, string | number | boolean | null | undefined> = {
        'Ref ARLOGS': j.refArlogs,
        'QR Cotización': j.qrCode,
        Modalidad: j.servicio,
        Estado: j.estado,
        'Días Abiertos': j.diasAbiertos,
        Shipper: j.shipper,
        'País Origen': j.paisOrigen,
        Puerto: j.puertoEmbarque,
        Incoterm: j.incoterm,
        'Órdenes de Compra': j.ordenesCompra.join(', '),
        'Guía Máster / BL': j.guiaMaster,
        'HAWB / HBL': j.hawbHbl,
        Contenedor: j.contenedor,
        'Peso Origen (kg)': j.pesoOrigen ?? 'N/A',
        'Peso Recibido (kg)': j.pesoRecibido ?? 'N/A',
        'Dif. Peso %': j.diferenciaPesoPct,
        'H1 Asignación': j.h1_asignacion ?? 'N/A',
        'H2 Resp. Shipper': j.h2_respuestaShipper ?? 'N/A',
        'H3 Carga Lista': j.h3_cargaLista ?? 'N/A',
        'H4 Zarpe ATD': j.h4_zarpeAtd ?? 'N/A',
        'H5 Arribo ATA': j.h5_arriboAta ?? 'N/A',
        'H6 Peso Recibido': j.h6_pesoRecibido ?? 'N/A',
        'H7 Declaración': j.h7_declaracion ?? 'N/A',
        'H8 Pago': j.h8_pagoLiquidacion ?? 'N/A',
        'H9 Salida Autorizada': j.h9_salidaAutorizada ?? 'N/A',
        'H10 Informe Salida': j.h10_informeSalida ?? 'N/A',
        'Resp. Shipper (2-1)': j.diasRespuestaShipper,
        'Alistamiento (3-1)': j.diasAlistamiento,
        'Coordinación Origen (4-1)': j.diasCoordinacionOrigen,
        'Tránsito (5-4)': j.diasTransito,
        'Gestión Sin Aduana (6-1)': j.diasGestionSinAduana,
        'Arribo a Decl. (7-5)': j.diasArriboDeclaracion,
        'Decl. a Pago (8-7)': j.diasDeclaracionPago,
        'Pago a Inf. (10-8)': j.diasPagoInforme,
        'Días en Aduana (9-7)': j.diasEnAduana,
        'Ciclo Total (10-1)': j.diasCicloTotal,
      };

      if (!isClientRole) {
        base['Cliente'] = j.cliente;
      }

      if (canSeeFinancials) {
        base['Venta Cotizada (USD)'] = j.valorVentaCotizado ?? 0;
        base['Facturado Real (USD)'] = j.valorFacturadoReal ?? 'Pendiente';
        base['Costo Real (USD)'] = j.costoReal ?? 'Pendiente';
        base['Estado Cobro'] = j.estadoCobro ?? 'PENDIENTE_FACTURAR';
      }

      return base;
    });

    const XLSX = await import('xlsx');
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Embarques ARLOGS');

    const dateTag = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `ARLOGS_Embarques_${viewerRole}_${dateTag}.xlsx`);
  }

  async exportAuditLogs(entries: readonly AuditEntry[]): Promise<void> {
    const rows = entries.map((e) => ({
      'ID Evento': e.id,
      'Fecha y Hora': e.timestamp,
      Usuario: e.usuario,
      Correo: e.email,
      Rol: e.rol,
      Categoría: e.categoria,
      'Entidad / Ref': e.entidad,
      Acción: e.accion,
      'Detalle del Cambio': e.detalle,
    }));

    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Auditoria ARLOGS');

    const dateTag = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `ARLOGS_Auditoria_${dateTag}.xlsx`);
  }
}
