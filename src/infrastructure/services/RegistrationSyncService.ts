import { Participant } from '../../core/domain/entities/Participant';
import { EventConfig } from '../../core/domain/entities/EventConfig';
import { SupabaseStorageService } from '../storage/SupabaseStorageService';
import { isSupabaseConfigured } from '../storage/supabaseClient';
import { LocalStorageAdapter } from '../storage/LocalStorageAdapter';

export interface RegistrationInvitePayload {
  eventId: string;
  cloudRoomId: string;
  eventTitle: string;
  maxBudget: number;
  currency: string;
  deliveryDateIso: string;
  notes: string;
}

export interface PlayerRegistrationData {
  id?: string;
  eventId: string;
  name: string;
  phone?: string;
  pin?: string;
  giftWish: string;
  registeredAt: number;
}

const NTFY_BASE_URL = 'https://ntfy.sh';

/**
 * Codificador y decodificador de URL ultra-compacto para evitar que WhatsApp
 * trunque enlaces con "... Leer más".
 */
export class RegistrationSyncService {
  /**
   * Crea o asegura la existencia de la sala del grupo en Supabase
   */
  public async createOrGetRoom(eventConfig: EventConfig): Promise<string> {
    if (isSupabaseConfigured()) {
      await SupabaseStorageService.saveGroup(eventConfig, [], null, 1);
      return eventConfig.id;
    }
    return eventConfig.id;
  }

  /**
   * Genera un enlace de invitación ULTRA-CORTO y PERMANENTE:
   * 1. Si Supabase está conectado: usa #registro={groupId} (ej: #registro=grp_abc123) (~65 caracteres)
   * 2. Si es autónomo/offline: usa formato ultra-compacto #registro=c_{base64url} (~120 caracteres)
   * ¡En ambos casos WhatsApp NUNCA trunca el enlace con "... Leer más"!
   */
  public async generateInviteLink(eventConfig: EventConfig, baseUrl: string): Promise<string> {
    const cleanBaseUrl = baseUrl.split('#')[0].split('?')[0];

    if (isSupabaseConfigured()) {
      await this.createOrGetRoom(eventConfig);
      return `${cleanBaseUrl}#registro=${eventConfig.id}`;
    }

    // Formato ultra-compacto seguro para WhatsApp
    const shortToken = this.encodeCompactPayload(eventConfig);
    return `${cleanBaseUrl}#registro=${shortToken}`;
  }

  /**
   * Codifica el evento en un token ultra-compacto de menos de 100 caracteres
   */
  public encodeCompactPayload(eventConfig: EventConfig): string {
    const budgetK = Math.round(eventConfig.maxBudget / 1000);
    // Tomar solo YYYY-MM-DDTHH:mm para ahorrar espacio
    const shortDate = eventConfig.deliveryDateIso.substring(0, 16);
    const shortId = eventConfig.id.length > 12 ? eventConfig.id.substring(0, 10) : eventConfig.id;

    const compactObj = {
      i: shortId,
      t: eventConfig.title,
      b: budgetK,
      d: shortDate,
      n: eventConfig.notes ? eventConfig.notes.substring(0, 60) : '',
    };

    try {
      const json = JSON.stringify(compactObj);
      const b64 = btoa(unescape(encodeURIComponent(json)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      return `c_${b64}`;
    } catch {
      // Fallback estándar si falla
      return btoa(JSON.stringify(compactObj));
    }
  }

  /**
   * Obtiene los datos del evento desde el token:
   * - Soporta formato ultra-compacto nuevo (c_...)
   * - Soporta ID de Supabase
   * - Soporta ID de LocalStorage
   * - Soporta formato Base64 legacy
   */
  public async fetchEventFromCloud(roomIdOrToken: string): Promise<RegistrationInvitePayload | null> {
    if (!roomIdOrToken) return null;

    // 1. Intentar decodificar como token compacto o Base64
    const decoded = this.decodeInvite(roomIdOrToken);
    if (decoded && (decoded.eventId || decoded.eventTitle)) {
      return decoded;
    }

    // 2. Si Supabase está configurado, consultar en la tabla sorteo_groups
    if (isSupabaseConfigured()) {
      const groupData = await SupabaseStorageService.loadGroup(roomIdOrToken);
      if (groupData) {
        return {
          eventId: groupData.eventConfig.id,
          cloudRoomId: groupData.eventConfig.id,
          eventTitle: groupData.eventConfig.title,
          maxBudget: groupData.eventConfig.maxBudget,
          currency: groupData.eventConfig.currency,
          deliveryDateIso: groupData.eventConfig.deliveryDateIso,
          notes: groupData.eventConfig.notes,
        };
      }
    }

    // 3. Fallback en LocalStorage (por si se abre en el mismo navegador)
    const localGroup = LocalStorageAdapter.loadGroup(roomIdOrToken);
    if (localGroup) {
      return {
        eventId: localGroup.eventConfig.id,
        cloudRoomId: localGroup.eventConfig.id,
        eventTitle: localGroup.eventConfig.title,
        maxBudget: localGroup.eventConfig.maxBudget,
        currency: localGroup.eventConfig.currency,
        deliveryDateIso: localGroup.eventConfig.deliveryDateIso,
        notes: localGroup.eventConfig.notes,
      };
    }

    return null;
  }

  /**
   * Decodifica la invitación tolerando formatos compactos, Base64URL y Base64 legacy
   */
  public decodeInvite(token: string): RegistrationInvitePayload | null {
    try {
      if (!token) return null;
      let cleanToken = token.trim();

      // Caso 1: Formato ultra-compacto c_{base64url}
      if (cleanToken.startsWith('c_')) {
        const rawB64 = cleanToken.substring(2).replace(/-/g, '+').replace(/_/g, '/');
        // Rellenar padding Base64 si falta
        const pad = rawB64.length % 4;
        const paddedB64 = pad ? rawB64 + '='.repeat(4 - pad) : rawB64;
        const json = decodeURIComponent(escape(atob(paddedB64)));
        const parsed = JSON.parse(json);

        if (parsed && parsed.t) {
          const budget = typeof parsed.b === 'number' ? parsed.b * 1000 : 60000;
          let dateIso = new Date().toISOString();
          if (parsed.d) {
            dateIso = parsed.d.length <= 16 ? `${parsed.d}:00.000Z` : parsed.d;
          }

          return {
            eventId: parsed.i || 'grp_default',
            cloudRoomId: parsed.i || 'grp_default',
            eventTitle: parsed.t,
            maxBudget: budget,
            currency: 'COP',
            deliveryDateIso: dateIso,
            notes: parsed.n || '',
          };
        }
      }

      // Caso 2: Formato Base64 legacy
      // Restaurar padding si fue truncado
      const pad = cleanToken.length % 4;
      if (pad) {
        cleanToken = cleanToken + '='.repeat(4 - pad);
      }

      let rawStr = '';
      try {
        rawStr = decodeURIComponent(atob(cleanToken));
      } catch {
        rawStr = atob(cleanToken);
      }

      // Si tiene caracteres URL encoded adicionales
      if (rawStr.startsWith('%7B') || rawStr.includes('%22')) {
        rawStr = decodeURIComponent(rawStr);
      }

      const parsed = JSON.parse(rawStr);
      if (parsed && (parsed.eventId || parsed.eventTitle || parsed.t)) {
        return {
          eventId: parsed.eventId || parsed.i || 'grp_default',
          cloudRoomId: parsed.cloudRoomId || parsed.eventId || parsed.i || 'grp_default',
          eventTitle: parsed.eventTitle || parsed.t || 'Amor y Amistad 2026',
          maxBudget: parsed.maxBudget || (parsed.b ? parsed.b * 1000 : 60000),
          currency: parsed.currency || 'COP',
          deliveryDateIso: parsed.deliveryDateIso || parsed.d || new Date().toISOString(),
          notes: parsed.notes || parsed.n || '',
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Determina si un token es un ID o un payload codificado
   */
  public isCloudRoomId(token: string): boolean {
    if (!token) return false;
    if (token.startsWith('c_')) return false;
    try {
      const decoded = atob(token);
      JSON.parse(decoded);
      return false;
    } catch {
      return true;
    }
  }

  /**
   * Registra automáticamente al jugador en Supabase y emite notificación push/SSE
   */
  public async registerPlayerInCloud(
    cloudRoomId: string,
    player: PlayerRegistrationData
  ): Promise<boolean> {
    if (!cloudRoomId) return false;

    // 1. Enviar notificación push/SSE vía ntfy.sh (en vivo)
    try {
      fetch(`${NTFY_BASE_URL}/sorteo_amoryamistad_${cloudRoomId}`, {
        method: 'POST',
        headers: { Title: 'Nuevo Jugador' },
        body: JSON.stringify(player),
        keepalive: true,
      }).catch(() => {});
    } catch {}

    // 2. Si Supabase está configurado, persistir de forma definitiva en la base de datos
    if (isSupabaseConfigured()) {
      const ok = await SupabaseStorageService.registerParticipant(cloudRoomId, {
        id: player.id,
        name: player.name,
        phone: player.phone,
        pin: player.pin,
        giftWish: player.giftWish,
      });
      return ok;
    }

    return true;
  }

  /**
   * Obtiene la lista de jugadores registrados desde Supabase
   */
  public async getCloudPlayers(cloudRoomId: string): Promise<PlayerRegistrationData[]> {
    if (!cloudRoomId) return [];

    if (isSupabaseConfigured()) {
      const participants = await SupabaseStorageService.getParticipants(cloudRoomId);
      return participants.map(p => ({
        id: p.id,
        eventId: cloudRoomId,
        name: p.name,
        phone: p.phone,
        pin: p.pin,
        giftWish: p.giftWish,
        registeredAt: Date.now(),
      }));
    }

    return [];
  }

  /**
   * Genera un token compacto con los datos del jugador registrado
   */
  public encodePlayerData(data: PlayerRegistrationData): string {
    const json = JSON.stringify(data);
    return btoa(encodeURIComponent(json));
  }

  /**
   * Decodifica un jugador para agregarlo a la lista del organizador
   */
  public decodePlayerData(token: string): Participant | null {
    try {
      if (!token) return null;
      const json = decodeURIComponent(atob(token));
      const parsed = JSON.parse(json) as PlayerRegistrationData;
      return new Participant({
        name: parsed.name,
        phone: parsed.phone,
        pin: parsed.pin,
        giftWish: parsed.giftWish,
      });
    } catch {
      return null;
    }
  }
}
