import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Sidebar } from '@/components/layout/sidebar';
import { TopBar } from '@/components/layout/top-bar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface DocumentCategorization {
  category: string;
  confidence: number;
  suggestedAccount: string;
  amount?: number;
  description: string;
}

interface AccountingSuggestion {
  account: string;
  description: string;
  debitAmount?: number;
  creditAmount?: number;
  vatCode?: string;
}

export default function AIAssistant() {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'assistant',
      content: 'Hei! Jeg er din AI-assistent for regnskapsføring. Jeg kan hjelpe deg med bilagskategorisering, konteringsforslag og besvare regnskapsspørsmål. Hva kan jeg hjelpe deg med i dag?',
      timestamp: new Date(),
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [documentText, setDocumentText] = useState('');
  const [fileName, setFileName] = useState('');
  const [transactionDescription, setTransactionDescription] = useState('');
  const [transactionAmount, setTransactionAmount] = useState('');
  const { toast } = useToast();

  const chatMutation = useMutation({
    mutationFn: async (question: string) => {
      const response = await apiRequest('POST', '/api/ai/ask', { question });
      return response.json();
    },
    onSuccess: (data) => {
      const assistantMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'assistant',
        content: data.answer,
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, assistantMessage]);
    },
    onError: (error: any) => {
      toast({
        title: 'Feil',
        description: error.message || 'Kunne ikke få svar fra AI',
        variant: 'destructive',
      });
    },
  });

  const categorizeMutation = useMutation({
    mutationFn: async ({ fileName, extractedText }: { fileName: string; extractedText: string }) => {
      const response = await apiRequest('POST', '/api/ai/categorize-document', {
        fileName,
        extractedText,
      });
      return response.json();
    },
    onError: (error: any) => {
      toast({
        title: 'Feil',
        description: error.message || 'Kunne ikke kategorisere dokument',
        variant: 'destructive',
      });
    },
  });

  const suggestionsMutation = useMutation({
    mutationFn: async ({ description, amount }: { description: string; amount: number }) => {
      const response = await apiRequest('POST', '/api/ai/accounting-suggestions', {
        description,
        amount,
        documentType: 'invoice',
      });
      return response.json();
    },
    onError: (error: any) => {
      toast({
        title: 'Feil',
        description: error.message || 'Kunne ikke generere konteringsforslag',
        variant: 'destructive',
      });
    },
  });

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: chatInput,
      timestamp: new Date(),
    };

    setChatMessages(prev => [...prev, userMessage]);
    chatMutation.mutate(chatInput);
    setChatInput('');
  };

  const handleDocumentCategorize = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileName.trim()) {
      toast({
        title: 'Feil',
        description: 'Filnavn er påkrevd',
        variant: 'destructive',
      });
      return;
    }

    categorizeMutation.mutate({
      fileName,
      extractedText: documentText,
    });
  };

  const handleAccountingSuggestions = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionDescription.trim() || !transactionAmount) {
      toast({
        title: 'Feil',
        description: 'Beskrivelse og beløp er påkrevd',
        variant: 'destructive',
      });
      return;
    }

    const amount = parseFloat(transactionAmount);
    if (isNaN(amount)) {
      toast({
        title: 'Feil',
        description: 'Ugyldig beløp',
        variant: 'destructive',
      });
      return;
    }

    suggestionsMutation.mutate({
      description: transactionDescription,
      amount,
    });
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800';
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 ml-64 overflow-hidden">
        <TopBar 
          title="AI-Assistent" 
          subtitle="Intelligent hjelp til regnskapsføring og dokumenthåndtering" 
        />
        
        <main className="flex-1 overflow-y-auto p-6">
          <Tabs defaultValue="chat" className="h-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="chat">
                <i className="fas fa-comments mr-2"></i>
                Chat
              </TabsTrigger>
              <TabsTrigger value="categorize">
                <i className="fas fa-tags mr-2"></i>
                Kategorisering
              </TabsTrigger>
              <TabsTrigger value="suggestions">
                <i className="fas fa-lightbulb mr-2"></i>
                Konteringsforslag
              </TabsTrigger>
            </TabsList>

            {/* Chat Tab */}
            <TabsContent value="chat" className="h-full">
              <Card className="h-full flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <i className="fas fa-robot text-accent mr-2"></i>
                    AI Regnskapsassistent
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="flex-1 flex flex-col">
                  <div className="flex-1 overflow-y-auto bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="space-y-4">
                      {chatMessages.map((message) => (
                        <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            message.type === 'user' 
                              ? 'bg-primary text-white' 
                              : 'bg-white border shadow-sm'
                          }`}>
                            {message.type === 'assistant' && (
                              <div className="flex items-center mb-2">
                                <div className="w-6 h-6 bg-accent rounded-full flex items-center justify-center mr-2">
                                  <i className="fas fa-robot text-white text-xs"></i>
                                </div>
                                <span className="text-xs text-gray-500">AI-Assistent</span>
                              </div>
                            )}
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            <p className="text-xs opacity-70 mt-1">
                              {message.timestamp.toLocaleTimeString('nb-NO')}
                            </p>
                          </div>
                        </div>
                      ))}
                      
                      {chatMutation.isPending && (
                        <div className="flex justify-start">
                          <div className="max-w-xs bg-white border shadow-sm rounded-lg px-4 py-2">
                            <div className="flex items-center">
                              <div className="w-6 h-6 bg-accent rounded-full flex items-center justify-center mr-2">
                                <i className="fas fa-robot text-white text-xs"></i>
                              </div>
                              <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <form onSubmit={handleChatSubmit} className="flex space-x-2">
                    <Input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Skriv ditt regnskapsspørsmål..."
                      className="flex-1"
                      disabled={chatMutation.isPending}
                    />
                    <Button 
                      type="submit" 
                      disabled={chatMutation.isPending || !chatInput.trim()}
                      className="bg-accent hover:bg-green-600"
                    >
                      <i className="fas fa-paper-plane"></i>
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Document Categorization Tab */}
            <TabsContent value="categorize">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Dokumentkategorisering</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleDocumentCategorize} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Filnavn *</label>
                        <Input
                          value={fileName}
                          onChange={(e) => setFileName(e.target.value)}
                          placeholder="f.eks. faktura_123.pdf"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-2">Dokumentinnhold (valgfritt)</label>
                        <Textarea
                          value={documentText}
                          onChange={(e) => setDocumentText(e.target.value)}
                          placeholder="Lim inn tekst fra dokumentet eller beskriv innholdet..."
                          rows={6}
                        />
                      </div>
                      
                      <Button 
                        type="submit" 
                        className="w-full bg-primary hover:bg-blue-700"
                        disabled={categorizeMutation.isPending}
                      >
                        {categorizeMutation.isPending ? (
                          <i className="fas fa-spinner fa-spin mr-2"></i>
                        ) : (
                          <i className="fas fa-magic mr-2"></i>
                        )}
                        Kategoriser dokument
                      </Button>
                    </form>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Kategoriseringsresultat</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {categorizeMutation.data ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                          <p className="text-lg font-semibold">{categorizeMutation.data.category}</p>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Konfidensnivå</label>
                          <Badge className={getConfidenceColor(categorizeMutation.data.confidence)}>
                            {Math.round(categorizeMutation.data.confidence * 100)}%
                          </Badge>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Foreslått konto</label>
                          <p className="text-lg font-mono">{categorizeMutation.data.suggestedAccount}</p>
                        </div>
                        
                        {categorizeMutation.data.amount && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Identifisert beløp</label>
                            <p className="text-lg">{categorizeMutation.data.amount.toLocaleString('nb-NO', {
                              style: 'currency',
                              currency: 'NOK'
                            })}</p>
                          </div>
                        )}
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Beskrivelse</label>
                          <p className="text-gray-600">{categorizeMutation.data.description}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <i className="fas fa-file-alt text-4xl mb-4"></i>
                        <p>Last opp eller beskriv et dokument for å få AI-forslag til kategorisering</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Accounting Suggestions Tab */}
            <TabsContent value="suggestions">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Konteringsforslag</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleAccountingSuggestions} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Transaksjonsbeskrivelse *</label>
                        <Textarea
                          value={transactionDescription}
                          onChange={(e) => setTransactionDescription(e.target.value)}
                          placeholder="Beskriv transaksjonen, f.eks. 'Kjøp av kontormaterialer fra Staples'"
                          rows={3}
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-2">Beløp (NOK) *</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={transactionAmount}
                          onChange={(e) => setTransactionAmount(e.target.value)}
                          placeholder="0.00"
                          required
                        />
                      </div>
                      
                      <Button 
                        type="submit" 
                        className="w-full bg-primary hover:bg-blue-700"
                        disabled={suggestionsMutation.isPending}
                      >
                        {suggestionsMutation.isPending ? (
                          <i className="fas fa-spinner fa-spin mr-2"></i>
                        ) : (
                          <i className="fas fa-calculator mr-2"></i>
                        )}
                        Generer konteringsforslag
                      </Button>
                    </form>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>AI-genererte konteringsforslag</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {suggestionsMutation.data && Array.isArray(suggestionsMutation.data) ? (
                      <div className="space-y-4">
                        {suggestionsMutation.data.map((suggestion: AccountingSuggestion, index: number) => (
                          <div key={index} className="border rounded-lg p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-medium">Konto {suggestion.account}</p>
                                <p className="text-sm text-gray-600">{suggestion.description}</p>
                              </div>
                              {suggestion.vatCode && (
                                <Badge variant="outline">MVA: {suggestion.vatCode}</Badge>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 mt-3">
                              {suggestion.debitAmount && (
                                <div>
                                  <span className="text-xs text-gray-500">Debet</span>
                                  <p className="font-mono">
                                    {suggestion.debitAmount.toLocaleString('nb-NO', {
                                      style: 'currency',
                                      currency: 'NOK'
                                    })}
                                  </p>
                                </div>
                              )}
                              
                              {suggestion.creditAmount && (
                                <div>
                                  <span className="text-xs text-gray-500">Kredit</span>
                                  <p className="font-mono">
                                    {suggestion.creditAmount.toLocaleString('nb-NO', {
                                      style: 'currency',
                                      currency: 'NOK'
                                    })}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <i className="fas fa-calculator text-4xl mb-4"></i>
                        <p>Beskriv en transaksjon for å få AI-genererte konteringsforslag</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
