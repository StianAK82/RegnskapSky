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

export default function DocumentsNew() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewingDocument, setViewingDocument] = useState<any>(null);
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

    // Use window.open with token and format in URL
    const downloadUrl = `/api/documents/${document.id}/download?format=excel&token=${encodeURIComponent(finalToken)}`;
    window.open(downloadUrl, '_blank');
    
    toast({
      title: "Excel nedlasting startet",
      description: "Excel-filen blir lastet ned",
    });
  };

  const handleView = (document: any) => {
    setViewingDocument(document);
  };

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return apiRequest('POST', '/api/documents/upload', formData);
    },
    onSuccess: () => {
      toast({
        title: "Suksess",
        description: "Dokument ble lastet opp",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
    },
    onError: (error: any) => {
      toast({
        title: "Feil",
        description: error.message || "Kunne ikke laste opp dokument",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', selectedCategory === 'all' ? 'Andre' : selectedCategory);
      uploadMutation.mutate(formData);
    }
  };

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dokumenter</h1>
            <p className="text-muted-foreground">
              Administrer og organiser dine dokumenter
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="file"
              id="file-upload"
              className="hidden"
              onChange={handleFileUpload}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
            />
            <Button
              onClick={() => document.getElementById('file-upload')?.click()}
              disabled={uploadMutation.isPending}
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploadMutation.isPending ? 'Laster opp...' : 'Last opp'}
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Søk i dokumenter..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            >
              <option value="all">Alle kategorier</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Navn</TableHead>
                  <TableHead className="hidden md:table-cell">Kategori</TableHead>
                  <TableHead className="hidden sm:table-cell">Størrelse</TableHead>
                  <TableHead className="hidden md:table-cell">Opprettet</TableHead>
                  <TableHead className="text-right">Handlinger</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      {searchTerm || selectedCategory !== 'all' 
                        ? 'Ingen dokumenter funnet med de valgte filtrene'
                        : 'Ingen dokumenter funnet'
                      }
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDocuments.map((document: any, index: number) => (
                    <TableRow key={document.id || index} className="hover:bg-muted/50">
                      <TableCell>
                        <span className="text-lg" role="img" aria-label={document.category}>
                          {getDocumentIcon(document.category)}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span className="line-clamp-1">{document.name}</span>
                          {document.description && (
                            <span className="text-xs text-muted-foreground line-clamp-1">
                              {document.description}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="secondary" className="text-xs">
                          {document.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {formatFileSize(document.size || 0)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {document.createdAt 
                          ? new Date(document.createdAt).toLocaleDateString('nb-NO')
                          : 'N/A'
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleView(document)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownload(document)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {document.name?.toLowerCase().includes('timer') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadExcel(document)}
                              className="text-green-600 hover:text-green-700"
                              title="Last ned som Excel"
                            >
                              📊
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Document Viewer Dialog */}
      <Dialog open={!!viewingDocument} onOpenChange={() => setViewingDocument(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-lg">{getDocumentIcon(viewingDocument?.category)}</span>
              {viewingDocument?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Kategori:</span>
                <Badge variant="secondary" className="ml-2">
                  {viewingDocument?.category}
                </Badge>
              </div>
              <div>
                <span className="font-medium">Størrelse:</span>
                <span className="ml-2">{formatFileSize(viewingDocument?.size || 0)}</span>
              </div>
              <div>
                <span className="font-medium">Opprettet:</span>
                <span className="ml-2">
                  {viewingDocument?.createdAt 
                    ? new Date(viewingDocument.createdAt).toLocaleDateString('nb-NO')
                    : 'N/A'
                  }
                </span>
              </div>
            </div>
            
            {viewingDocument?.description && (
              <div>
                <span className="font-medium">Beskrivelse:</span>
                <p className="mt-1 text-muted-foreground">{viewingDocument.description}</p>
              </div>
            )}
            
            <div className="flex gap-2 pt-4 border-t">
              <Button onClick={() => handleDownload(viewingDocument)}>
                <Download className="h-4 w-4 mr-2" />
                Last ned
              </Button>
              {viewingDocument?.name?.toLowerCase().includes('timer') && (
                <Button 
                  onClick={() => handleDownloadExcel(viewingDocument)}
                  variant="outline"
                >
                  📊 Last ned Excel
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}