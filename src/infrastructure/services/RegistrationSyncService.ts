import { Participant } from '../../core/domain/entities/Participant';
import { EventConfig } from '../../core/domain/entities/EventConfig';

export interface RegistrationInvitePayload {
  eventId: string;
  eventTitle: string;
  maxBudget: number;
  currency: string;
  deliveryDateIso: string;
  notes: string;
}

export interface PlayerRegistrationData {
  eventId: string;
  name: string;
  phone: string;
  giftWish: string;
  registeredAt: number;
}

/**
 * Servicio para generar y procesar enlaces de auto-registro de jugadores
 */
export class RegistrationSyncService {
  constructor() {}

  /**
   * Genera el enlace de invitación para que los jugadores se registren
   */
  public async generateInviteLink(eventConfig: EventConfig, baseUrl: string): Promise<string> {
    const invitePayload: RegistrationInvitePayload = {
      eventId: eventConfig.id,
      eventTitle: eventConfig.title,
      maxBudget: eventConfig.maxBudget,
      currency: eventConfig.currency,
      deliveryDateIso: eventConfig.deliveryDateIso,
      notes: eventConfig.notes,
    };

    // Codificar en Base64 URL-safe con UTF-8
    const json = JSON.stringify(invitePayload);
    const encoded = btoa(encodeURIComponent(json));
    const cleanBaseUrl = baseUrl.split('#')[0].split('?')[0];
    return `${cleanBaseUrl}#registro=${encoded}`;
  }

  /**
   * Decodifica la invitación que abre el jugador
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
   * Genera un token compacto con los datos del jugador registrado para sincronizar
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
