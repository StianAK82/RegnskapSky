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

  const handleViewDocumentNew = async (document: any) => {
    console.log('=== SERVER FETCH DOCUMENT DATA START ===');
    console.log('Document name:', document.name, 'ID:', document.id);
    
    // ALWAYS fetch fresh data from server with employee details
    const authToken = localStorage.getItem('auth_token') || localStorage.getItem('token');
    if (!authToken) {
      console.error('No auth token found');
      return;
    }
    
    try {
      const response = await fetch(`/api/documents/${document.id}/view`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const serverData = await response.json();
        console.log('SUCCESS - Server returned data:', serverData);
        
        if (Array.isArray(serverData) && serverData.length > 0) {
          setViewingDocument({
            ...document,
            data: serverData
          });
          console.log('DISPLAY - Using server data with employee details');
        } else {
          console.log('FALLBACK - Server returned empty, using test data');
          setViewingDocument({
            ...document,
            data: [
              { Klient: 'Ingen data fra server - viser testdata', 'Totale timer': 0, 'Fakturerbare timer': 0 }
            ]
          });
        }
      } else {
        const errorText = await response.text();
        console.error('Server error:', response.status, errorText);
        setViewingDocument({
          ...document,
          data: [
            { Klient: `Server-feil ${response.status}`, 'Totale timer': 0, 'Fakturerbare timer': 0 }
          ]
        });
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setViewingDocument({
        ...document,
        data: [
          { Klient: 'Nettverksfeil - kunne ikke hente data', 'Totale timer': 0, 'Fakturerbare timer': 0 }
        ]
      });
    }
  };

  // Keep old function for fallback but redirect to new one
  const handleViewDocument = async (document: any) => {
    return handleViewDocumentNew(document);
    
    // Parse the actual document data - check aiSuggestions first (new format)
    let documentData = [];
    try {
      // First check if aiSuggestions contains reportData (new format)
      if (document.aiSuggestions?.reportData) {
        documentData = Array.isArray(document.aiSuggestions.reportData) 
          ? document.aiSuggestions.reportData 
          : [document.aiSuggestions.reportData];
        console.log('Using aiSuggestions.reportData:', documentData);
      }
      // Check if there's data field (legacy format) 
      else if (document.data) {
        if (typeof document.data === 'string') {
          documentData = JSON.parse(document.data);
        } else if (Array.isArray(document.data)) {
          documentData = document.data;
        } else {
          documentData = [document.data];
        }
        console.log('Using document.data:', documentData);
      }
      // ALWAYS fetch from server to get latest data with employee details
      else {
        console.log('FORCING server fetch for latest employee data...');
      }
      
      // Force server fetch regardless of local data to get detailed employee info
      console.log('Fetching detailed data from server...');
      const authToken = localStorage.getItem('auth_token') || localStorage.getItem('token');
      if (authToken) {
        try {
          const response = await fetch(`/api/documents/${document.id}/view`, {
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json'
            }
          });
          if (response.ok) {
            const serverData = await response.json();
            console.log('SERVER RESPONSE:', serverData);
            if (serverData && Array.isArray(serverData) && serverData.length > 0) {
              documentData = serverData;
              console.log('Using server data with employee details:', documentData);
            } else {
              console.log('Server returned empty data, using local if available');
            }
          } else {
            console.error('Server response not ok:', response.status, response.statusText);
            const errorText = await response.text();
            console.error('Server error details:', errorText);
          }
        } catch (error) {
          console.error('Error fetching from server:', error);
        }
      }
    } catch (error) {
      console.error('Error parsing document data:', error);
    }
    
    // Show the document with actual data
    setViewingDocument({
      ...document,
      data: documentData
    });

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
              <div className="rounded-md border">

                <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', border: '1px solid #e5e7eb' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f3f4f6' }}>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontWeight: 'bold' }}>Dokument</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontWeight: 'bold' }}>Kategori</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontWeight: 'bold' }}>Størrelse</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontWeight: 'bold' }}>Handlinger</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocuments.map((document: any) => {
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
                              onClick={() => handleViewDocumentNew(document)}
                              title="Vis rapport på skjermen"
                              style={{
                                backgroundColor: '#3B82F6',
                                color: 'white',
                                padding: '8px 16px',
                                borderRadius: '6px',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: '500',
                                marginRight: '8px',
                                transition: 'all 0.2s'
                              }}
                              onMouseOver={(e) => (e.target as HTMLElement).style.backgroundColor = '#2563EB'}
                              onMouseOut={(e) => (e.target as HTMLElement).style.backgroundColor = '#3B82F6'}
                            >
                              👁️ Vis rapport
                            </button>
                            
                            <button
                              onClick={() => handleDownload(document)}
                              title="Last ned som CSV"
                              style={{
                                backgroundColor: '#6b7280',
                                color: 'white',
                                padding: '8px 12px',
                                borderRadius: '4px',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '12px',
                                marginRight: '4px',
                                transition: 'all 0.2s'
                              }}
                              onMouseOver={(e) => (e.target as HTMLElement).style.backgroundColor = '#4b5563'}
                              onMouseOut={(e) => (e.target as HTMLElement).style.backgroundColor = '#6b7280'}
                            >
                              📥 CSV
                            </button>
                            
                            {document.category === 'Rapporter' && (
                              <button
                                onClick={() => handleDownloadExcel(document)}
                                title="Last ned som Excel"
                                style={{
                                  backgroundColor: '#059669',
                                  color: 'white',
                                  padding: '8px 12px',
                                  borderRadius: '4px',
                                  border: 'none',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  marginRight: '4px',
                                  transition: 'all 0.2s'
                                }}
                                onMouseOver={(e) => (e.target as HTMLElement).style.backgroundColor = '#047857'}
                                onMouseOut={(e) => (e.target as HTMLElement).style.backgroundColor = '#059669'}
                              >
                                📊 Excel
                              </button>
                            )}
                            
                            <button
                              onClick={() => handleDelete(document)}
                              title="Slett dokument"
                              style={{
                                backgroundColor: '#dc2626',
                                color: 'white',
                                padding: '8px 12px',
                                borderRadius: '4px',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '12px',
                                transition: 'all 0.2s'
                              }}
                              onMouseOver={(e) => (e.target as HTMLElement).style.backgroundColor = '#b91c1c'}
                              onMouseOut={(e) => (e.target as HTMLElement).style.backgroundColor = '#dc2626'}
                            >
                              🗑️ Slett
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