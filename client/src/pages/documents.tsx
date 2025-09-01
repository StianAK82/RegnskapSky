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
import { FileText, Download, Upload, Search, Filter } from 'lucide-react';

export default function Documents() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const { toast } = useToast();

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

  const handleDownload = async (document: any) => {
    try {
      const token = localStorage.getItem('token');
      console.log('Download attempt:', {
        documentId: document.id,
        hasToken: !!token,
        tokenStart: token ? token.substring(0, 20) + '...' : 'none'
      });
      
      if (!token) {
        toast({
          title: "Ikke innlogget",
          description: "Du må være innlogget for å laste ned dokumenter",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(`/api/documents/${document.id}/download`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Download response:', {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Download failed:', errorText);
        throw new Error(`Failed to download document: ${response.status} - ${errorText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = document.fileName || 'document.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Nedlasting fullført",
        description: "Dokumentet ble lastet ned",
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Nedlasting feilet",
        description: error instanceof Error ? error.message : "Kunne ikke laste ned dokumentet",
        variant: "destructive",
      });
    }
  };

  const handleDownloadExcel = async (document: any) => {
    try {
      const token = localStorage.getItem('token');
      console.log('Excel download attempt:', {
        documentId: document.id,
        hasToken: !!token
      });
      
      if (!token) {
        toast({
          title: "Ikke innlogget",
          description: "Du må være innlogget for å laste ned dokumenter",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(`/api/documents/${document.id}/download?format=excel`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Excel download failed:', errorText);
        throw new Error(`Failed to download Excel: ${response.status} - ${errorText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = document.fileName?.replace('.csv', '.xlsx') || 'document.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Excel nedlasting fullført",
        description: "Excel-filen ble lastet ned",
      });
    } catch (error) {
      console.error('Excel download error:', error);
      toast({
        title: "Excel nedlasting feilet",
        description: error instanceof Error ? error.message : "Kunne ikke laste ned Excel-filen",
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
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dokument</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Størrelse</TableHead>
                      <TableHead>Opprettet</TableHead>
                      <TableHead>Handlinger</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocuments.map((document: any) => (
                      <TableRow key={document.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{getDocumentIcon(document.category)}</span>
                            <div>
                              <div className="font-medium">{document.name}</div>
                              <div className="text-sm text-gray-500">{document.description}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{document.category}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {document.size ? formatFileSize(document.size) : 'Ukjent'}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {document.createdAt ? new Date(document.createdAt).toLocaleDateString('nb-NO') : 'Ukjent'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownload(document)}
                              title="Last ned som CSV"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            {document.category === 'Rapporter' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownloadExcel(document)}
                                title="Last ned som Excel"
                                className="text-green-600"
                              >
                                📊
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}