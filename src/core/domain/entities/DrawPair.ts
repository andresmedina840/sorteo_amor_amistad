import { Participant } from './Participant';

/**
 * Entidad de Dominio: Pareja del Sorteo (Amigo Secreto)
 * Representa la asignación secreta: giver regala a receiver
 */
export class DrawPair {
  public readonly giver: Participant;
  public readonly receiver: Participant;

  constructor(giver: Participant, receiver: Participant) {
    if (giver.id === receiver.id) {
      throw new Error(`Inconsistencia en el sorteo: ${giver.name} no puede regalarse a sí mismo.`);
    }
    if (giver.cannotGiftTo(receiver)) {
      throw new Error(`Violación de regla: ${giver.name} tiene como familiar o excluido a ${receiver.name}.`);
    }

    this.giver = giver;
    this.receiver = receiver;
  }
}
