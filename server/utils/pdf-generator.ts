// server/utils/pdf-generator.ts
import jsPDF from "jspdf";

export function generateEngagementPDF(client: any, engagement: any) {
  const doc = new jsPDF();

  const safe = (v: any, fallback = "Ikke oppgitt") =>
    (v === null || v === undefined || v === "") ? fallback : String(v);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "Ikke oppgitt";
    return new Date(dateStr).toLocaleDateString("nb-NO");
  };

  const formatCurrency = (amount: number) => {
    if (!amount || isNaN(amount)) return "Ikke oppgitt";
    return new Intl.NumberFormat('nb-NO', { 
      style: 'currency', 
      currency: 'NOK' 
    }).format(amount);
  };

  // Professional Norwegian color scheme
  const colors = {
    primary: [0, 51, 102],      // Dark blue
    secondary: [51, 102, 153],   // Medium blue
    accent: [204, 204, 204],     // Light gray
    text: [51, 51, 51]          // Dark gray
  };

  let y = 20;

  // Helper functions for better layout
  const addHeader = () => {
    // Company header section
    doc.setFillColor(...colors.primary);
    doc.rect(0, 0, 210, 35, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("ZALDO AS", 15, 18);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Autorisert regnskapsførerselskap", 15, 25);
    doc.text("Org.nr: 123 456 789 MVA", 15, 30);
    
    // Contact info (right aligned)
    doc.text("Telefon: +47 123 45 678", 210 - 15, 18, { align: 'right' });
    doc.text("E-post: post@zaldo.no", 210 - 15, 25, { align: 'right' });
    doc.text("www.zaldo.no", 210 - 15, 30, { align: 'right' });
    
    y = 50;
  };

  const addTitle = () => {
    doc.setTextColor(...colors.text);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("OPPDRAGSAVTALE", 105, y, { align: "center" });
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("I henhold til bestemmelsene i regnskapsloven og bokføringsloven", 105, y + 8, { align: "center" });
    y += 25;
  };

  const addSection = (title: string, content: (() => void)) => {
    // Section header with background
    doc.setFillColor(...colors.secondary);
    doc.rect(15, y - 5, 180, 12, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(title, 20, y + 3);
    
    y += 15;
    doc.setTextColor(...colors.text);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    
    content();
    y += 8;
  };

  const addLine = (label: string, value: string, indent = 0) => {
    doc.setFont("helvetica", "normal");
    doc.text(`${label}:`, 20 + indent, y);
    doc.setFont("helvetica", "bold");
    doc.text(value, 80 + indent, y);
    y += 6;
  };

  // Build PDF
  addHeader();
  addTitle();

  // Date and reference
  doc.setFontSize(10);
  doc.text(`Dato: ${formatDate(new Date().toISOString())}`, 15, y);
  doc.text(`Avtale-ID: ${safe(engagement.id)}`, 210 - 15, y, { align: 'right' });
  y += 15;

  // Client Information Section
  addSection("1. KLIENTINFORMASJON", () => {
    addLine("Firmanavn", safe(client.legalName || client.name));
    addLine("Organisasjonsnummer", safe(client.orgNumber));
    addLine("Adresse", safe(client.address));
    addLine("Postadresse", safe(client.postalAddress));
    addLine("Kontaktperson", safe(client.contactName));
    addLine("E-post", safe(client.contactEmail));
    addLine("Telefon", safe(client.contactPhone));
  });

  // Engagement Details Section  
  addSection("2. OPPDRAGSBESKRIVELSE", () => {
    addLine("System", safe(engagement.systemName));
    addLine("Lisensholder", engagement.licenseHolder === 'client' ? 'Klient' : 'Regnskapskontor');
    addLine("Administrator-tilgang", engagement.adminAccess ? "Ja" : "Nei");
    addLine("Gyldig fra", formatDate(engagement.validFrom));
    addLine("Status", engagement.status === 'draft' ? 'Utkast' : 
                     engagement.status === 'active' ? 'Aktiv' : 
                     engagement.status || 'Ikke oppgitt');
  });

  // Signatories Section
  if (Array.isArray(engagement.signatories) && engagement.signatories.length > 0) {
    addSection("3. KONTAKTPERSONER OG SIGNATURRETT", () => {
      engagement.signatories.forEach((sig: any, index: number) => {
        const roleText = sig.role === 'client_representative' ? 'Klientrepresentant' :
                        sig.role === 'responsible_accountant' ? 'Oppdragsansvarlig regnskapsfører' :
                        sig.role === 'managing_director' ? 'Daglig leder' : 
                        safe(sig.role);
        
        doc.setFont("helvetica", "bold");
        doc.text(`${index + 1}. ${safe(sig.name)}`, 20, y);
        y += 5;
        
        doc.setFont("helvetica", "normal");
        addLine("Rolle", roleText, 5);
        if (sig.title) addLine("Tittel", safe(sig.title), 5);
        addLine("E-post", safe(sig.email), 5);
        if (sig.phone) addLine("Telefon", safe(sig.phone), 5);
        y += 3;
      });
    });
  }

  // Scope of Work Section
  if (Array.isArray(engagement.scopes) && engagement.scopes.length > 0) {
    addSection("4. ARBEIDSOMRÅDER", () => {
      engagement.scopes.forEach((scope: any, index: number) => {
        const scopeText = scope.scopeKey === 'bookkeeping' ? 'Løpende bokføring' :
                         scope.scopeKey === 'year_end' ? 'Årsoppgjør' :
                         scope.scopeKey === 'payroll' ? 'Lønn' :
                         scope.scopeKey === 'invoicing' ? 'Fakturering' :
                         scope.scopeKey === 'mva' ? 'Merverdiavgift' :
                         scope.scopeKey === 'period_reports' ? 'Perioderapporter' :
                         scope.scopeKey === 'project' ? 'Prosjektoppgave' :
                         scope.scopeKey === 'other' ? 'Annet' :
                         safe(scope.scopeKey);
        
        doc.setFont("helvetica", "bold");
        doc.text(`${index + 1}. ${scopeText}`, 20, y);
        y += 5;
        
        doc.setFont("helvetica", "normal");
        addLine("Frekvens", safe(scope.frequency), 5);
        if (scope.comments) {
          doc.text("Beskrivelse:", 25, y);
          y += 5;
          const splitText = doc.splitTextToSize(safe(scope.comments), 150);
          splitText.forEach((line: string) => {
            doc.text(line, 25, y);
            y += 5;
          });
        }
        y += 3;
      });
    });
  }

  // Pricing Section
  if (Array.isArray(engagement.pricing) && engagement.pricing.length > 0) {
    addSection("5. HONORAR OG BETINGELSER", () => {
      engagement.pricing.forEach((price: any, index: number) => {
        const areaText = price.area === 'bookkeeping' ? 'Løpende bokføring' :
                        price.area === 'year_end' ? 'Årsoppgjør' :
                        price.area === 'payroll' ? 'Lønn' :
                        price.area === 'invoicing' ? 'Fakturering' :
                        price.area === 'mva' ? 'Merverdiavgift' :
                        price.area === 'period_reports' ? 'Perioderapporter' :
                        price.area === 'project' ? 'Prosjektoppgave' :
                        price.area === 'other' ? 'Annet' :
                        safe(price.area);
        
        doc.setFont("helvetica", "bold");
        doc.text(`${index + 1}. ${areaText}`, 20, y);
        y += 5;
        
        doc.setFont("helvetica", "normal");
        if (price.model === 'hourly') {
          addLine("Prising", "Timebasert", 5);
          addLine("Timepris eks. mva", formatCurrency(price.hourlyRateExVat), 5);
          addLine("Minimum fakturerbar tid", `${price.minTimeUnitMinutes || 15} minutter`, 5);
        } else if (price.model === 'fixed') {
          addLine("Prising", "Fast pris", 5);
          addLine("Beløp eks. mva", formatCurrency(price.fixedAmountExVat), 5);
          addLine("Periode", price.fixedPeriod === 'monthly' ? 'Månedlig' :
                           price.fixedPeriod === 'quarterly' ? 'Kvartalsvis' :
                           price.fixedPeriod === 'yearly' ? 'Årlig' :
                           safe(price.fixedPeriod), 5);
        } else if (price.model === 'volume') {
          addLine("Prising", "Volumbasert", 5);
          addLine("Enhet", safe(price.volumeUnitLabel), 5);
          addLine("Pris per enhet eks. mva", formatCurrency(price.volumeUnitPriceExVat), 5);
        }
        
        if (price.rushMarkupPercent && price.rushMarkupPercent > 0) {
          addLine("Hastearbeid tillegg", `${price.rushMarkupPercent}%`, 5);
        }
        
        if (price.systemCostsNote) {
          doc.text("Systemkostnader:", 25, y);
          y += 5;
          const splitText = doc.splitTextToSize(safe(price.systemCostsNote), 150);
          splitText.forEach((line: string) => {
            doc.text(line, 25, y);
            y += 5;
          });
        }
        y += 3;
      });
    });
  }

  // Legal Terms Section
  addSection("6. GENERELLE BESTEMMELSER", () => {
    const legalTerms = [
      "Oppdraget utføres i henhold til god regnskapsskikk og gjeldende lovgivning.",
      "Betalingsbetingelser: 14 dager netto fra fakturadato.",
      "Oppsigelsesfrist: 3 måneder fra den ene part til den andre.",
      "Tvisteløsning: Eventuelle tvister løses ved ordinær domstol.",
      "Taushetsplikt: Regnskapskontoret er underlagt lovbestemt taushetsplikt.",
      "Forsikring: Regnskapskontoret har profesjonsansvarsforsikring."
    ];
    
    legalTerms.forEach((term, index) => {
      doc.text(`${index + 1}. ${term}`, 20, y);
      y += 6;
    });
  });

  // Check if new page is needed for signatures
  if (y > 250) {
    doc.addPage();
    y = 20;
  }

  // Signatures Section
  addSection("7. UNDERSKRIFTER", () => {
    doc.text("Denne avtalen er bindende når den er undertegnet av begge parter:", 20, y);
    y += 15;
    
    // Client signature
    doc.text("For klienten:", 20, y);
    doc.line(20, y + 15, 90, y + 15);
    doc.text("Dato og signatur", 20, y + 20);
    doc.text(safe(client.contactName || client.name), 20, y + 25);
    
    // Accounting firm signature  
    doc.text("For Zaldo AS:", 120, y);
    doc.line(120, y + 15, 190, y + 15);
    doc.text("Dato og signatur", 120, y + 20);
    doc.text("Autorisert regnskapsfører", 120, y + 25);
  });

  // Footer with page number and date
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(`Side ${i} av ${pageCount}`, 105, 290, { align: 'center' });
    doc.text(`Generert: ${formatDate(new Date().toISOString())}`, 15, 290);
  }

  return doc;
}