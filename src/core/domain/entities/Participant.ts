/**
 * Entidad de Dominio: Participante
 * Aplica Clean Code y Principios de Encapsulamiento (POO).
 */
export class Participant {
  public readonly id: string;
  public name: string;
  public phone: string;
  public pin: string;
  public giftWish: string;
  public familyId: string | null;
  /** Lista de IDs de otros participantes considerados familiares o a los que NO les puede regalar */
  public excludedParticipantIds: string[];

  constructor(params: {
    id?: string;
    name: string;
    phone?: string;
    pin?: string;
    giftWish?: string;
    familyId?: string | null;
    excludedParticipantIds?: string[];
  }) {
    const trimmedName = params.name.trim();
    if (!trimmedName) {
      throw new Error('El nombre del participante no puede estar vacío.');
    }

    this.id = params.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `part_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);
    this.name = trimmedName;
    this.phone = params.phone ? params.phone.trim() : '';
    const cleanPin = params.pin ? params.pin.trim().replace(/\D/g, '') : '';
    this.pin = cleanPin.length === 4
      ? cleanPin
      : Math.floor(1000 + Math.random() * 9000).toString();
    this.giftWish = params.giftWish ? params.giftWish.trim() : '';
    this.familyId = params.familyId && params.familyId.trim().length > 0 ? params.familyId.trim() : null;
    this.excludedParticipantIds = params.excludedParticipantIds ? [...params.excludedParticipantIds] : [];
  }

  /**
   * Determina si este participante tiene prohibido regalarle al otro participante
   * (porque es él mismo, porque está en su lista de familiares/excluidos o viceversa, o por grupo familiar compartido).
   */
  public cannotGiftTo(other: Participant): boolean {
    // 1. No puede regalarse a sí mismo
    if (this.id === other.id) {
      return true;
    }

    // 2. No puede regalarle a alguien marcado explícitamente como familiar / excluido
    if (this.excludedParticipantIds.includes(other.id)) {
      return true;
    }

    // 3. Relación bidireccional familiar
    if (other.excludedParticipantIds.includes(this.id)) {
      return true;
    }

    // 4. Grupo familiar compartido si existiese
    if (this.familyId && other.familyId && this.familyId.toLowerCase() === other.familyId.toLowerCase()) {
      return true;
    }

    return false;
  }

  /**
   * Compatibilidad con versiones previas
   */
  public sharesFamilyWith(other: Participant): boolean {
    return this.cannotGiftTo(other) && this.id !== other.id;
  }

  /**
   * Agrega una exclusión familiar
   */
  public addExclusion(targetParticipantId: string): Participant {
    if (targetParticipantId === this.id) return this;
    if (!this.excludedParticipantIds.includes(targetParticipantId)) {
      return this.copyWith({
        excludedParticipantIds: [...this.excludedParticipantIds, targetParticipantId],
      });
    }
    return this;
  }

  /**
   * Remueve una exclusión familiar
   */
  public removeExclusion(targetParticipantId: string): Participant {
    return this.copyWith({
      excludedParticipantIds: this.excludedParticipantIds.filter(id => id !== targetParticipantId),
    });
  }

  /**
   * Clona la instancia con modificaciones
   */
  public copyWith(changes: Partial<{
    name: string;
    phone: string;
    pin: string;
    giftWish: string;
    familyId: string | null;
    excludedParticipantIds: string[];
  }>): Participant {
    return new Participant({
      id: this.id,
      name: changes.name ?? this.name,
      phone: changes.phone ?? this.phone,
      pin: changes.pin ?? this.pin,
      giftWish: changes.giftWish ?? this.giftWish,
      familyId: changes.familyId !== undefined ? changes.familyId : this.familyId,
      excludedParticipantIds: changes.excludedParticipantIds ?? this.excludedParticipantIds,
    });
  }
}
