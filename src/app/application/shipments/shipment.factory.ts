import { Quotation, ServicePrefix, ServiceType, ShipmentJob } from '../../models/shipment.model';

export class ShipmentFactory {
  static nextRefForPrefix(existingJobs: readonly ShipmentJob[], prefix: ServicePrefix): string {
    const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`^${escaped}(\\d+)-\\d{4}$`, 'i');
    const maxSeq = existingJobs.reduce((max, j) => {
      const m = regex.exec(j.refArlogs);
      return m ? Math.max(max, Number(m[1])) : max;
    }, 0);
    const currentYear = new Date().getFullYear();
    return `${prefix}${maxSeq + 1}-${currentYear}`;
  }

  static buildFromApprovedQuotation(
    quote: Quotation,
    newRef: string,
    todayIso: string,
  ): ShipmentJob {
    return {
      refArlogs: newRef,
      qrCode: quote.id,
      cliente: quote.cliente,
      clienteId: quote.clienteId,
      servicio: quote.servicio,
      serviceCode: quote.serviceCode,
      aduanaPorArlogs: quote.aduanaPorArlogs,
      shipper: quote.shipper,
      paisOrigen: quote.paisOrigen,
      puertoEmbarque: quote.puertoEmbarque,
      incoterm: quote.incoterm,
      ordenesCompra: quote.ordenesCompra,
      guiaMaster: '',
      hawbHbl: '',
      contenedor: '',
      pesoOrigen: null,
      pesoRecibido: null,
      h1_asignacion: todayIso,
      h2_respuestaShipper: null,
      h3_cargaLista: null,
      h4_zarpeAtd: null,
      h5_arriboAta: null,
      h6_pesoRecibido: null,
      h7_declaracion: null,
      h8_pagoLiquidacion: null,
      h9_salidaAutorizada: null,
      h10_informeSalida: null,
      valorVentaCotizado: quote.valorVentaCotizado ?? 0,
      costoEstimadoCotizado: quote.costoEstimadoCotizado ?? 0,
      plazoPagoDias: quote.plazoPagoDias ?? 0,
      estadoCobro: 'PENDIENTE_FACTURAR',
    };
  }

  static buildFromDirectInput(
    data: {
      clienteId: string;
      cliente: string;
      servicio: ServiceType;
      serviceCode: ServicePrefix;
      aduanaPorArlogs: 'SI' | 'NO' | 'N/A';
      shipper: string;
      paisOrigen: string;
      puertoEmbarque: string;
      incoterm: string;
      ordenesCompra: string[];
      guiaMaster?: string;
      contenedor?: string;
      pesoOrigen?: number | null;
    },
    newRef: string,
    todayIso: string,
  ): ShipmentJob {
    return {
      refArlogs: newRef,
      qrCode: newRef,
      cliente: data.cliente,
      clienteId: data.clienteId,
      servicio: data.servicio,
      serviceCode: data.serviceCode,
      aduanaPorArlogs: data.aduanaPorArlogs,
      shipper: data.shipper.trim(),
      paisOrigen: data.paisOrigen.trim().toUpperCase(),
      puertoEmbarque: data.puertoEmbarque.trim().toUpperCase(),
      incoterm: data.incoterm,
      ordenesCompra: data.ordenesCompra,
      guiaMaster: data.guiaMaster?.trim() ?? '',
      hawbHbl: '',
      contenedor: data.contenedor?.trim() ?? '',
      pesoOrigen: data.pesoOrigen && Number(data.pesoOrigen) > 0 ? Number(data.pesoOrigen) : null,
      pesoRecibido: null,
      h1_asignacion: todayIso,
      h2_respuestaShipper: null,
      h3_cargaLista: null,
      h4_zarpeAtd: null,
      h5_arriboAta: null,
      h6_pesoRecibido: null,
      h7_declaracion: null,
      h8_pagoLiquidacion: null,
      h9_salidaAutorizada: null,
      h10_informeSalida: null,
    };
  }
}
