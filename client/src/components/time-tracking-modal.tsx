import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useTimeTracking } from '@/hooks/use-time-tracking';

interface TimeTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TimeTrackingModal({ isOpen, onClose }: TimeTrackingModalProps) {
  const { currentSession, saveTimeEntry, skipTimeEntry, getCurrentDuration } = useTimeTracking();
  const [description, setDescription] = useState('');
  const [customTime, setCustomTime] = useState('');

  const currentDuration = getCurrentDuration();
  const suggestedTime = Math.round(currentDuration * 100) / 100;

  const handleSave = () => {
    const timeToSave = customTime ? parseFloat(customTime) : suggestedTime;
    saveTimeEntry(description, timeToSave);
    setDescription('');
    setCustomTime('');
    onClose();
  };

  const handleSkip = () => {
    skipTimeEntry();
    setDescription('');
    setCustomTime('');
    onClose();
  };

  if (!currentSession) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrer arbeidstid</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-gray-700">
              Klient: {currentSession.clientName}
            </Label>
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700">
              Foreslått tid: {suggestedTime} timer
            </Label>
            <p className="text-xs text-gray-500 mt-1">
              Startet: {currentSession.startTime.toLocaleTimeString('no-NO')}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Beskrivelse av arbeid *</Label>
            <Textarea
              id="description"
              placeholder="Beskriv arbeidet som ble utført..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customTime">Juster tid (timer)</Label>
            <Input
              id="customTime"
              type="number"
              step="0.25"
              min="0.1"
              placeholder={suggestedTime.toString()}
              value={customTime}
              onChange={(e) => setCustomTime(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              La stå tom for å bruke foreslått tid
            </p>
          </div>

          <div className="flex justify-between space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={handleSkip}
              className="flex-1"
            >
              Hopp over
            </Button>
            <Button
              onClick={handleSave}
              disabled={!description.trim()}
              className="flex-1"
            >
              Registrer tid
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}