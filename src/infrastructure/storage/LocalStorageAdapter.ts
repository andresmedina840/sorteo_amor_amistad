import { EventConfig, type CurrencyCode } from '../../core/domain/entities/EventConfig';
import { Participant } from '../../core/domain/entities/Participant';
import { DrawPair } from '../../core/domain/entities/DrawPair';

export interface SavedParticipant {
  id: string;
  name: string;
  phone: string;
  giftWish: string;
  familyId: string | null;
  excludedParticipantIds?: string[];
}

export interface SavedEventConfig {
  id: string;
  title: string;
  maxBudget: number;
  currency: CurrencyCode;
  deliveryDateIso: string;
  notes: string;
}

export interface SavedGroupState {
  id: string;
  eventConfig: SavedEventConfig;
  participants: SavedParticipant[];
  pairs: Array<{
    giverId: string;
    receiverId: string;
  }> | null;
  step?: number;
  updatedAt: number;
}

export interface GroupSummary {
  id: string;
  title: string;
  maxBudget: number;
  deliveryDateIso: string;
  participantsCount: number;
  hasDrawn: boolean;
  updatedAt: number;
}

const GROUPS_STORAGE_KEY = 'AMOR_AMISTAD_GROUPS_V2';
const ACTIVE_GROUP_ID_KEY = 'AMOR_AMISTAD_ACTIVE_GROUP_ID';
const LEGACY_STORAGE_KEY = 'AMOR_AMISTAD_APP_STATE_V1';

export class LocalStorageAdapter {
  /**
   * Carga todos los grupos guardados en el almacenamiento local
   */
  public static getAllGroups(): SavedGroupState[] {
    try {
      const raw = localStorage.getItem(GROUPS_STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw) as SavedGroupState[];
      }

      // Migración transparente desde V1 si existe
      const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacyRaw) {
        const legacyParsed = JSON.parse(legacyRaw);
        if (legacyParsed && legacyParsed.eventConfig) {
          const migratedGroup: SavedGroupState = {
            id: legacyParsed.eventConfig.id || 'group_default',
            eventConfig: legacyParsed.eventConfig,
            participants: legacyParsed.participants || [],
            pairs: legacyParsed.pairs || null,
            updatedAt: Date.now(),
          };
          const list = [migratedGroup];
          localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(list));
          localStorage.setItem(ACTIVE_GROUP_ID_KEY, migratedGroup.id);
          return list;
        }
      }
      return [];
    } catch (e) {
      console.warn('Error al cargar grupos:', e);
      return [];
    }
  }

  /**
   * Obtiene la lista de resúmenes de grupos para el selector rápido
   */
  public static getGroupsSummary(): GroupSummary[] {
    const groups = this.getAllGroups();
    return groups.map(g => ({
      id: g.id,
      title: g.eventConfig.title || 'Grupo sin título',
      maxBudget: g.eventConfig.maxBudget || 60000,
      deliveryDateIso: g.eventConfig.deliveryDateIso,
      participantsCount: g.participants?.length || 0,
      hasDrawn: Boolean(g.pairs && g.pairs.length > 0),
      updatedAt: g.updatedAt || Date.now(),
    }));
  }

  /**
   * Guarda o actualiza un grupo específico
   */
  public static saveGroup(
    eventConfig: EventConfig,
    participants: Participant[],
    pairs: DrawPair[] | null,
    step = 1
  ): void {
    try {
      const groups = this.getAllGroups();
      const groupState: SavedGroupState = {
        id: eventConfig.id,
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
        step,
        updatedAt: Date.now(),
      };

      const index = groups.findIndex(g => g.id === eventConfig.id);
      if (index >= 0) {
        groups[index] = groupState;
      } else {
        groups.push(groupState);
      }

      localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(groups));
      localStorage.setItem(ACTIVE_GROUP_ID_KEY, eventConfig.id);
    } catch (e) {
      console.warn('Error al guardar grupo:', e);
    }
  }

  /**
   * Carga un grupo específico por su ID
   */
  public static loadGroup(groupId: string): {
    eventConfig: EventConfig;
    participants: Participant[];
    pairs: DrawPair[] | null;
    step: number;
  } | null {
    try {
      const groups = this.getAllGroups();
      const found = groups.find(g => g.id === groupId);
      if (!found) return null;

      const eventConfig = new EventConfig({
        id: found.eventConfig.id,
        title: found.eventConfig.title,
        maxBudget: found.eventConfig.maxBudget,
        currency: found.eventConfig.currency,
        deliveryDateIso: found.eventConfig.deliveryDateIso,
        notes: found.eventConfig.notes,
      });

      const participants = found.participants.map(
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
      if (found.pairs && found.pairs.length > 0) {
        const participantMap = new Map(participants.map(p => [p.id, p]));
        pairs = found.pairs
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

      return {
        eventConfig,
        participants,
        pairs,
        step: found.step || (pairs && pairs.length > 0 ? 4 : participants.length > 0 ? 2 : 1),
      };
    } catch (e) {
      console.warn('Error al cargar grupo específico:', e);
      return null;
    }
  }

  /**
   * Obtiene el ID del grupo actualmente activo
   */
  public static getActiveGroupId(): string | null {
    try {
      return localStorage.getItem(ACTIVE_GROUP_ID_KEY);
    } catch {
      return null;
    }
  }

  /**
   * Establece el ID del grupo activo
   */
  public static setActiveGroupId(groupId: string): void {
    try {
      localStorage.setItem(ACTIVE_GROUP_ID_KEY, groupId);
    } catch {}
  }

  /**
   * Elimina un grupo específico
   */
  public static deleteGroup(groupId: string): void {
    try {
      const groups = this.getAllGroups().filter(g => g.id !== groupId);
      localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(groups));

      const activeId = this.getActiveGroupId();
      if (activeId === groupId) {
        if (groups.length > 0) {
          localStorage.setItem(ACTIVE_GROUP_ID_KEY, groups[0].id);
        } else {
          localStorage.removeItem(ACTIVE_GROUP_ID_KEY);
        }
      }
    } catch (e) {
      console.warn('Error al eliminar grupo:', e);
    }
  }

  /**
   * Crea un nuevo grupo limpio
   */
  public static createNewGroup(title?: string): {
    eventConfig: EventConfig;
    participants: Participant[];
    pairs: DrawPair[] | null;
  } {
    const defaultDeliveryDate = new Date();
    defaultDeliveryDate.setDate(defaultDeliveryDate.getDate() + 14);
    defaultDeliveryDate.setHours(19, 0, 0, 0);

    const newConfig = new EventConfig({
      id: 'grp_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      title: title || 'Amor y Amistad 2026',
      maxBudget: 60000,
      currency: 'COP',
      deliveryDateIso: defaultDeliveryDate.toISOString(),
      notes: 'Entrega de regalos y compartir especial.',
    });

    this.saveGroup(newConfig, [], null, 1);
    this.setActiveGroupId(newConfig.id);

    return {
      eventConfig: newConfig,
      participants: [],
      pairs: null,
    };
  }

  /**
   * Carga el estado activo para compatibilidad con GameContext
   */
  public static loadState(): {
    eventConfig: EventConfig | null;
    participants: Participant[];
    pairs: DrawPair[] | null;
  } {
    try {
      const activeId = this.getActiveGroupId();
      if (activeId) {
        const loaded = this.loadGroup(activeId);
        if (loaded) {
          return {
            eventConfig: loaded.eventConfig,
            participants: loaded.participants,
            pairs: loaded.pairs,
          };
        }
      }

      const groups = this.getAllGroups();
      if (groups.length > 0) {
        const first = this.loadGroup(groups[0].id);
        if (first) {
          this.setActiveGroupId(groups[0].id);
          return {
            eventConfig: first.eventConfig,
            participants: first.participants,
            pairs: first.pairs,
          };
        }
      }

      return { eventConfig: null, participants: [], pairs: null };
    } catch (e) {
      console.warn('Error al cargar estado desde LocalStorage:', e);
      return { eventConfig: null, participants: [], pairs: null };
    }
  }

  /**
   * Guarda el estado del grupo actual para compatibilidad con GameContext
   */
  public static saveState(
    eventConfig: EventConfig,
    participants: Participant[],
    pairs: DrawPair[] | null,
    step = 1
  ): void {
    this.saveGroup(eventConfig, participants, pairs, step);
  }

  /**
   * Limpia el almacenamiento de grupos y estados anteriores
   */
  public static clearState(): void {
    try {
      localStorage.removeItem(GROUPS_STORAGE_KEY);
      localStorage.removeItem(ACTIVE_GROUP_ID_KEY);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch (e) {
      console.warn('No se pudo limpiar LocalStorage:', e);
    }
  }
}

