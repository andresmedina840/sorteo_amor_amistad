import { getSupabaseClient } from './supabaseClient';
import { EventConfig } from '../../core/domain/entities/EventConfig';
import { Participant } from '../../core/domain/entities/Participant';
import { DrawPair } from '../../core/domain/entities/DrawPair';

export interface SupabaseGroupRow {
  id: string;
  title: string;
  max_budget: number;
  currency: string;
  delivery_date_iso: string;
  notes: string;
  pairs: Array<{ giverId: string; receiverId: string }> | null;
  step: number;
  created_at?: string;
  updated_at?: string;
}

export interface SupabaseParticipantRow {
  id: string;
  group_id: string;
  name: string;
  phone: string;
  pin: string;
  gift_wish: string;
  family_id: string | null;
  excluded_participant_ids: string[];
  created_at?: string;
}

export class SupabaseStorageService {
  /**
   * Guarda o actualiza un grupo completo en Supabase
   */
  public static async saveGroup(
    eventConfig: EventConfig,
    participants: Participant[],
    pairs: DrawPair[] | null,
    step = 1
  ): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;

    try {
      const groupData: Partial<SupabaseGroupRow> = {
        id: eventConfig.id,
        title: eventConfig.title,
        max_budget: eventConfig.maxBudget,
        currency: eventConfig.currency,
        delivery_date_iso: eventConfig.deliveryDateIso,
        notes: eventConfig.notes,
        pairs: pairs
          ? pairs.map(p => ({
              giverId: p.giver.id,
              receiverId: p.receiver.id,
            }))
          : null,
        step,
        updated_at: new Date().toISOString(),
      };

      const { error: groupError } = await client
        .from('sorteo_groups')
        .upsert(groupData, { onConflict: 'id' });

      if (groupError) {
        console.warn('Error al guardar grupo en Supabase:', groupError);
        return false;
      }

      // Si hay participantes, sincronizarlos
      if (participants.length > 0) {
        const participantRows: Partial<SupabaseParticipantRow>[] = participants.map(p => ({
          id: p.id,
          group_id: eventConfig.id,
          name: p.name,
          phone: p.phone,
          pin: p.pin,
          gift_wish: p.giftWish,
          family_id: p.familyId,
          excluded_participant_ids: p.excludedParticipantIds,
        }));

        const { error: partError } = await client
          .from('sorteo_participants')
          .upsert(participantRows, { onConflict: 'id' });

        if (partError) {
          console.warn('Error al guardar participantes en Supabase:', partError);
        }
      }

      return true;
    } catch (err) {
      console.warn('Excepción al guardar en Supabase:', err);
      return false;
    }
  }

  /**
   * Carga un grupo específico y sus participantes desde Supabase
   */
  public static async loadGroup(groupId: string): Promise<{
    eventConfig: EventConfig;
    participants: Participant[];
    pairs: DrawPair[] | null;
    step: number;
  } | null> {
    const client = getSupabaseClient();
    if (!client || !groupId) return null;

    try {
      const { data: groupData, error: groupError } = await client
        .from('sorteo_groups')
        .select('*')
        .eq('id', groupId)
        .maybeSingle();

      if (groupError || !groupData) {
        return null;
      }

      const { data: participantsData } = await client
        .from('sorteo_participants')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true });

      const eventConfig = new EventConfig({
        id: groupData.id,
        title: groupData.title,
        maxBudget: groupData.max_budget,
        currency: groupData.currency as any,
        deliveryDateIso: groupData.delivery_date_iso,
        notes: groupData.notes || '',
      });

      const participants: Participant[] = (participantsData || []).map(
        p => new Participant({
          id: p.id,
          name: p.name,
          phone: p.phone || '',
          pin: p.pin || '',
          giftWish: p.gift_wish || '',
          familyId: p.family_id,
          excludedParticipantIds: p.excluded_participant_ids || [],
        })
      );

      let pairs: DrawPair[] | null = null;
      if (groupData.pairs && groupData.pairs.length > 0) {
        const participantMap = new Map(participants.map(p => [p.id, p]));
        pairs = groupData.pairs
          .map((pairItem: { giverId: string; receiverId: string }) => {
            const giver = participantMap.get(pairItem.giverId);
            const receiver = participantMap.get(pairItem.receiverId);
            if (giver && receiver) {
              return new DrawPair(giver, receiver);
            }
            return null;
          })
          .filter((p: DrawPair | null): p is DrawPair => p !== null);
      }

      return {
        eventConfig,
        participants,
        pairs,
        step: groupData.step || 1,
      };
    } catch (err) {
      console.warn('Excepción al cargar grupo desde Supabase:', err);
      return null;
    }
  }

  /**
   * Obtiene la lista de todos los grupos registrados en Supabase
   */
  public static async getAllGroups(): Promise<Array<{
    id: string;
    title: string;
    maxBudget: number;
    deliveryDateIso: string;
    participantsCount: number;
    hasDrawn: boolean;
    updatedAt: number;
  }>> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const { data, error } = await client
        .from('sorteo_groups')
        .select('id, title, max_budget, delivery_date_iso, pairs, updated_at, sorteo_participants(count)')
        .order('updated_at', { ascending: false });

      if (error || !data) return [];

      return data.map((g: any) => ({
        id: g.id,
        title: g.title || 'Grupo sin título',
        maxBudget: g.max_budget || 60000,
        deliveryDateIso: g.delivery_date_iso,
        participantsCount: g.sorteo_participants?.[0]?.count || 0,
        hasDrawn: Boolean(g.pairs && g.pairs.length > 0),
        updatedAt: new Date(g.updated_at || Date.now()).getTime(),
      }));
    } catch {
      return [];
    }
  }

  /**
   * Agrega un participante individual al grupo en Supabase
   */
  public static async registerParticipant(
    groupId: string,
    participant: { id?: string; name: string; phone?: string; pin?: string; giftWish?: string }
  ): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client || !groupId) return false;

    try {
      const partId = participant.id || 'p_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
      const { error } = await client.from('sorteo_participants').insert({
        id: partId,
        group_id: groupId,
        name: participant.name.trim().toUpperCase(),
        phone: participant.phone?.trim() || '',
        pin: participant.pin?.trim() || '',
        gift_wish: participant.giftWish?.trim() || '',
        family_id: null,
        excluded_participant_ids: [],
      });

      return !error;
    } catch (err) {
      console.warn('Error al registrar participante en Supabase:', err);
      return false;
    }
  }

  /**
   * Obtiene los participantes actuales de un grupo desde Supabase
   */
  public static async getParticipants(groupId: string): Promise<Participant[]> {
    const client = getSupabaseClient();
    if (!client || !groupId) return [];

    try {
      const { data, error } = await client
        .from('sorteo_participants')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true });

      if (error || !data) return [];

      return data.map(
        p => new Participant({
          id: p.id,
          name: p.name,
          phone: p.phone || '',
          pin: p.pin || '',
          giftWish: p.gift_wish || '',
          familyId: p.family_id,
          excludedParticipantIds: p.excluded_participant_ids || [],
        })
      );
    } catch {
      return [];
    }
  }

  /**
   * Elimina un grupo y sus participantes en cascada
   */
  public static async deleteGroup(groupId: string): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client || !groupId) return false;

    try {
      const { error } = await client.from('sorteo_groups').delete().eq('id', groupId);
      return !error;
    } catch {
      return false;
    }
  }
}
