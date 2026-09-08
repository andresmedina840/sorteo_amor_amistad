import { EventConfig, type CurrencyCode } from '../../core/domain/entities/EventConfig';
import { Participant } from '../../core/domain/entities/Participant';
import { DrawPair } from '../../core/domain/entities/DrawPair';

interface SavedParticipant {
  id: string;
  name: string;
  phone: string;
  giftWish: string;
  familyId: string | null;
  excludedParticipantIds?: string[];
}

interface SavedState {
  eventConfig: {
    id: string;
    title: string;
    maxBudget: number;
    currency: CurrencyCode;
    deliveryDateIso: string;
    notes: string;
  };
  participants: SavedParticipant[];
  pairs: Array<{
    giverId: string;
    receiverId: string;
  }> | null;
}

const STORAGE_KEY = 'AMOR_AMISTAD_APP_STATE_V1';

export class LocalStorageAdapter {
  public static saveState(
    eventConfig: EventConfig,
    participants: Participant[],
    pairs: DrawPair[] | null
  ): void {
    try {
      const state: SavedState = {
        eventConfig: {
          id: eventConfig.id,
          title: eventConfig.title,
          maxBudget: eventConfig.maxBudget,
          currency: eventConfig.currency,
          deliveryDateIso: eventConfig.deliveryDateIso,
          notes: eventConfig.notes,
        },
        participants: participants.map(p => ({
          id: p.id,
          name: p.name,
          phone: p.phone,
          giftWish: p.giftWish,
          familyId: p.familyId,
          excludedParticipantIds: p.excludedParticipantIds,
        })),
        pairs: pairs
          ? pairs.map(pair => ({
              giverId: pair.giver.id,
              receiverId: pair.receiver.id,
            }))
          : null,
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('No se pudo guardar el estado en LocalStorage:', e);
    }
  }

  public static loadState(): {
    eventConfig: EventConfig | null;
    participants: Participant[];
    pairs: DrawPair[] | null;
  } {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return { eventConfig: null, participants: [], pairs: null };
      }

      const parsed: SavedState = JSON.parse(raw);

      const eventConfig = new EventConfig({
        id: parsed.eventConfig.id,
        title: parsed.eventConfig.title,
        maxBudget: parsed.eventConfig.maxBudget,
        currency: parsed.eventConfig.currency,
        deliveryDateIso: parsed.eventConfig.deliveryDateIso,
        notes: parsed.eventConfig.notes,
      });

      const participants = parsed.participants.map(
        p => new Participant({
          id: p.id,
          name: p.name,
          phone: p.phone,
          giftWish: p.giftWish,
          familyId: p.familyId,
          excludedParticipantIds: p.excludedParticipantIds || [],
        })
      );

      let pairs: DrawPair[] | null = null;
      if (parsed.pairs && parsed.pairs.length > 0) {
        const participantMap = new Map(participants.map(p => [p.id, p]));
        pairs = parsed.pairs
          .map(pairItem => {
            const giver = participantMap.get(pairItem.giverId);
            const receiver = participantMap.get(pairItem.receiverId);
            if (giver && receiver) {
              return new DrawPair(giver, receiver);
            }
            return null;
          })
          .filter((p): p is DrawPair => p !== null);
      }

      return { eventConfig, participants, pairs };
    } catch (e) {
      console.warn('Error al cargar estado desde LocalStorage:', e);
      return { eventConfig: null, participants: [], pairs: null };
    }
  }

  public static clearState(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn('No se pudo limpiar LocalStorage:', e);
    }
  }
}
