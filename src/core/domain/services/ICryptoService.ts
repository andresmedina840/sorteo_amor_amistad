/**
 * Payload contenido en un enlace de revelación secreto
 */
export interface SecretRevealPayload {
  eventId: string;
  eventTitle: string;
  maxBudget: number;
  currency: string;
  deliveryDateIso: string;
  notes: string;
  giverName: string;
  receiverName: string;
  receiverWish: string;
  drawTimestamp: number;
}

/**
 * Interfaz para el servicio de empaquetado y cifrado seguro de secretos
 */
export interface ICryptoService {
  /**
   * Cifra o codifica de forma segura el secreto para incluirlo en un enlace URL
   */
  encodePayload(payload: SecretRevealPayload): Promise<string>;

  /**
   * Decodifica y valida el payload recibido desde la URL
   */
  decodePayload(token: string): Promise<SecretRevealPayload | null>;
}
