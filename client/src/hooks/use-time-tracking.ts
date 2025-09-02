import { useState, useEffect, useRef } from 'react';
import { useAuth } from './use-auth';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from './use-toast';

interface TimeSession {
  clientId: string;
  clientName: string;
  startTime: Date;
  description: string;
}

export function useTimeTracking() {
  const [currentSession, setCurrentSession] = useState<TimeSession | null>(null);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [pendingClientSwitch, setPendingClientSwitch] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const sessionRef = useRef<TimeSession | null>(null);

  // Update ref when session changes
  useEffect(() => {
    sessionRef.current = currentSession;
  }, [currentSession]);

  // Handle page unload/logout
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (sessionRef.current) {
        // Try to save time entry before leaving
        const session = sessionRef.current;
        const timeSpent = (new Date().getTime() - session.startTime.getTime()) / (1000 * 60 * 60);
        
        if (timeSpent > 0.1) { // Only save if more than 6 minutes
          navigator.sendBeacon('/api/time-entries', JSON.stringify({
            clientId: session.clientId,
            description: session.description || 'Automatisk registrering',
            timeSpent: Math.round(timeSpent * 100) / 100,
            date: new Date().toISOString().split('T')[0],
            billable: true
          }));
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const startTimeTracking = (clientId: string, clientName: string, description = '') => {
    // If there's an active session, show modal to log time
    if (currentSession && currentSession.clientId !== clientId) {
      setPendingClientSwitch(clientId);
      setShowTimeModal(true);
      return;
    }

    setCurrentSession({
      clientId,
      clientName,
      startTime: new Date(),
      description
    });
  };

  const stopTimeTracking = () => {
    if (currentSession) {
      setShowTimeModal(true);
    }
  };

  const saveTimeEntry = async (description: string, customTime?: number) => {
    if (!currentSession || !user) return;

    const timeSpent = customTime || 
      (new Date().getTime() - currentSession.startTime.getTime()) / (1000 * 60 * 60);

    if (timeSpent < 0.1) {
      toast({
        title: 'For kort tid',
        description: 'Tidsregistrering må være minst 6 minutter',
        variant: 'destructive'
      });
      return;
    }

    try {
      await apiRequest('POST', '/api/time-entries', {
        clientId: currentSession.clientId,
        description: description || currentSession.description || 'Klientarbeid',
        timeSpent: Math.round(timeSpent * 100) / 100,
        date: new Date(),
        billable: true
      });

      toast({
        title: 'Tid registrert',
        description: `${Math.round(timeSpent * 100) / 100} timer registrert for ${currentSession.clientName}`,
      });

      setCurrentSession(null);
      setShowTimeModal(false);

      // If switching clients, start new session
      if (pendingClientSwitch) {
        // Get client name for new session
        const clientResponse = await apiRequest('GET', `/api/clients/${pendingClientSwitch}`);
        const clientData = await clientResponse.json();
        
        setCurrentSession({
          clientId: pendingClientSwitch,
          clientName: clientData.name,
          startTime: new Date(),
          description: ''
        });
        setPendingClientSwitch(null);
      }
    } catch (error) {
      toast({
        title: 'Feil',
        description: 'Kunne ikke registrere tid',
        variant: 'destructive'
      });
    }
  };

  const skipTimeEntry = () => {
    setCurrentSession(null);
    setShowTimeModal(false);
    
    // If switching clients, start new session
    if (pendingClientSwitch) {
      // Will need to fetch client name
      setPendingClientSwitch(null);
    }
  };

  const getCurrentDuration = () => {
    if (!currentSession) return 0;
    return (new Date().getTime() - currentSession.startTime.getTime()) / (1000 * 60 * 60);
  };

  return {
    currentSession,
    showTimeModal,
    setShowTimeModal,
    startTimeTracking,
    stopTimeTracking,
    saveTimeEntry,
    skipTimeEntry,
    getCurrentDuration
  };
}