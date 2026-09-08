import React, { useState, useEffect, useMemo } from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { Header } from './components/layout/Header';
import { Step1EventConfig } from './components/wizard/Step1EventConfig';
import { Step2PlayerRegistration } from './components/wizard/Step2PlayerRegistration';
import { Step3AssignFamilies } from './components/wizard/Step3AssignFamilies';
import { Step4ShareResults } from './components/wizard/Step4ShareResults';
import { RevealPage } from './components/reveal/RevealPage';
import { GroupEnvelopeRevealPage } from './components/reveal/GroupEnvelopeRevealPage';
import { PlayerRegistrationPage } from './components/registration/PlayerRegistrationPage';
import { RegistrationSyncService } from './infrastructure/services/RegistrationSyncService';
import { showSuccessAlert } from './core/domain/utils/alertUtils';
import './styles/theme.css';

const MainWizard: React.FC = () => {
  const { step } = useGame();

  return (
    <>
      <Header />
      <main>
        {step === 1 && <Step1EventConfig />}
        {step === 2 && <Step2PlayerRegistration />}
        {step === 3 && <Step3AssignFamilies />}
        {step === 4 && <Step4ShareResults />}
      </main>
    </>
  );
};

const AppContent: React.FC = () => {
  const { addParticipant } = useGame();
  const [revealToken, setRevealToken] = useState<string | null>(null);
  const [registerToken, setRegisterToken] = useState<string | null>(null);
  const [sobresGroupId, setSobresGroupId] = useState<string | null>(null);
  const syncService = useMemo(() => new RegistrationSyncService(), []);

  // Escuchar cambios en la URL (soporte para enlaces de WhatsApp con hash)
  useEffect(() => {
    const checkHash = () => {
      const hash = window.location.hash;

      if (hash.startsWith('#revelar=')) {
        setRevealToken(hash.replace('#revelar=', ''));
        setRegisterToken(null);
        setSobresGroupId(null);
      } else if (hash.startsWith('#registro=')) {
        setRegisterToken(hash.replace('#registro=', ''));
        setRevealToken(null);
        setSobresGroupId(null);
      } else if (hash.startsWith('#sobres')) {
        const cleanId = hash.replace('#sobres=', '').replace('#sobres', '');
        setSobresGroupId(cleanId || '');
        setRevealToken(null);
        setRegisterToken(null);
      } else if (hash.startsWith('#agregar=')) {
        // Enlace de auto-inscripción que llega al organizador
        const playerToken = hash.replace('#agregar=', '');
        const player = syncService.decodePlayerData(playerToken);
        if (player) {
          addParticipant({
            name: player.name,
            phone: player.phone,
            pin: player.pin,
            giftWish: player.giftWish,
          });
          showSuccessAlert(
            '¡Nuevo Jugador Registrado!',
            `Se ha agregado a <strong>${player.name}</strong> a la lista de participantes del sorteo.`
          );
        }
        window.location.hash = '';
        setRevealToken(null);
        setRegisterToken(null);
        setSobresGroupId(null);
      } else {
        setRevealToken(null);
        setRegisterToken(null);
        setSobresGroupId(null);
      }
    };

    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, [syncService, addParticipant]);

  const handleGoHome = () => {
    window.location.hash = '';
    setRevealToken(null);
    setRegisterToken(null);
    setSobresGroupId(null);
  };

  return (
    <div className="app-container">
      {revealToken ? (
        <RevealPage token={revealToken} onGoHome={handleGoHome} />
      ) : registerToken ? (
        <PlayerRegistrationPage inviteToken={registerToken} onGoHome={handleGoHome} />
      ) : sobresGroupId !== null ? (
        <GroupEnvelopeRevealPage groupId={sobresGroupId || undefined} onGoHome={handleGoHome} />
      ) : (
        <MainWizard />
      )}

      <footer className="app-footer">
        <p>
          💌 <strong>Sorteo de Amor y Amistad Colombia</strong> — Desarrollado con Clean Code, SOLID y Criptografía en Cliente.
        </p>
        <p style={{ marginTop: '0.25rem', opacity: 0.75 }}>
          100% Gratuito y Privado. Ningún dato sensible sale de tu navegador.
        </p>
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  );
};

export default App;
