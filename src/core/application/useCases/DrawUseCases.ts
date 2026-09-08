import { Participant } from '../../domain/entities/Participant';
import { EventConfig } from '../../domain/entities/EventConfig';
import { DrawPair } from '../../domain/entities/DrawPair';
import type { IDrawEngine } from '../../domain/services/IDrawEngine';
import type { ICryptoService, SecretRevealPayload } from '../../domain/services/ICryptoService';
import { formatColombiaDateTime } from '../../domain/utils/dateFormatters';

export interface ShareableItem {
  giver: Participant;
  shareUrl: string;
  whatsappUrl: string;
  whatsappMessage: string;
}

/**
 * Casos de uso orquestadores para el Sorteo de Amor y Amistad
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
        receiverName: pair.receiver.name,
        receiverWish: pair.receiver.giftWish,
        drawTimestamp: Date.now(),
      };

      const token = await this.cryptoService.encodePayload(payload);
      // Estructura de URL basada en hash para funcionar en cualquier hosting estático gratuito
      const cleanBaseUrl = baseUrl.split('#')[0].split('?')[0];
      const shareUrl = `${cleanBaseUrl}#revelar=${token}`;

      // Mensaje cordial y festivo para WhatsApp
      const whatsappMessage = 
`💌 *Sorteo de Amor y Amistad: ${eventConfig.title}* 💌

¡Hola *${pair.giver.name}*! 👋
Ya se realizó el sorteo oficial de nuestro juego de Amor y Amistad. 🎁✨

🗓️ *Fecha y hora de entrega (Colombia):*
${formattedDate}

💰 *Valor máximo del regalo:*
${formattedBudget}

${eventConfig.notes ? `📍 *Lugar / Indicaciones:* ${eventConfig.notes}\n` : ''}
🔐 *Descubre a quién te corresponde regalarle en tu sobre secreto:*
${shareUrl}

_(Abre el enlace para descubrir a tu amigo secreto de forma 100% privada)_ ✨`;

      // Generar link de WhatsApp (api.whatsapp.com o wa.me)
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
   * Procesa y descifra el secreto cuando un participante abre su enlace
   */
  public async revealSecret(token: string): Promise<SecretRevealPayload | null> {
    return this.cryptoService.decodePayload(token);
  }
}
