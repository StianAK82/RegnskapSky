import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { queryClient, apiRequest } from '@/lib/queryClient';

interface ImportResult {
  success: boolean;
  imported: number;
  errors: string[];
  duplicates: number;
}

export function ExcelImportDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const { toast } = useToast();

  const downloadTemplate = async () => {
    try {
      const response = await fetch('/api/clients/excel-template');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'klient-import-mal.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Mal lastet ned",
        description: "Excel-malen er lastet ned til din enhet",
      });
    } catch (error) {
      toast({
        title: "Feil ved nedlasting",
        description: "Kunne ikke laste ned Excel-mal",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Ugyldig filtype",
        description: "Kun Excel (.xlsx, .xls) og CSV-filer er tillatt",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/clients/import-excel', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Import feilet');
      }

      setImportResult(result);
      
      // Refresh clients list
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });

      toast({
        title: "Import fullført",
        description: `${result.imported} klienter importert`,
      });
    } catch (error: any) {
      toast({
        title: "Import feilet",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" data-testid="button-import-excel">
          <Upload className="h-4 w-4 mr-2" />
          Importer fra Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importer klienter fra Excel</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Template Download */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <FileSpreadsheet className="h-5 w-5 mr-2" />
                Steg 1: Last ned importmal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Last ned Excel-malen for å sikre at dine data har riktig format.
              </p>
              <Button 
                onClick={downloadTemplate} 
                variant="outline"
                data-testid="button-download-template"
              >
                <Download className="h-4 w-4 mr-2" />
                Last ned Excel-mal
              </Button>
            </CardContent>
          </Card>

          <Separator />

          {/* Template Requirements */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Påkrevde felter i Excel-filen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Obligatoriske felter:</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• <strong>Navn</strong> - Bedriftsnavn</li>
                    <li>• <strong>Organisasjonsnummer</strong> - 9 siffer</li>
                    <li>• <strong>E-post</strong> - Kontakt e-post</li>
                    <li>• <strong>Telefon</strong> - Telefonnummer</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Valgfrie felter:</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• <strong>Adresse</strong> - Forretningsadresse</li>
                    <li>• <strong>Postnummer</strong> - 4 siffer</li>
                    <li>• <strong>Poststed</strong> - By/sted</li>
                    <li>• <strong>Regnskapssystem</strong> - Fiken/Tripletex/etc.</li>
                  </ul>
                </div>
              </div>
              
              <Alert className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Viktig:</strong> Første rad må inneholde kolonneoverskrifter. 
                  Duplikate organisasjonsnumre vil bli hoppet over.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Separator />

          {/* File Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Upload className="h-5 w-5 mr-2" />
                Steg 2: Last opp din Excel-fil
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  data-testid="input-excel-file"
                />
                
                {isUploading && (
                  <div className="flex items-center text-blue-600">
                    <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full mr-2"></div>
                    Behandler Excel-fil...
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Import Results */}
          {importResult && (
            <Card className={importResult.success ? "border-green-200" : "border-red-200"}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  {importResult.success ? (
                    <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 mr-2 text-red-600" />
                  )}
                  Importresultat
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span>Klienter importert:</span>
                    <Badge variant="secondary">{importResult.imported}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Duplikate (hoppet over):</span>
                    <Badge variant="outline">{importResult.duplicates}</Badge>
                  </div>
                  {importResult.errors.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium text-red-600 mb-2">Feil:</h4>
                      <ul className="text-sm text-red-600 space-y-1">
                        {importResult.errors.map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}