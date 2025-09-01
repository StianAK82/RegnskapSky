import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { FileText, Search, Download, Eye, Trash2, Upload, Filter } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

export default function DocumentsFixed() {
  console.log('=== DOCUMENTS FIXED COMPONENT LOADED ===');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewingDocument, setViewingDocument] = useState<any>(null);
  const { toast } = useToast();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['/api/documents'],
  }) as { data: any[], isLoading: boolean };

  // NEW FUNCTION - Direct server fetch with employee details
  const handleViewDocument = async (document: any) => {
    console.log('=== FIXED FUNCTION CALLED ===');
    console.log('Document:', document.name, 'ID:', document.id);
    
    // Always fetch fresh data from server
    const authToken = localStorage.getItem('auth_token') || localStorage.getItem('token');
    if (!authToken) {
      console.error('No auth token found');
      return;
    }
    
    try {
      console.log('CALLING SERVER /api/documents/' + document.id + '/view');
      const response = await fetch(`/api/documents/${document.id}/view`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const serverData = await response.json();
        console.log('SUCCESS - Server data:', serverData);
        
        setViewingDocument({
          ...document,
          data: Array.isArray(serverData) ? serverData : [serverData]
        });
        
      } else {
        console.error('Server error:', response.status);
        const errorText = await response.text();
        console.error('Error details:', errorText);
        
        setViewingDocument({
          ...document,
          data: [{ Klient: `Server-feil ${response.status}`, 'Totale timer': 0, 'Fakturerbare timer': 0 }]
        });
      }
    } catch (error) {
      console.error('Network error:', error);
      setViewingDocument({
        ...document,
        data: [{ Klient: 'Nettverksfeil - kunne ikke koble til server', 'Totale timer': 0, 'Fakturerbare timer': 0 }]
      });
    }
  };

  const filteredDocuments = documents.filter((doc: any) => {
    const matchesSearch = doc.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(documents.map((doc: any) => doc.category).filter(Boolean)));

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getDocumentIcon = (category: string) => {
    switch (category) {
      case 'Rapporter': return '📊';
      case 'Fakturaer': return '🧾';
      case 'Kontrakter': return '📋';
      case 'Bilag': return '🧾';
      default: return '📄';
    }
  };

  return (
    <AppShell title="Dokumenter (Fixed)" subtitle="Administrer og last ned dokumenter">
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
              <Input
                placeholder="Søk etter dokumentnavn..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
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
          </CardContent>
        </Card>

        {/* Document List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Dokumenter ({filteredDocuments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
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
                    {filteredDocuments.map((document: any) => (
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
                            onClick={() => handleViewDocument(document)}
                            title="Vis rapport med ansattdetaljer"
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
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* View Document Dialog */}
        {viewingDocument && (
          <Dialog open={!!viewingDocument} onOpenChange={() => setViewingDocument(null)}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>📄 {viewingDocument.name}</DialogTitle>
              </DialogHeader>
              
              <div className="mt-4">
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-lg font-semibold mb-2">Rapport informasjon:</h3>
                  <p><strong>Navn:</strong> {viewingDocument.name}</p>
                  <p><strong>Beskrivelse:</strong> {viewingDocument.description || 'Generert rapport - ' + viewingDocument.name}</p>
                  <p><strong>Opprettet:</strong> {new Date().toLocaleDateString('nb-NO')}</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-100">
                        {viewingDocument.data && viewingDocument.data.length > 0 && Object.keys(viewingDocument.data[0]).map((key: string) => (
                          <th key={key} className="border border-gray-300 px-4 py-2 text-left font-semibold">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {viewingDocument.data && viewingDocument.data.map((row: any, index: number) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          {Object.values(row).map((value: any, cellIndex: number) => (
                            <td key={cellIndex} className="border border-gray-300 px-4 py-2">
                              {value}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AppShell>
  );
}