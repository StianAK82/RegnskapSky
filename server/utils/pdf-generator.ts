// server/utils/pdf-generator.ts
import jsPDF from "jspdf";
import type { EngagementPDFModel } from "../shared/engagement";

export function generateEngagementPDF(model: EngagementPDFModel) {
  console.log('🖨️ PDF GENERATOR: Starting PDF generation for engagement:', model.engagement.id);
  console.log('📄 PDF GENERATOR: Using practice branding:', { 
    firmName: model.practice.firmName,
    orgNumber: model.practice.orgNumber
  });

  const doc = new jsPDF();

  const safe = (v: any, fallback = "Ikke angitt") =>
    (v === null || v === undefined || v === "") ? fallback : String(v);

  const formatCurrency = (amount: number | null) => {
    if (!amount || isNaN(amount)) return "Ikke angitt";
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
    doc.text(safe(model.practice.firmName), 15, 18);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Autorisert regnskapsførerselskap", 15, 25);
    doc.text(`Org.nr: ${safe(model.practice.orgNumber)} MVA`, 15, 30);
    
    // Contact info (right aligned)
    doc.text(`Telefon: ${safe(model.practice.phone)}`, 210 - 15, 18, { align: 'right' });
    doc.text(`E-post: ${safe(model.practice.email)}`, 210 - 15, 25, { align: 'right' });
    doc.text(safe(model.practice.website?.replace(/^https?:\/\//, '') || model.practice.website), 210 - 15, 30, { align: 'right' });
    
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
  doc.text(`Dato: ${safe(model.engagement.validFrom)}`, 15, y);
  doc.text(`Avtale-ID: ${safe(model.engagement.id)}`, 210 - 15, y, { align: 'right' });
  y += 15;

  // Client Information Section
  addSection("1. KLIENTINFORMASJON", () => {
    addLine("Firmanavn", safe(model.client.legalName || model.client.name));
    addLine("Organisasjonsnummer", safe(model.client.orgNumber));
    addLine("Adresse", safe(model.client.address));
    addLine("Postadresse", safe(model.client.postalAddress));
    if (model.client.contact) {
      addLine("Kontaktperson", safe(model.client.contact.name));
      addLine("E-post", safe(model.client.contact.email));
      addLine("Telefon", safe(model.client.contact.phone));
    }
  });

  // Engagement Details Section  
  addSection("2. OPPDRAGSBESKRIVELSE", () => {
    addLine("System", safe(model.engagement.system.name));
    addLine("Lisensholder", safe(model.engagement.system.licenseHolder));
    addLine("Administrator-tilgang", model.engagement.system.adminAccess ? "Ja" : "Nei");
    addLine("Gyldig fra", safe(model.engagement.validFrom));
    if (model.engagement.validTo) {
      addLine("Gyldig til", safe(model.engagement.validTo));
    }
    addLine("Status", safe(model.engagement.status));
  });

  // Signatories Section
  if (model.signatories.length > 0) {
    addSection("3. KONTAKTPERSONER OG SIGNATURRETT", () => {
      model.signatories.forEach((sig, index) => {
        doc.setFont("helvetica", "bold");
        doc.text(`${index + 1}. ${safe(sig.name)}`, 20, y);
        y += 5;
        
        doc.setFont("helvetica", "normal");
        addLine("Rolle", safe(sig.role), 5);
        if (sig.title) addLine("Tittel", safe(sig.title), 5);
        addLine("E-post", safe(sig.email), 5);
        if (sig.phone) addLine("Telefon", safe(sig.phone), 5);
        y += 3;
      });
    });
  }

  // Scope of Work Section
  if (model.scopes.length > 0) {
    addSection("4. ARBEIDSOMRÅDER", () => {
      model.scopes.forEach((scope, index) => {
        doc.setFont("helvetica", "bold");
        doc.text(`${index + 1}. ${safe(scope.name)}`, 20, y);
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
  if (model.pricing.length > 0) {
    addSection("5. HONORAR OG BETINGELSER", () => {
      model.pricing.forEach((price, index) => {
        doc.setFont("helvetica", "bold");
        doc.text(`${index + 1}. ${safe(price.area)}`, 20, y);
        y += 5;
        
        doc.setFont("helvetica", "normal");
        if (price.model === 'hourly') {
          addLine("Prising", "Timebasert", 5);
          addLine("Timepris eks. mva", formatCurrency(price.hourlyRateExVat), 5);
          addLine("Minimum fakturerbar tid", `${price.minTimeUnitMinutes || 15} minutter`, 5);
        } else if (price.model === 'fixed') {
          addLine("Prising", "Fast pris", 5);
          addLine("Beløp eks. mva", formatCurrency(price.fixedAmountExVat), 5);
          if (price.fixedPeriod) {
            addLine("Periode", safe(price.fixedPeriod), 5);
          }
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
      `Betalingsbetingelser: ${model.legalTerms.paymentTermsDays} dager netto fra fakturadato.`,
      `Oppsigelsesfrist: ${model.legalTerms.noticeMonths} måneder fra den ene part til den andre.`,
      "Tvisteløsning: Eventuelle tvister løses ved ordinær domstol.",
      "Taushetsplikt: Regnskapskontoret er underlagt lovbestemt taushetsplikt.",
      "Forsikring: Regnskapskontoret har profesjonsansvarsforsikring."
    ];
    
    if (model.legalTerms.includeDpa) {
      legalTerms.push("Databehandleravtale: Vedlagt som del av avtalen.");
    }
    
    if (model.legalTerms.includeItBilag) {
      legalTerms.push("IT-bilag: Vedlagt som del av avtalen.");
    }
    
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
    doc.text(safe(model.client.contact?.name || model.client.name), 20, y + 25);
    
    // Accounting firm signature  
    doc.text(`For ${safe(model.practice.firmName)}:`, 120, y);
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
    doc.text(`Generert: ${safe(model.generatedAt)}`, 15, 290);
  }

  return doc;
}