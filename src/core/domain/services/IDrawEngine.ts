import { Participant } from '../entities/Participant';
import { DrawPair } from '../entities/DrawPair';

/**
 * Interfaz para el Motor de Sorteo (Estrategia de Asignación)
 * Cumple con los principios SOLID (Interface Segregation y Dependency Inversion).
 */
export interface IDrawEngine {
  /**
   * Ejecuta el emparejamiento entre los participantes respetando las restricciones familiares y de no auto-asignación.
   * @param participants Lista de participantes
   * @returns Lista de parejas de sorteo
   * @throws Error con mensaje descriptivo si no es matemáticamente posible
   */
  execute(participants: Participant[]): DrawPair[];

  /**
   * Valida preliminarmente si la lista de participantes y restricciones tiene viabilidad matemática.
   */
  validateFeasibility(participants: Participant[]): { isFeasible: boolean; reason?: string };
}
