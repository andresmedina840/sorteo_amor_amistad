import { Participant } from '../../core/domain/entities/Participant';
import { EventConfig } from '../../core/domain/entities/EventConfig';

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

interface CloudRoomData {
  eventId: string;
  title: string;
  players: PlayerRegistrationData[];
}

interface CloudObjectResponse {
  id: string;
  name: string;
  data: CloudRoomData;
}

const CLOUD_API_URL = 'https://api.restful-api.dev/objects';
const NTFY_BASE_URL = 'https://ntfy.sh';
const ROOM_STORAGE_PREFIX = 'AMOR_AMISTAD_ROOM_';

/**
 * Servicio para sincronización 100% automática de jugadores en tiempo real
 */
export class RegistrationSyncService {
  /**
   * Crea o recupera una sala en la nube para el evento
   */
  public async createOrGetRoom(eventConfig: EventConfig): Promise<string> {
    const storageKey = `${ROOM_STORAGE_PREFIX}${eventConfig.id}`;
    const cachedRoomId = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null;

    if (cachedRoomId) {
      try {
        const verifyRes = await fetch(`${CLOUD_API_URL}/${cachedRoomId}`);
        if (verifyRes.ok) {
          return cachedRoomId;
        }
      } catch (err) {
        console.warn('Error verificando sala existente, creando nueva...', err);
      }
    }

    // Crear nueva sala en la nube
    try {
      const response = await fetch(CLOUD_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `sorteo_amoryamistad_${eventConfig.id}`,
          data: {
            eventId: eventConfig.id,
            title: eventConfig.title,
            players: [],
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data: CloudObjectResponse = await response.json();
      if (typeof window !== 'undefined') {
        localStorage.setItem(storageKey, data.id);
      }
      return data.id;
    } catch (error) {
      console.error('Error al inicializar sala en la nube:', error);
      // Fallback a un ID determinista
      return `room_${eventConfig.id.replace(/[^a-zA-Z0-9]/g, '')}`;
    }
  }

  /**
   * Genera el enlace de invitación para que los jugadores se registren
   */
  public async generateInviteLink(eventConfig: EventConfig, baseUrl: string): Promise<string> {
    const cloudRoomId = await this.createOrGetRoom(eventConfig);

    const invitePayload: RegistrationInvitePayload = {
      eventId: eventConfig.id,
      cloudRoomId,
      eventTitle: eventConfig.title,
      maxBudget: eventConfig.maxBudget,
      currency: eventConfig.currency,
      deliveryDateIso: eventConfig.deliveryDateIso,
      notes: eventConfig.notes,
    };

    const json = JSON.stringify(invitePayload);
    const encoded = btoa(encodeURIComponent(json));
    const cleanBaseUrl = baseUrl.split('#')[0].split('?')[0];
    return `${cleanBaseUrl}#registro=${encoded}`;
  }

  /**
   * Decodifica la invitación que abre el jugador en su celular
   */
  public decodeInvite(token: string): RegistrationInvitePayload | null {
    try {
      if (!token) return null;
      const json = decodeURIComponent(atob(token));
      return JSON.parse(json) as RegistrationInvitePayload;
    } catch {
      return null;
    }
  }

  /**
   * Registra automáticamente al jugador en la nube con reintentos para 100% fiabilidad
   */
  public async registerPlayerInCloud(
    cloudRoomId: string,
    player: PlayerRegistrationData,
    maxRetries = 3
  ): Promise<boolean> {
    if (!cloudRoomId) return false;

    // Disparar notificación push/SSE inmediata en ntfy.sh (no bloqueante)
    try {
      fetch(`${NTFY_BASE_URL}/sorteo_amoryamistad_${cloudRoomId}`, {
        method: 'POST',
        headers: { Title: 'Nuevo Jugador' },
        body: JSON.stringify(player),
        keepalive: true,
      }).catch(() => {});
    } catch {}

    // Persistir en la sala de RESTful API con reintentos exponenciales
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const getRes = await fetch(`${CLOUD_API_URL}/${cloudRoomId}`);
        if (!getRes.ok) {
          throw new Error(`GET failed status ${getRes.status}`);
        }

        const roomData: CloudObjectResponse = await getRes.json();
        const existingPlayers = roomData.data?.players || [];

        // Evitar duplicados exactos por nombre y teléfono
        const alreadyExists = existingPlayers.some(
          p => p.name.trim().toLowerCase() === player.name.trim().toLowerCase() &&
               (!player.phone || p.phone === player.phone)
        );

        if (!alreadyExists) {
          existingPlayers.push(player);
        }

        const putRes = await fetch(`${CLOUD_API_URL}/${cloudRoomId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: roomData.name,
            data: {
              ...roomData.data,
              players: existingPlayers,
            },
          }),
          keepalive: true,
        });

        if (putRes.ok) {
          return true;
        }
      } catch (err) {
        console.warn(`Intento ${attempt}/${maxRetries} de registro fallido:`, err);
        if (attempt < maxRetries) {
          await new Promise(res => setTimeout(res, attempt * 500));
        }
      }
    }

    return false;
  }

  /**
   * Obtiene la lista actual de jugadores registrados en la sala de la nube
   */
  public async getCloudPlayers(cloudRoomId: string): Promise<PlayerRegistrationData[]> {
    if (!cloudRoomId) return [];

    try {
      const response = await fetch(`${CLOUD_API_URL}/${cloudRoomId}`);
      if (!response.ok) return [];

      const data: CloudObjectResponse = await response.json();
      return data.data?.players || [];
    } catch (err) {
      console.warn('Error al consultar jugadores en la nube:', err);
      return [];
    }
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
