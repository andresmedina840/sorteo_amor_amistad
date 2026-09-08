import { Participant } from '../../domain/entities/Participant';
import { EventConfig } from '../../domain/entities/EventConfig';
import { DrawPair } from '../../domain/entities/DrawPair';
import type { IDrawEngine } from '../../domain/services/IDrawEngine';
import type { ICryptoService, SecretRevealPayload, GroupRevealPayload, GroupRevealEntry } from '../../domain/services/ICryptoService';
import { formatColombiaDateTime } from '../../domain/utils/dateFormatters';

export interface ShareableItem {
  giver: Participant;
  shareUrl: string;
  whatsappUrl: string;
  whatsappMessage: string;
}

/**
 * Resultado del enlace grupal único: URL + mensaje de WhatsApp
 */
export interface GroupShareResult {
  shareUrl: string;
  whatsappUrl: string;
  whatsappMessage: string;
}

/**
 * Casos de uso orquestadores para el Sorteo de Amor y Amistad.
 * Aplica el principio de Inversión de Dependencias (DIP) inyectando
 * las abstracciones IDrawEngine e ICryptoService.
 */
export class DrawUseCases {
  private readonly drawEngine: IDrawEngine;
  private readonly cryptoService: ICryptoService;

  constructor(
    drawEngine: IDrawEngine,
    cryptoService: ICryptoService
  ) {
    this.drawEngine = drawEngine;
    this.cryptoService = cryptoService;
  }

  /**
   * Ejecuta el sorteo aplicando las restricciones de familiares y no auto-asignación
   */
  public executeDraw(participants: Participant[]): DrawPair[] {
    return this.drawEngine.execute(participants);
  }

  /**
   * Genera UN SOLO enlace compartido para TODO el grupo.
   * Todos los participantes abren el mismo enlace, seleccionan su nombre,
   * ingresan su PIN de 4 dígitos y descubren a su amigo secreto.
   */
  public async generateGroupShareLink(
    pairs: DrawPair[],
    eventConfig: EventConfig,
    baseUrl: string
  ): Promise<GroupShareResult> {
    const entries: GroupRevealEntry[] = pairs.map(pair => ({
      giverName: pair.giver.name,
      giverPin: pair.giver.pin,
      receiverName: pair.receiver.name,
      receiverWish: pair.receiver.giftWish,
    }));

    const payload: GroupRevealPayload = {
      eventTitle: eventConfig.title,
      maxBudget: eventConfig.maxBudget,
      currency: eventConfig.currency,
      deliveryDateIso: eventConfig.deliveryDateIso,
      notes: eventConfig.notes,
      drawTimestamp: Date.now(),
      entries,
    };

    const token = await this.cryptoService.encodeGroupPayload(payload);
    const cleanBaseUrl = baseUrl.split('#')[0].split('?')[0];
    const shareUrl = `${cleanBaseUrl}#sorteo=${token}`;

    const formattedDate = formatColombiaDateTime(eventConfig.deliveryDateIso);
    const formattedBudget = eventConfig.getFormattedBudget();

    const whatsappMessage =
`💌 *Sorteo de Amor y Amistad: ${eventConfig.title}* 💌

¡Ya se realizó el sorteo oficial de nuestro juego de Amor y Amistad! 🎁✨

🗓️ *Fecha y hora de entrega (Colombia):*
${formattedDate}

💰 *Valor máximo del regalo:*
${formattedBudget}

${eventConfig.notes ? `📍 *Lugar / Indicaciones:* ${eventConfig.notes}\n` : ''}🔐 *Abre tu sobre digital aquí (Enlace Único):*
${shareUrl}

👉 *Pasos para descubrir a tu amigo secreto:*
1. Abre el enlace arriba.
2. Selecciona tu nombre de la lista.
3. Ingresa tu PIN secreto de 4 dígitos.
4. ¡Descubre a quién te tocó regalarle! 🤫✨`;

    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappMessage)}`;

    return { shareUrl, whatsappUrl, whatsappMessage };
  }

  /**
   * Genera los enlaces individuales y los enlaces directos para enviar por WhatsApp
   */
  public async generateShareableLinks(
    pairs: DrawPair[],
    eventConfig: EventConfig,
    baseUrl: string
  ): Promise<ShareableItem[]> {
    const items: ShareableItem[] = [];
    const formattedDate = formatColombiaDateTime(eventConfig.deliveryDateIso);
    const formattedBudget = eventConfig.getFormattedBudget();

    for (const pair of pairs) {
      const payload: SecretRevealPayload = {
        eventId: eventConfig.id,
        eventTitle: eventConfig.title,
        maxBudget: eventConfig.maxBudget,
        currency: eventConfig.currency,
        deliveryDateIso: eventConfig.deliveryDateIso,
        notes: eventConfig.notes,
        giverName: pair.giver.name,
        giverPin: pair.giver.pin,
        receiverName: pair.receiver.name,
        receiverWish: pair.receiver.giftWish,
        drawTimestamp: Date.now(),
      };

      const token = await this.cryptoService.encodePayload(payload);
      const cleanBaseUrl = baseUrl.split('#')[0].split('?')[0];
      const shareUrl = `${cleanBaseUrl}#revelar=${token}`;

      const whatsappMessage =
`💌 *Sorteo de Amor y Amistad: ${eventConfig.title}* 💌

¡Hola *${pair.giver.name}*! 👋
Ya se realizó el sorteo oficial de nuestro juego de Amor y Amistad. 🎁✨

🗓️ *Fecha y hora de entrega (Colombia):*
${formattedDate}

💰 *Valor máximo del regalo:*
${formattedBudget}

${eventConfig.notes ? `📍 *Lugar / Indicaciones:* ${eventConfig.notes}\n` : ''}🔐 *Tu sobre secreto personal:*
${shareUrl}

🔑 *Tu PIN secreto de acceso:* ${pair.giver.pin}

_(Abre tu enlace, digita tu PIN secreto de 4 dígitos y descubre a tu amigo secreto de forma 100% privada)_ ✨`;

      let phoneParam = '';
      if (pair.giver.phone) {
        const cleanedPhone = pair.giver.phone.replace(/\D/g, '');
        if (cleanedPhone) {
          phoneParam = `phone=${cleanedPhone}&`;
        }
      }

      const whatsappUrl = `https://api.whatsapp.com/send?${phoneParam}text=${encodeURIComponent(whatsappMessage)}`;

      items.push({
        giver: pair.giver,
        shareUrl,
        whatsappUrl,
        whatsappMessage,
      });
    }

    return items;
  }

  /**
   * Procesa y descifra el secreto cuando un participante abre su enlace individual
   */
  public async revealSecret(token: string): Promise<SecretRevealPayload | null> {
    return this.cryptoService.decodePayload(token);
  }
}
