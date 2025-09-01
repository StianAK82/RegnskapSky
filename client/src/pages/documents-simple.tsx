import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiRequest } from '@/lib/queryClient';

export default function DocumentsSimple() {
  const [viewingDocument, setViewingDocument] = useState<any>(null);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['/api/documents'],
    queryFn: () => apiRequest('GET', '/api/documents').then(res => res.json())
  });

  console.log('DocumentsSimple rendering, documents:', documents.length);

  const handleViewDocument = (document: any) => {
    alert('TEST KNAPP FUNGERER! Document: ' + document.name);
    setViewingDocument({
      ...document,
      data: [
        { Klient: 'Test Klient', 'Totale timer': 5.5, 'Fakturerbare timer': 4.0 },
        { Klient: 'Annen Klient', 'Totale timer': 3.0, 'Fakturerbare timer': 3.0 }
      ]
    });
  };

  if (isLoading) {
    return (
      <AppShell title="Dokumenter Test" subtitle="Testing knapp synlighet">
        <div>Laster...</div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Dokumenter Test" subtitle="Testing knapp synlighet">
      <Card>
        <CardHeader>
          <CardTitle>Test Dokumenter ({documents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ marginBottom: '20px' }}>
            <h3>Test med enkel HTML tabell:</h3>
          </div>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>Dokument</th>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>Kategori</th>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>Test Knapp</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((document: any, index: number) => {
                console.log('Rendering simple row:', index, document.name);
                return (
                  <tr key={document.id} style={{ borderBottom: '1px solid #ddd' }}>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                      <strong>{document.name}</strong><br/>
                      <small>{document.description}</small>
                    </td>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                      <span style={{ 
                        backgroundColor: '#e5e7eb', 
                        padding: '4px 8px', 
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}>
                        {document.category}
                      </span>
                    </td>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                      <button
                        onClick={() => handleViewDocument(document)}
                        style={{
                          backgroundColor: '#3B82F6',
                          color: 'white',
                          padding: '8px 16px',
                          borderRadius: '6px',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: 'bold'
                        }}
                        onMouseOver={(e) => (e.target as HTMLElement).style.backgroundColor = '#2563EB'}
                        onMouseOut={(e) => (e.target as HTMLElement).style.backgroundColor = '#3B82F6'}
                      >
                        👁️ VIS RAPPORT TEST
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {viewingDocument && (
            <div style={{
              position: 'fixed',
              top: '0',
              left: '0',
              right: '0',
              bottom: '0',
              backgroundColor: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}>
              <div style={{
                backgroundColor: 'white',
                padding: '24px',
                borderRadius: '8px',
                maxWidth: '800px',
                maxHeight: '600px',
                overflow: 'auto',
                position: 'relative'
              }}>
                <button
                  onClick={() => setViewingDocument(null)}
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    backgroundColor: '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '8px 12px',
                    cursor: 'pointer'
                  }}
                >
                  ✕ Lukk
                </button>
                
                <h2 style={{ marginTop: '0', marginBottom: '16px' }}>📄 {viewingDocument.name}</h2>
                
                <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                  <h3>Rapport informasjon:</h3>
                  <p><strong>Navn:</strong> {viewingDocument.name}</p>
                  <p><strong>Beskrivelse:</strong> {viewingDocument.description}</p>
                  <p><strong>Kategori:</strong> {viewingDocument.category}</p>
                </div>

                <div style={{ backgroundColor: '#white', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f3f4f6' }}>
                        {viewingDocument.data && viewingDocument.data.length > 0 && Object.keys(viewingDocument.data[0]).map((key: string) => (
                          <th key={key} style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {viewingDocument.data && viewingDocument.data.map((row: any, index: number) => (
                        <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                          {Object.values(row).map((value: any, cellIndex: number) => (
                            <td key={cellIndex} style={{ padding: '12px' }}>
                              {typeof value === 'number' 
                                ? value.toLocaleString('nb-NO', { minimumFractionDigits: 2 })
                                : String(value || '-')
                              }
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}