import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { ObjectUploader } from "@/components/ObjectUploader";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Building2, Search, Shield, FileText, PlugIcon, 
  CheckCircle, AlertTriangle, Clock, Upload 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function NorwegianFeatures() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch clients for dropdown
  const { data: clients = [] } = useQuery({
    queryKey: ["/api/clients"],
    enabled: true
  }) as { data: any[] };

  // Brønnøysund Search
  const bronnoyundMutation = useMutation({
    mutationFn: async (query: string) => {
      const response = await apiRequest("GET", `/api/bronnoyund/search?query=${encodeURIComponent(query)}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Søk fullført",
        description: "Bedriftsinformasjon hentet fra Brønnøysundregistrene"
      });
    }
  });

  // AML/KYC Check
  const amlCheckMutation = useMutation({
    mutationFn: async ({ clientId, providerId, checkTypes }: { 
      clientId: string; 
      providerId: string; 
      checkTypes: string[] 
    }) => {
      const response = await apiRequest("POST", `/api/clients/${clientId}/aml-check`, {
        providerId,
        checkTypes
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "AML/KYC sjekk fullført",
        description: "Compliance-sjekken er gjennomført"
      });
    }
  });

  // Fetch accounting adapters
  const { data: accountingAdapters = [] } = useQuery({
    queryKey: ["/api/accounting/adapters"],
    enabled: true
  }) as { data: any[] };

  // Fetch active plugins
  const { data: activePlugins = [] } = useQuery({
    queryKey: ["/api/plugins/active"],
    enabled: true
  }) as { data: any[] };

  const handleUploadComplete = async (result: any) => {
    try {
      const uploadedFile = result.successful[0];
      if (uploadedFile && selectedClient) {
        // Save AML document metadata
        await apiRequest("POST", `/api/clients/${selectedClient}/aml-documents`, {
          documentType: "identity",
          fileName: uploadedFile.name,
          fileSize: uploadedFile.size,
          fileUrl: uploadedFile.uploadURL,
          status: "uploaded"
        });
        
        toast({
          title: "Dokument lastet opp",
          description: "AML/KYC dokument er lagret for klienten"
        });
      }
    } catch (error) {
      toast({
        title: "Feil ved opplasting",
        description: "Kunne ikke lagre dokumentet",
        variant: "destructive"
      });
    }
  };

  const getUploadParameters = async () => {
    const response = await apiRequest("POST", "/api/objects/upload");
    const data = await response.json();
    return {
      method: "PUT" as const,
      url: data.uploadURL
    };
  };

  return (
    <div className="p-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Norske Regnskapsverktøy</h1>
        <p className="text-muted-foreground">
          Avanserte norske regnskapsfunksjoner med automatisering og compliance
        </p>
      </div>

      <Tabs defaultValue="bronnoyund" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="bronnoyund" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Brønnøysund
          </TabsTrigger>
          <TabsTrigger value="aml-kyc" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            AML/KYC
          </TabsTrigger>
          <TabsTrigger value="accounting" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Regnskap
          </TabsTrigger>
          <TabsTrigger value="checklists" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Sjekklister
          </TabsTrigger>
          <TabsTrigger value="plugins" className="flex items-center gap-2">
            <PlugIcon className="h-4 w-4" />
            Plugins
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bronnoyund" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Brønnøysundregistrene
              </CardTitle>
              <CardDescription>
                Søk etter bedriftsinformasjon og hent automatisk firmaopplysninger
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Søk på organisasjonsnummer eller firmanavn..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  onClick={() => bronnoyundMutation.mutate(searchQuery)}
                  disabled={!searchQuery || bronnoyundMutation.isPending}
                >
                  <Search className="h-4 w-4 mr-2" />
                  Søk
                </Button>
              </div>

              {bronnoyundMutation.data && (
                <div className="grid gap-4 mt-4">
                  {bronnoyundMutation.data.map((company: any, index: number) => (
                    <Card key={index}>
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold">{company.name}</h3>
                            <p className="text-sm text-muted-foreground">Org.nr: {company.orgNumber}</p>
                            <p className="text-sm">{company.address}</p>
                            <div className="flex gap-2 mt-2">
                              <Badge variant="outline">{company.businessType}</Badge>
                              <Badge variant={company.isActive ? "default" : "secondary"}>
                                {company.isActive ? "Aktiv" : "Inaktiv"}
                              </Badge>
                            </div>
                          </div>
                          <Button variant="outline" size="sm">
                            Importer
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aml-kyc" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                AML/KYC Compliance
              </CardTitle>
              <CardDescription>
                Anti-hvitvask og kjenning av kunde prosedyrer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger>
                    <SelectValue placeholder="Velg klient for AML-sjekk" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client: any) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name} ({client.orgNumber || "Privat"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Automatisk AML-sjekk</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Button 
                        className="w-full"
                        disabled={!selectedClient || amlCheckMutation.isPending}
                        onClick={() => {
                          if (selectedClient) {
                            amlCheckMutation.mutate({
                              clientId: selectedClient,
                              providerId: "default",
                              checkTypes: ["identity", "sanctions", "pep", "adverse_media"]
                            });
                          }
                        }}
                      >
                        {amlCheckMutation.isPending ? (
                          <>
                            <Clock className="h-4 w-4 mr-2 animate-spin" />
                            Sjekker...
                          </>
                        ) : (
                          <>
                            <Shield className="h-4 w-4 mr-2" />
                            Kjør AML-sjekk
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Last opp dokumenter</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ObjectUploader
                        maxNumberOfFiles={5}
                        maxFileSize={20 * 1024 * 1024} // 20MB
                        onGetUploadParameters={getUploadParameters}
                        onComplete={handleUploadComplete}
                        buttonClassName="w-full"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Last opp ID/dokumenter
                      </ObjectUploader>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accounting" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Regnskapssystem-integrasjoner
              </CardTitle>
              <CardDescription>
                Koble til norske regnskapssystemer for automatisk datasynkronisering
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <h3 className="font-semibold">Støttede systemer:</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {accountingAdapters.map((adapter: any) => (
                    <Card key={adapter.type} className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium">{adapter.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {adapter.features.length} funksjoner
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checklists" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Regnskap Norge Sjekklister
              </CardTitle>
              <CardDescription>
                Automatiske sjekklister basert på bransjestandarder
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Årsavslutning</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Fullført</span>
                          <span>7/12</span>
                        </div>
                        <Progress value={58} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Månedlig bokføring</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Fullført</span>
                          <span>15/18</span>
                        </div>
                        <Progress value={83} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Kommende oppgaver:</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">MVA-rapportering</p>
                        <p className="text-xs text-muted-foreground">Frist: 10. mars 2025</p>
                      </div>
                      <Badge variant="outline">Høy prioritet</Badge>
                    </div>
                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <Clock className="h-4 w-4 text-blue-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Lønnskjøring februar</p>
                        <p className="text-xs text-muted-foreground">Frist: 25. februar 2025</p>
                      </div>
                      <Badge variant="secondary">Medium</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plugins" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlugIcon className="h-5 w-5" />
                Plugin-system
              </CardTitle>
              <CardDescription>
                Utvid systemet med tilpassede plugin og integrasjoner
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <h3 className="font-semibold">Aktive plugins:</h3>
                {activePlugins.length > 0 ? (
                  <div className="grid gap-3">
                    {activePlugins.map((plugin: any) => (
                      <Card key={plugin.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                              <PlugIcon className="h-4 w-4 text-green-600" />
                            </div>
                            <div>
                              <p className="font-medium">{plugin.name}</p>
                              <p className="text-xs text-muted-foreground">{plugin.description}</p>
                            </div>
                          </div>
                          <Badge variant="default">Aktiv</Badge>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <PlugIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Ingen aktive plugins funnet</p>
                    <p className="text-sm">Installer plugins for å utvide funksjonaliteten</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}