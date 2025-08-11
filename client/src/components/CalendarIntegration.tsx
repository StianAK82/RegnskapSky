import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";
import { Calendar, Clock, CheckCircle, AlertTriangle, RefreshCw } from "lucide-react";

interface CalendarIntegrationProps {
  onSyncComplete?: (result: any) => void;
}

export function CalendarIntegration({ onSyncComplete }: CalendarIntegrationProps) {
  const [syncing, setSyncing] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Record<string, Date>>({});

  const calendarProviders = [
    {
      id: 'google',
      name: 'Google Calendar',
      description: 'Sync med Google Kalender for oppgaver og møter',
      icon: '📅',
      color: 'bg-blue-500'
    },
    {
      id: 'outlook',
      name: 'Microsoft Outlook',
      description: 'Sync med Outlook Kalender',
      icon: '📆',
      color: 'bg-orange-500'
    }
  ];

  const handleSync = async (provider: 'google' | 'outlook') => {
    setSyncing(provider);
    try {
      const result = await apiRequest('/api/calendar/sync', {
        method: 'POST',
        body: JSON.stringify({ provider }),
      });
      
      setLastSync(prev => ({
        ...prev,
        [provider]: new Date()
      }));
      
      onSyncComplete?.(result);
    } catch (error) {
      console.error(`${provider} calendar sync failed:`, error);
    } finally {
      setSyncing(null);
    }
  };

  const formatLastSync = (date: Date) => {
    return new Intl.DateTimeFormat('no-NO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Kalender Integrasjon
          </CardTitle>
          <CardDescription>
            Synkroniser oppgaver og deadlines med din kalender
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Kalender integrasjon lar deg automatisk opprette kalenderavtaler for oppgaver med deadlines.
            </AlertDescription>
          </Alert>

          <div className="grid gap-4 md:grid-cols-2">
            {calendarProviders.map((provider) => (
              <Card key={provider.id} className="border">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg ${provider.color} flex items-center justify-center text-white font-semibold`}>
                        {provider.icon}
                      </div>
                      <div>
                        <CardTitle className="text-base">{provider.name}</CardTitle>
                        <CardDescription className="text-sm">
                          {provider.description}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {lastSync[provider.id] && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      Sist synkronisert: {formatLastSync(lastSync[provider.id])}
                    </div>
                  )}
                  
                  <Button
                    onClick={() => handleSync(provider.id as 'google' | 'outlook')}
                    disabled={syncing === provider.id}
                    className="w-full"
                    variant={lastSync[provider.id] ? "outline" : "default"}
                  >
                    {syncing === provider.id ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Synkroniserer...
                      </>
                    ) : (
                      <>
                        <Calendar className="h-4 w-4 mr-2" />
                        {lastSync[provider.id] ? 'Synkroniser på nytt' : 'Koble til'}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Sync Settings */}
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-sm">Sync Innstillinger</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span>Automatisk sync</span>
                <Badge variant="outline">Kommer snart</Badge>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>Push notifikasjoner</span>
                <Badge variant="outline">Planlagt</Badge>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>Bidireksjonell sync</span>
                <Badge variant="outline">Under utvikling</Badge>
              </div>
            </CardContent>
          </Card>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Kalendersync er for øyeblikket en enkel demonstrasjon. 
              Full integrasjon krever OAuth-oppsett med kalenderproviderne.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}