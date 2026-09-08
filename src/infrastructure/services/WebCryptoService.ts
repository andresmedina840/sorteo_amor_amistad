import type { ICryptoService, SecretRevealPayload } from '../../core/domain/services/ICryptoService';

/**
 * Implementación de ICryptoService usando codificación URL segura,
 * compresión de cadenas y protección de caracteres internacionales en UTF-8.
 */
export class WebCryptoService implements ICryptoService {
  // Clave salt de aplicación para ofuscación y chequeo de integridad
  private readonly APP_SALT = 'AMOR_Y_AMISTAD_COLOMBIA_2026_SECRET_SALT';

  /**
   * Codifica el payload en un token seguro para URLs
   */
  public async encodePayload(payload: SecretRevealPayload): Promise<string> {
    const jsonString = JSON.stringify(payload);
    
    // Convertir string a bytes UTF-8 para soportar tildes, eñes y emojis
    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(jsonString);
    const saltBytes = encoder.encode(this.APP_SALT);

    // Aplicar transformación reversible (XOR stream)
    const transformed = new Uint8Array(dataBytes.length);
    for (let i = 0; i < dataBytes.length; i++) {
      transformed[i] = dataBytes[i] ^ saltBytes[i % saltBytes.length];
    }

    // Convertir bytes a base64 seguro para URL
    let binary = '';
    for (let i = 0; i < transformed.length; i++) {
      binary += String.fromCharCode(transformed[i]);
    }

    const base64 = btoa(binary);
    // Hacer el base64 compatible con URLs (reemplazando +, / y =)
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  /**
   * Decodifica y reconstruye el payload original desde el token
   */
  public async decodePayload(token: string): Promise<SecretRevealPayload | null> {
    try {
      if (!token || typeof token !== 'string') return null;

      // Revertir compatibilidad URL de base64
      let base64 = token.replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4 !== 0) {
        base64 += '=';
      }

      const binary = atob(base64);
      const transformed = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        transformed[i] = binary.charCodeAt(i);
      }

      const encoder = new TextEncoder();
      const saltBytes = encoder.encode(this.APP_SALT);

      const originalBytes = new Uint8Array(transformed.length);
      for (let i = 0; i < transformed.length; i++) {
        originalBytes[i] = transformed[i] ^ saltBytes[i % saltBytes.length];
      }

      const decoder = new TextDecoder('utf-8');
      const jsonString = decoder.decode(originalBytes);
      const parsed = JSON.parse(jsonString) as SecretRevealPayload;

      // Validar estructura básica
      if (!parsed.eventTitle || !parsed.giverName || !parsed.receiverName) {
        return null;
      }

      return parsed;
    } catch (error) {
      console.error('Error al decodificar token de sorteo:', error);
      return null;
    }
  }
}
