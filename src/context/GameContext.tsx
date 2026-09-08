import React, { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from 'react';
import { EventConfig, type CurrencyCode } from '../core/domain/entities/EventConfig';
import { Participant } from '../core/domain/entities/Participant';
import { DrawPair } from '../core/domain/entities/DrawPair';
import { BacktrackingDrawEngine } from '../core/domain/services/BacktrackingDrawEngine';
import { WebCryptoService } from '../infrastructure/services/WebCryptoService';
import { DrawUseCases, type ShareableItem, type GroupShareResult } from '../core/application/useCases/DrawUseCases';
import { requestPinToDeleteGroup, showSuccessAlert } from '../core/domain/utils/alertUtils';

import { SupabaseStorageService } from '../infrastructure/storage/SupabaseStorageService';
import { isSupabaseConfigured } from '../infrastructure/storage/supabaseClient';

interface GameContextType {
  // Estado
  eventConfig: EventConfig;
  participants: Participant[];
  pairs: DrawPair[] | null;
  shareableItems: ShareableItem[];
  groupShareResult: GroupShareResult | null;
  step: number;
  errorMessage: string | null;
  feasibility: { isFeasible: boolean; reason?: string };

  // Acciones
  setStep: (step: number) => void;
  updateEventConfig: (changes: {
    title?: string;
    maxBudget?: number;
    currency?: CurrencyCode;
    deliveryDateIso?: string;
    notes?: string;
  }) => void;
  addParticipant: (data: { name: string; phone?: string; pin?: string; giftWish?: string; familyId?: string; excludedParticipantIds?: string[] }) => void;
  updateParticipant: (id: string, data: { name?: string; phone?: string; pin?: string; giftWish?: string; familyId?: string | null; excludedParticipantIds?: string[] }) => void;
  toggleFamilyExclusion: (participantAId: string, participantBId: string) => void;
  setParticipantExclusions: (participantId: string, excludedIds: string[]) => void;
  removeParticipant: (id: string) => void;
  executeDraw: () => Promise<boolean>;
  resetDraw: () => void;
  resetAll: () => void;
  deleteGroupWithPin: () => Promise<boolean>;
  switchGroup: (groupId: string) => Promise<boolean>;
  createNewGroup: (title?: string) => void;
  clearError: () => void;
}


const GameContext = createContext<GameContextType | undefined>(undefined);

// Fecha inicial por defecto: Viernes de la tercera semana de Septiembre (mes tradicional de Amor y Amistad en Colombia) a las 07:00 PM
const defaultDeliveryDate = new Date();
defaultDeliveryDate.setDate(defaultDeliveryDate.getDate() + 14);
defaultDeliveryDate.setHours(19, 0, 0, 0);

const defaultInitialConfig = new EventConfig({
  title: 'Amor y Amistad 2026',
  maxBudget: 60000,
  currency: 'COP',
  deliveryDateIso: defaultDeliveryDate.toISOString(),
  notes: 'Entrega de regalos con endulzada y compartir especial.',
});

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Inicialización con Inyección de Dependencias
  const drawEngine = useMemo(() => new BacktrackingDrawEngine(), []);
  const cryptoService = useMemo(() => new WebCryptoService(), []);
  const useCases = useMemo(() => new DrawUseCases(drawEngine, cryptoService), [drawEngine, cryptoService]);

  // Estado inicial (valores por defecto, se sobreescribe al cargar de Supabase)
  const [eventConfig, setEventConfig] = useState<EventConfig>(defaultInitialConfig);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [pairs, setPairs] = useState<DrawPair[] | null>(null);
  const [shareableItems, setShareableItems] = useState<ShareableItem[]>([]);
  const [step, setStep] = useState<number>(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDbLoaded, setIsDbLoaded] = useState(false);

  // Carga inicial desde Supabase (base de datos)
  useEffect(() => {
    const loadFromDatabase = async () => {
      if (!isSupabaseConfigured()) {
        setIsDbLoaded(true);
        return;
      }

      try {
        // Cargar el último grupo activo desde Supabase
        const groups = await SupabaseStorageService.getAllGroups();
        if (groups.length > 0) {
          const latestGroup = groups[0]; // Ordenado por updated_at DESC
          const loaded = await SupabaseStorageService.loadGroup(latestGroup.id);
          if (loaded) {
            setEventConfig(loaded.eventConfig);
            setParticipants(loaded.participants);
            setPairs(loaded.pairs);
            setStep(loaded.step);
          }
        }
      } catch (err) {
        console.warn('Error al cargar desde la base de datos:', err);
      } finally {
        setIsDbLoaded(true);
      }
    };

    loadFromDatabase();
  }, []);

  // Auto-guardado en la base de datos Supabase
  useEffect(() => {
    if (!isDbLoaded) return; // No guardar hasta que termine la carga inicial
    if (!isSupabaseConfigured()) return;

    const saveTimer = setTimeout(() => {
      SupabaseStorageService.saveGroup(eventConfig, participants, pairs, step).catch(err => {
        console.warn('Error al guardar en la base de datos:', err);
      });
    }, 500); // Debounce de 500ms para evitar guardados excesivos

    return () => clearTimeout(saveTimer);
  }, [eventConfig, participants, pairs, step, isDbLoaded]);

  // Enlace grupal único para compartir con todo el grupo
  const [groupShareResult, setGroupShareResult] = useState<GroupShareResult | null>(null);

  // Generar enlaces compartibles si ya hay parejas sorteadas
  useEffect(() => {
    if (pairs && pairs.length > 0) {
      const baseUrl = typeof window !== 'undefined' ? window.location.href : '';

      // Enlace grupal único (principal)
      useCases.generateGroupShareLink(pairs, eventConfig, baseUrl).then(result => {
        setGroupShareResult(result);
      });

      // Enlaces individuales (secundarios)
      useCases.generateShareableLinks(pairs, eventConfig, baseUrl).then(items => {
        setShareableItems(items);
      });
    } else {
      setGroupShareResult(null);
      setShareableItems([]);
    }
  }, [pairs, eventConfig, useCases]);

  // Validación de viabilidad en tiempo real
  const feasibility = useMemo(() => {
    return drawEngine.validateFeasibility(participants);
  }, [participants, drawEngine]);

  const updateEventConfig = (changes: {
    title?: string;
    maxBudget?: number;
    currency?: CurrencyCode;
    deliveryDateIso?: string;
    notes?: string;
  }) => {
    setEventConfig(prev => prev.copyWith(changes));
  };

  const addParticipant = (data: { name: string; phone?: string; pin?: string; giftWish?: string; familyId?: string; excludedParticipantIds?: string[] }) => {
    try {
      const newPart = new Participant({
        name: data.name,
        phone: data.phone || '',
        pin: data.pin || '',
        giftWish: data.giftWish || '',
        familyId: data.familyId || null,
        excludedParticipantIds: data.excludedParticipantIds || [],
      });
      setParticipants(prev => [...prev, newPart]);
      setErrorMessage(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al agregar participante');
    }
  };

  const updateParticipant = (id: string, data: { name?: string; phone?: string; pin?: string; giftWish?: string; familyId?: string | null; excludedParticipantIds?: string[] }) => {
    setParticipants(prev =>
      prev.map(p => {
        if (p.id !== id) return p;
        return p.copyWith(data);
      })
    );
  };

  /**
   * Conmuta la relación familiar de exclusión mutua entre dos participantes
   */
  const toggleFamilyExclusion = (participantAId: string, participantBId: string) => {
    if (participantAId === participantBId) return;

    setParticipants(prev => {
      const pA = prev.find(p => p.id === participantAId);
      const pB = prev.find(p => p.id === participantBId);
      if (!pA || !pB) return prev;

      const isCurrentlyExcluded = pA.excludedParticipantIds.includes(participantBId) || pB.excludedParticipantIds.includes(participantAId);

      return prev.map(p => {
        if (p.id === participantAId) {
          return isCurrentlyExcluded
            ? p.removeExclusion(participantBId)
            : p.addExclusion(participantBId);
        }
        if (p.id === participantBId) {
          return isCurrentlyExcluded
            ? p.removeExclusion(participantAId)
            : p.addExclusion(participantAId);
        }
        return p;
      });
    });
  };

  /**
   * Asigna directamente el conjunto de familiares excluidos a un jugador
   */
  const setParticipantExclusions = (participantId: string, excludedIds: string[]) => {
    setParticipants(prev => {
      return prev.map(p => {
        if (p.id === participantId) {
          return p.copyWith({ excludedParticipantIds: excludedIds });
        }
        // Sincronizar bidireccionalmente: Si p está en excludedIds, p debe tener a participantId
        const shouldExcludeThis = excludedIds.includes(p.id);
        const hasParticipant = p.excludedParticipantIds.includes(participantId);

        if (shouldExcludeThis && !hasParticipant) {
          return p.addExclusion(participantId);
        } else if (!shouldExcludeThis && hasParticipant) {
          return p.removeExclusion(participantId);
        }

        return p;
      });
    });
  };

  const removeParticipant = (id: string) => {
    setParticipants(prev => {
      // Remover participante y limpiar referencias a su ID en los demás
      return prev
        .filter(p => p.id !== id)
        .map(p => p.removeExclusion(id));
    });
  };

  const executeDraw = async (): Promise<boolean> => {
    try {
      setErrorMessage(null);
      const generatedPairs = useCases.executeDraw(participants);
      setPairs(generatedPairs);
      setStep(4);
      return true;
    } catch (err: any) {
      setErrorMessage(err.message || 'No fue posible realizar el sorteo.');
      return false;
    }
  };

  const resetDraw = () => {
    setPairs(null);
    setShareableItems([]);
    setStep(2);
  };

  const resetAll = () => {
    setEventConfig(defaultInitialConfig);
    setParticipants([]);
    setPairs(null);
    setShareableItems([]);
    setStep(1);
    setErrorMessage(null);
  };

  /**
   * Solicita el PIN 471414 para borrar el grupo y reiniciar
   */
  const deleteGroupWithPin = async (): Promise<boolean> => {
    const isAuthorized = await requestPinToDeleteGroup();
    if (isAuthorized) {
      resetAll();
      showSuccessAlert(
        'Grupo Eliminado',
        'El grupo y todos sus datos han sido borrados con éxito usando el PIN 471414.'
      );
      return true;
    }
    return false;
  };

  /**
   * Cambia al grupo indicado cargándolo desde Supabase o LocalStorage
   */
  const switchGroup = async (groupId: string): Promise<boolean> => {
    try {
      if (!isSupabaseConfigured()) return false;

      const cloudGroup = await SupabaseStorageService.loadGroup(groupId);
      if (cloudGroup) {
        setEventConfig(cloudGroup.eventConfig);
        setParticipants(cloudGroup.participants);
        setPairs(cloudGroup.pairs);
        setStep(cloudGroup.step);
        return true;
      }

      return false;
    } catch (err) {
      console.warn('Error al cambiar de grupo:', err);
      return false;
    }
  };

  /**
   * Crea un nuevo grupo limpio
   */
  const createNewGroup = (title?: string) => {
    const newConfig = new EventConfig({
      title: title || 'Amor y Amistad 2026',
      maxBudget: 60000,
      currency: 'COP',
      deliveryDateIso: defaultDeliveryDate.toISOString(),
      notes: 'Entrega de regalos con endulzada y compartir especial.',
    });
    setEventConfig(newConfig);
    setParticipants([]);
    setPairs(null);
    setShareableItems([]);
    setStep(1);
    setErrorMessage(null);

    if (isSupabaseConfigured()) {
      SupabaseStorageService.saveGroup(newConfig, [], null, 1).catch(() => {});
    }
  };

  const clearError = () => setErrorMessage(null);


  return (
    <GameContext.Provider
      value={{
        eventConfig,
        participants,
        pairs,
        shareableItems,
        groupShareResult,
        step,
        errorMessage,
        feasibility,
        setStep,
        updateEventConfig,
        addParticipant,
        updateParticipant,
        toggleFamilyExclusion,
        setParticipantExclusions,
        removeParticipant,
        executeDraw,
        resetDraw,
        resetAll,
        deleteGroupWithPin,
        switchGroup,
        createNewGroup,
        clearError,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = (): GameContextType => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame debe ser usado dentro de un GameProvider');
  }
  return context;
};
