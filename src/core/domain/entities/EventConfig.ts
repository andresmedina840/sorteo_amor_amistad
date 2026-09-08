import { formatColombiaDateTime } from '../utils/dateFormatters';

/**
 * Monedas soportadas con símbolos y separadores
 */
export type CurrencyCode = 'COP' | 'USD' | 'EUR' | 'MXN';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  label: string;
}

export const SUPPORTED_CURRENCIES: CurrencyConfig[] = [
  { code: 'COP', symbol: '$', label: 'Pesos Colombianos (COP)' },
  { code: 'USD', symbol: 'US$', label: 'Dólares Americanos (USD)' },
  { code: 'EUR', symbol: '€', label: 'Euros (EUR)' },
  { code: 'MXN', symbol: 'Mex$', label: 'Pesos Mexicanos (MXN)' },
];

/**
 * Entidad de Dominio: Configuración del Evento de Amor y Amistad
 */
export class EventConfig {
  public readonly id: string;
  public title: string;
  public maxBudget: number;
  public currency: CurrencyCode;
  public deliveryDateIso: string;
  public notes: string;

  constructor(params: {
    id?: string;
    title: string;
    maxBudget: number;
    currency?: CurrencyCode;
    deliveryDateIso: string;
    notes?: string;
  }) {
    const trimmedTitle = params.title.trim();
    if (!trimmedTitle) {
      throw new Error('El título o nombre del evento es obligatorio.');
    }
    if (params.maxBudget < 0) {
      throw new Error('El valor del regalo no puede ser negativo.');
    }

    this.id = params.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `evt_${Date.now()}`);
    this.title = trimmedTitle;
    this.maxBudget = params.maxBudget;
    this.currency = params.currency || 'COP';
    this.deliveryDateIso = params.deliveryDateIso;
    this.notes = params.notes ? params.notes.trim() : '';
  }

  /**
   * Retorna la fecha y hora de entrega en formato colombiano:
   * dd/mm/yyyy hh:mm:ss am/pm
   */
  public getFormattedDeliveryDate(): string {
    return formatColombiaDateTime(this.deliveryDateIso);
  }

  /**
   * Retorna el presupuesto formateado con separadores de miles y símbolo
   */
  public getFormattedBudget(): string {
    const curr = SUPPORTED_CURRENCIES.find(c => c.code === this.currency) || SUPPORTED_CURRENCIES[0];
    const formattedNumber = new Intl.NumberFormat('es-CO', {
      maximumFractionDigits: 0,
    }).format(this.maxBudget);
    return `${curr.symbol} ${formattedNumber} ${this.currency}`;
  }

  /**
   * Genera una copia con campos modificados
   */
  public copyWith(changes: Partial<{
    title: string;
    maxBudget: number;
    currency: CurrencyCode;
    deliveryDateIso: string;
    notes: string;
  }>): EventConfig {
    return new EventConfig({
      id: this.id,
      title: changes.title ?? this.title,
      maxBudget: changes.maxBudget ?? this.maxBudget,
      currency: changes.currency ?? this.currency,
      deliveryDateIso: changes.deliveryDateIso ?? this.deliveryDateIso,
      notes: changes.notes ?? this.notes,
    });
  }
}
