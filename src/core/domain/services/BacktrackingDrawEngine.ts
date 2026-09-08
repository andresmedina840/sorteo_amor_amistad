import { Participant } from '../entities/Participant';
import { DrawPair } from '../entities/DrawPair';
import type { IDrawEngine } from './IDrawEngine';

/**
 * Algoritmo de Emparejamiento con Restricciones Familiares Específicas y No Auto-asignación.
 * Basado en Backtracking Estocástico (Fisher-Yates) y heurística MRV (Minimum Remaining Values).
 */
export class BacktrackingDrawEngine implements IDrawEngine {
  /**
   * Baraja un arreglo de forma inmutable usando el algoritmo Fisher-Yates
   */
  private shuffle<T>(array: T[]): T[] {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  /**
   * Valida la viabilidad antes de ejecutar el sorteo
   */
  public validateFeasibility(participants: Participant[]): { isFeasible: boolean; reason?: string } {
    if (participants.length < 3) {
      return {
        isFeasible: false,
        reason: 'Se requieren al menos 3 participantes para jugar Amor y Amistad.',
      };
    }

    // 1. Verificar si cada participante tiene al menos 1 candidato posible
    for (const giver of participants) {
      const validReceivers = participants.filter(receiver => !giver.cannotGiftTo(receiver));
      if (validReceivers.length === 0) {
        return {
          isFeasible: false,
          reason: `El participante ${giver.name} no tiene ningún destinatario disponible debido a los familiares o exclusiones asignadas. Por favor, desmarca alguno de sus familiares.`,
        };
      }
    }

    // 2. Verificar que cada persona pueda ser recibida por al menos 1 persona
    for (const receiver of participants) {
      const possibleGivers = participants.filter(giver => !giver.cannotGiftTo(receiver));
      if (possibleGivers.length === 0) {
        return {
          isFeasible: false,
          reason: `Nadie puede regalarle a ${receiver.name} porque todas las demás personas lo tienen marcado como familiar o excluido.`,
        };
      }
    }

    return { isFeasible: true };
  }

  /**
   * Ejecuta el sorteo encontrando una permutación válida sin auto-asignación ni familiares
   */
  public execute(participants: Participant[]): DrawPair[] {
    const feasibility = this.validateFeasibility(participants);
    if (!feasibility.isFeasible) {
      throw new Error(feasibility.reason);
    }

    // Ordenar a los participantes dando prioridad a los más restringidos (menos candidatos posibles - Heurística MRV)
    const givers = [...participants].sort((a, b) => {
      const candidatesA = participants.filter(p => !a.cannotGiftTo(p)).length;
      const candidatesB = participants.filter(p => !b.cannotGiftTo(p)).length;
      return candidatesA - candidatesB;
    });

    const maxAttempts = 150;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const result = this.solveBacktracking(givers, participants);
      if (result) {
        return result;
      }
    }

    throw new Error(
      'No se pudo encontrar una asignación válida con las exclusiones familiares actuales. Por favor, revisa o reduce algunas de las restricciones asignadas.'
    );
  }

  /**
   * Resuelve el emparejamiento usando backtracking aleatorizado
   */
  private solveBacktracking(
    givers: Participant[],
    allParticipants: Participant[]
  ): DrawPair[] | null {
    const assignedReceivers = new Set<string>();
    const pairs: DrawPair[] = [];

    const backtrack = (index: number): boolean => {
      if (index === givers.length) {
        return true;
      }

      const currentGiver = givers[index];

      // Candidatos válidos para este giver:
      // 1. No viola ninguna regla (cannotGiftTo es falso)
      // 2. No ha sido asignado aún a nadie más
      const candidates = allParticipants.filter(
        candidate => !currentGiver.cannotGiftTo(candidate) && !assignedReceivers.has(candidate.id)
      );

      // Barajar aleatoriamente para garantizar sorteos imparciales
      const randomizedCandidates = this.shuffle(candidates);

      for (const candidate of randomizedCandidates) {
        assignedReceivers.add(candidate.id);
        const pair = new DrawPair(currentGiver, candidate);
        pairs.push(pair);

        if (backtrack(index + 1)) {
          return true;
        }

        // Retroceder
        assignedReceivers.delete(candidate.id);
        pairs.pop();
      }

      return false;
    };

    const success = backtrack(0);
    return success ? pairs : null;
  }
}
