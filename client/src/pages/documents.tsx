import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { FileText, Download, Upload, Search, Filter, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function Documents() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewingDocument, setViewingDocument] = useState<any>(null);
  const { toast } = useToast();

  console.log('Documents component rendering, viewingDocument:', !!viewingDocument);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['/api/documents'],
    queryFn: () => apiRequest('GET', '/api/documents').then(res => res.json())
  });

  const filteredDocuments = documents.filter((doc: any) => {
    const matchesSearch = doc.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['Rapporter', 'Kontrakter', 'Fakturaer', 'Bilag', 'Andre'];

  const getDocumentIcon = (category: string) => {
    switch (category) {
      case 'Rapporter': return '📊';
      case 'Kontrakter': return '📄';
      case 'Fakturaer': return '🧾';
      case 'Bilag': return '🧾';
      default: return '📎';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownload = (document: any) => {
    const authToken = localStorage.getItem('auth_token');
    const token = localStorage.getItem('token'); 
    const finalToken = authToken || token;
    
    if (!finalToken) {
      toast({
        title: "Ikke innlogget",
        description: "Du må være innlogget for å laste ned dokumenter",
        variant: "destructive",
      });
      return;
    }

    console.log('Direct download with token in URL...');
    
    // Use window.open with token in URL - this bypasses all fetch/POST complications
    const downloadUrl = `/api/documents/${document.id}/download?token=${encodeURIComponent(finalToken)}`;
    window.open(downloadUrl, '_blank');
    
    toast({
      title: "Nedlasting startet",
      description: "Dokumentet blir lastet ned",
    });
  };

  const handleDownloadExcel = (document: any) => {
    const authToken = localStorage.getItem('auth_token');
    const token = localStorage.getItem('token'); 
    const finalToken = authToken || token;

    if (!finalToken) {
      toast({
        title: "Ikke innlogget",
        description: "Du må være innlogget for å laste ned dokumenter",
        variant: "destructive",
      });
      return;
    }

    console.log('Direct Excel download with token in URL...');

    // Use window.open with token and format in URL
    const downloadUrl = `/api/documents/${document.id}/download?format=excel&token=${encodeURIComponent(finalToken)}`;
    window.open(downloadUrl, '_blank');
    
    toast({
      title: "Excel nedlasting startet",
      description: "Excel-filen blir lastet ned",
    });
  };

  // Delete document mutation
  const deleteDocumentMutation = useMutation({
    mutationFn: (documentId: string) => 
      apiRequest('DELETE', `/api/documents/${documentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      toast({
        title: "Dokument slettet",
        description: "Dokumentet ble slettet",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Feil ved sletting",
        description: error.message || "Kunne ikke slette dokumentet",
        variant: "destructive",
      });
    }
  });

  const handleDelete = (document: any) => {
    if (confirm(`Er du sikker på at du vil slette "${document.name}"?`)) {
      deleteDocumentMutation.mutate(document.id);
    }
  };

  const handleViewDocument = async (document: any) => {
    console.log('handleViewDocument clicked for:', document.name);
    alert('Vis dokument knappen fungerer! Document: ' + document.name);
    
    // First test - just show dialog with dummy data
    setViewingDocument({
      ...document,
      data: [
        { Klient: 'Test Klient', 'Totale timer': 5.5, 'Fakturerbare timer': 4.0 },
        { Klient: 'Annen Klient', 'Totale timer': 3.0, 'Fakturerbare timer': 3.0 }
      ]
    });
    
    return; // Stop here for testing
    
    try {
      const authToken = localStorage.getItem('auth_token');
      const token = localStorage.getItem('token'); 
      const finalToken = authToken || token;
      
      if (!finalToken) {
        toast({
          title: "Ikke innlogget",
          description: "Du må være innlogget for å se dokumenter",
          variant: "destructive",
        });
        return;
      }

      const response = await apiRequest('GET', `/api/documents/${document.id}/view`, {
        headers: {
          'Authorization': `Bearer ${finalToken}`
        }
      });
      
      const documentData = await response.json();
      setViewingDocument({
        ...document,
        data: documentData
      });
    } catch (error) {
      toast({
        title: "Kunne ikke vise rapport",
        description: "Feil ved henting av rapportdata",
        variant: "destructive",
      });
    }
  };

  return (
    <AppShell title="Dokumenter" subtitle="Administrer og last ned dokumenter">
      <div className="space-y-6">
        {/* Search and Filter */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Søk og filtrer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Input
                  placeholder="Søk etter dokumentnavn..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="all">Alle kategorier</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-blue-600">{documents.length}</div>
              <p className="text-gray-600">Totalt dokumenter</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-green-600">
                {documents.filter((d: any) => d.category === 'Rapporter').length}
              </div>
              <p className="text-gray-600">Rapporter</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-purple-600">
                {documents.filter((d: any) => d.category === 'Kontrakter').length}
              </div>
              <p className="text-gray-600">Kontrakter</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-orange-600">
                {documents.filter((d: any) => d.category === 'Bilag').length}
              </div>
              <p className="text-gray-600">Bilag</p>
            </CardContent>
          </Card>
        </div>

        {/* Documents Table */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Dokumenter ({filteredDocuments.length})
              </CardTitle>
              <Button>
                <Upload className="h-4 w-4 mr-2" />
                Last opp dokument
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse border rounded p-4">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Ingen dokumenter funnet</h3>
                <p className="text-gray-500">
                  {searchTerm || selectedCategory !== 'all' 
                    ? 'Prøv å endre søkekriteriene dine' 
                    : 'Last opp ditt første dokument for å komme i gang'
                  }
                </p>
              </div>
            ) : (
              <div style={{ border: '2px solid #3B82F6', borderRadius: '8px', padding: '16px', backgroundColor: '#f0f9ff' }}>
                <h3 style={{ margin: '0 0 16px 0', color: '#1e40af', fontSize: '16px', fontWeight: 'bold' }}>
                  🔍 HTML TEST VERSJON - Midlertidig for å teste knapp-problemet
                </h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', border: '1px solid #e5e7eb' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f3f4f6' }}>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontWeight: 'bold' }}>Dokument</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontWeight: 'bold' }}>Kategori</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontWeight: 'bold' }}>Størrelse</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontWeight: 'bold' }}>TEST KNAPP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocuments.map((document: any) => {
                      console.log('HTML TEST - Rendering document row:', document.name);
                      return (
                        <tr key={document.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <td style={{ padding: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span style={{ fontSize: '24px' }}>{getDocumentIcon(document.category)}</span>
                              <div>
                                <div style={{ fontWeight: '500' }}>{document.name}</div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>{document.description}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span style={{ 
                              backgroundColor: '#e5e7eb', 
                              padding: '4px 8px', 
                              borderRadius: '4px',
                              fontSize: '12px'
                            }}>
                              {document.category}
                            </span>
                          </td>
                          <td style={{ padding: '12px', fontSize: '14px', color: '#6b7280' }}>
                            {document.size ? formatFileSize(document.size) : 'Ukjent'}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <button
                              onClick={() => {
                                console.log('HTML TEST - Button clicked for:', document.name);
                                alert('HTML TEST KNAPP FUNGERER! Document: ' + document.name);
                                handleViewDocument(document);
                              }}
                              style={{
                                backgroundColor: '#3B82F6',
                                color: 'white',
                                padding: '12px 24px',
                                borderRadius: '8px',
                                border: '2px solid #1d4ed8',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: 'bold',
                                marginRight: '8px',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                              }}
                              onMouseOver={(e) => {
                                (e.target as HTMLElement).style.backgroundColor = '#2563EB';
                                (e.target as HTMLElement).style.transform = 'scale(1.05)';
                              }}
                              onMouseOut={(e) => {
                                (e.target as HTMLElement).style.backgroundColor = '#3B82F6';
                                (e.target as HTMLElement).style.transform = 'scale(1)';
                              }}
                            >
                              👁️ HTML TEST VIS RAPPORT
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
        {/* Rapport visningsmodal */}
        {viewingDocument && (
          <Dialog open={!!viewingDocument} onOpenChange={() => setViewingDocument(null)}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {viewingDocument.name}
                </DialogTitle>
              </DialogHeader>
              <div className="mt-4">
                {viewingDocument.data ? (
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold mb-2">Rapport informasjon:</h3>
                      <p><strong>Navn:</strong> {viewingDocument.name}</p>
                      <p><strong>Beskrivelse:</strong> {viewingDocument.description}</p>
                      <p><strong>Opprettet:</strong> {new Date(viewingDocument.createdAt).toLocaleDateString('nb-NO')}</p>
                    </div>
                    
                    {/* Vis rapportdata som tabell */}
                    {Array.isArray(viewingDocument.data) && viewingDocument.data.length > 0 ? (
                      <div className="border rounded-lg overflow-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {Object.keys(viewingDocument.data[0]).map((key) => (
                                <TableHead key={key} className="font-semibold">
                                  {key}
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {viewingDocument.data.map((row: any, index: number) => (
                              <TableRow key={index}>
                                {Object.values(row).map((value: any, cellIndex: number) => (
                                  <TableCell key={cellIndex}>
                                    {typeof value === 'number' 
                                      ? value.toLocaleString('nb-NO', { minimumFractionDigits: 2 })
                                      : String(value || '-')
                                    }
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-500">Ingen data funnet i rapporten</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p>Laster rapport...</p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AppShell>
  );
}