/**
 * Entrada de participante dentro del payload grupal
 * Solo contiene los datos mínimos necesarios para la revelación
 */
export interface GroupRevealEntry {
  /** Nombre del participante (quien regala) */
  giverName: string;
  /** PIN de 4 dígitos para verificar identidad */
  giverPin: string;
  /** Nombre del amigo secreto (a quién le regala) */
  receiverName: string;
  /** Sugerencias o gustos del receptor */
  receiverWish: string;
}

/**
 * Payload grupal contenido en un enlace de revelación compartido.
 * Un ÚNICO enlace para TODOS los participantes del sorteo.
 * Cada participante selecciona su nombre, ingresa su PIN y descubre su asignación.
 */
export interface GroupRevealPayload {
  eventTitle: string;
  maxBudget: number;
  currency: string;
  deliveryDateIso: string;
  notes: string;
  drawTimestamp: number;
  /** Lista de todas las asignaciones del sorteo */
  entries: GroupRevealEntry[];
}

/**
 * Payload contenido en un enlace de revelación secreto individual (legacy)
 */
export interface SecretRevealPayload {
  eventId: string;
  eventTitle: string;
  maxBudget: number;
  currency: string;
  deliveryDateIso: string;
  notes: string;
  giverName: string;
  giverPin: string;
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

  /**
   * Codifica el payload GRUPAL (un solo enlace para todo el sorteo)
   */
  encodeGroupPayload(payload: GroupRevealPayload): Promise<string>;

  /**
   * Decodifica el payload grupal desde el token
   */
  decodeGroupPayload(token: string): Promise<GroupRevealPayload | null>;
}
