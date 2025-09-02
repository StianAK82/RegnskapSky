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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewingDocument, setViewingDocument] = useState<any>(null);
  const { toast } = useToast();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['/api/documents'],
  }) as { data: any[], isLoading: boolean };

  // Direct server fetch for original report data
  const handleViewDocument = async (document: any) => {
    
    // Always fetch fresh data from server
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
        
        setViewingDocument({
          ...document,
          data: Array.isArray(serverData) ? serverData : [serverData]
        });
        
      } else {
        
        setViewingDocument({
          ...document,
          data: [{ Klient: `Server-feil ${response.status}`, 'Totale timer': 0, 'Fakturerbare timer': 0 }]
        });
      }
    } catch (error) {
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
              <div className="space-y-4">
                {filteredDocuments.map((document: any) => (
                  <div
                    key={document.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <FileText className="h-5 w-5 text-blue-600" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {document.name}
                          </h3>
                          <p className="text-sm text-gray-500 truncate">
                            {document.description || 'Ingen beskrivelse'}
                          </p>
                          <div className="flex items-center space-x-4 mt-1">
                            {document.category && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                {document.category}
                              </span>
                            )}
                            <span className="text-xs text-gray-500">
                              {document.size ? formatFileSize(document.size) : 'Ukjent størrelse'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDocument(document)}
                          className="h-8 gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          Vis
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Last ned
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
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