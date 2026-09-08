import { Participant } from '../../core/domain/entities/Participant';
import { EventConfig } from '../../core/domain/entities/EventConfig';
import { SupabaseStorageService } from '../storage/SupabaseStorageService';
import { isSupabaseConfigured } from '../storage/supabaseClient';

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
  phone: string;
  giftWish: string;
  registeredAt: number;
}

const NTFY_BASE_URL = 'https://ntfy.sh';

/**
 * Servicio para sincronización 100% automática y permanente de jugadores
 * con soporte nativo para Supabase (PostgreSQL) y enlaces indestructibles sin vencimiento.
 */
export class RegistrationSyncService {
  /**
   * Crea o asegura la existencia de la sala del grupo en Supabase
   */
  public async createOrGetRoom(eventConfig: EventConfig): Promise<string> {
    if (isSupabaseConfigured()) {
      // Guardar el evento en Supabase
      await SupabaseStorageService.saveGroup(eventConfig, [], null, 1);
      return eventConfig.id;
    }

    return eventConfig.id;
  }

  /**
   * Genera el enlace de invitación PERMANENTE (NUNCA VENCE).
   * - Si Supabase está configurado: usa el ID directo del grupo en Supabase: #registro={groupId}
   * - Si Supabase no está configurado: incluye los datos en Base64 compacto para que funcione sin servidor y sin vencer.
   */
  public async generateInviteLink(eventConfig: EventConfig, baseUrl: string): Promise<string> {
    const cleanBaseUrl = baseUrl.split('#')[0].split('?')[0];

    if (isSupabaseConfigured()) {
      await this.createOrGetRoom(eventConfig);
      return `${cleanBaseUrl}#registro=${eventConfig.id}`;
    }

    // Fallback permanente autónomo (100% libre de vencimiento, todos los datos en el token)
    const payload: RegistrationInvitePayload = {
      eventId: eventConfig.id,
      cloudRoomId: eventConfig.id,
      eventTitle: eventConfig.title,
      maxBudget: eventConfig.maxBudget,
      currency: eventConfig.currency,
      deliveryDateIso: eventConfig.deliveryDateIso,
      notes: eventConfig.notes || '',
    };
    const token = btoa(encodeURIComponent(JSON.stringify(payload)));
    return `${cleanBaseUrl}#registro=${token}`;
  }

  /**
   * Obtiene los datos completos del evento desde Supabase o desde el token autónomo.
   * ¡NUNCA EXPIRA!
   */
  public async fetchEventFromCloud(roomIdOrToken: string): Promise<RegistrationInvitePayload | null> {
    if (!roomIdOrToken) return null;

    // 1. Intentar decodificar como payload Base64 autónomo
    const localDecoded = this.decodeInvite(roomIdOrToken);
    if (localDecoded && localDecoded.eventId) {
      return localDecoded;
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

    return null;
  }

  /**
   * Decodifica la invitación en formato Base64 compacto
   */
  public decodeInvite(token: string): RegistrationInvitePayload | null {
    try {
      if (!token) return null;
      const json = decodeURIComponent(atob(token));
      const parsed = JSON.parse(json);
      if (parsed && (parsed.eventId || parsed.eventTitle)) {
        return parsed as RegistrationInvitePayload;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Determina si un token de registro es un ID directo o un Base64
   */
  public isCloudRoomId(token: string): boolean {
    if (!token) return false;
    try {
      const decoded = decodeURIComponent(atob(token));
      JSON.parse(decoded);
      return false; // Es Base64
    } catch {
      return true; // Es ID directo
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
        giftWish: parsed.giftWish,
      });
    } catch {
      return null;
    }
  }
}
