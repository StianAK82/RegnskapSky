import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest } from "@/lib/queryClient";
import { 
  Shield, 
  Download, 
  Calendar, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Database
} from "lucide-react";

interface BackupManagerProps {
  onBackupComplete?: (result: any) => void;
}

export function AdminBackupManager({ onBackupComplete }: BackupManagerProps) {
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedDataTypes, setSelectedDataTypes] = useState<string[]>([
    'clients', 'documents', 'time_entries', 'tasks'
  ]);

  const dataTypeOptions = [
    { id: 'clients', label: 'Klienter', description: 'Alle klientdata og profiler' },
    { id: 'documents', label: 'Dokumenter', description: 'Uploaded filer og metadata' },
    { id: 'time_entries', label: 'Tidregistreringer', description: 'Alle timeføringer' },
    { id: 'tasks', label: 'Oppgaver', description: 'Oppgaver og status' },
    { id: 'notifications', label: 'Varsler', description: 'Systemvarsler' },
    { id: 'integrations', label: 'Integrasjoner', description: 'API integrasjoner og innstillinger' }
  ];

  const handleBackup = async (backupType: 'daily' | 'weekly' | 'manual' | 'full') => {
    setIsCreatingBackup(true);
    try {
      const result = await apiRequest('/api/admin/backup', {
        method: 'POST',
        body: JSON.stringify({
          backupType,
          dataTypes: selectedDataTypes
        }),
      });
      
      onBackupComplete?.(result);
    } catch (error) {
      console.error('Backup failed:', error);
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleExport = async (format: 'csv' | 'excel') => {
    setIsExporting(true);
    try {
      const response = await fetch(`/api/admin/export/clients?format=${format}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `clients_export_${new Date().toISOString().split('T')[0]}.${format === 'csv' ? 'csv' : 'xlsx'}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDataTypeToggle = (dataType: string) => {
    setSelectedDataTypes(prev =>
      prev.includes(dataType)
        ? prev.filter(type => type !== dataType)
        : [...prev, dataType]
    );
  };

  return (
    <div className="space-y-6">
      {/* Backup Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Sikkerhetskopi
          </CardTitle>
          <CardDescription>
            Opprett og administrer sikkerhetskopier av systemdata
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Data Type Selection */}
          <div>
            <h4 className="font-medium mb-3">Velg datatyper å inkludere:</h4>
            <div className="grid gap-3 md:grid-cols-2">
              {dataTypeOptions.map((option) => (
                <div key={option.id} className="flex items-start space-x-3">
                  <Checkbox
                    id={option.id}
                    checked={selectedDataTypes.includes(option.id)}
                    onCheckedChange={() => handleDataTypeToggle(option.id)}
                  />
                  <div>
                    <label htmlFor={option.id} className="text-sm font-medium">
                      {option.label}
                    </label>
                    <p className="text-xs text-muted-foreground">
                      {option.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Backup Buttons */}
          <div className="flex gap-2 flex-wrap">
            <Button 
              onClick={() => handleBackup('manual')}
              disabled={isCreatingBackup || selectedDataTypes.length === 0}
              className="flex-1 min-w-[120px]"
            >
              {isCreatingBackup ? (
                <Clock className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Shield className="h-4 w-4 mr-2" />
              )}
              Manuell Backup
            </Button>
            
            <Button 
              onClick={() => handleBackup('daily')}
              variant="outline"
              disabled={isCreatingBackup || selectedDataTypes.length === 0}
              className="flex-1 min-w-[120px]"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Daglig Backup
            </Button>
            
            <Button 
              onClick={() => handleBackup('full')}
              variant="outline"
              disabled={isCreatingBackup || selectedDataTypes.length === 0}
              className="flex-1 min-w-[120px]"
            >
              <Database className="h-4 w-4 mr-2" />
              Full Backup
            </Button>
          </div>

          {selectedDataTypes.length === 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Velg minst én datatype for å opprette backup.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Export Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Data Export
          </CardTitle>
          <CardDescription>
            Eksporter data til ulike formater for analyse eller arkivering
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 md:grid-cols-2">
            <Button 
              onClick={() => handleExport('excel')}
              disabled={isExporting}
              variant="outline"
              className="w-full"
            >
              {isExporting ? (
                <Clock className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Excel Export (.xlsx)
            </Button>
            
            <Button 
              onClick={() => handleExport('csv')}
              disabled={isExporting}
              variant="outline"
              className="w-full"
            >
              {isExporting ? (
                <Clock className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              CSV Export (.csv)
            </Button>
          </div>

          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Eksporterte filer inneholder sensitiv data. Håndter med forsiktighet.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
          <CardDescription>
            Oversikt over systemhelse og tilgjengelige funksjoner
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Database
              </span>
              <Badge className="bg-green-500">Aktiv</Badge>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Backup System
              </span>
              <Badge className="bg-green-500">Tilgjengelig</Badge>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export Funksjoner
              </span>
              <Badge className="bg-green-500">Aktiv</Badge>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Automatisk Backup
              </span>
              <Badge variant="outline">Konfigureres</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}