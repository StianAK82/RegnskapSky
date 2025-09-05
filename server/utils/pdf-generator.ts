// server/utils/pdf-generator.ts
import jsPDF from "jspdf";

export function generateEngagementPDF(client: any, engagement: any) {
  const doc = new jsPDF();

  const safe = (v: any, fallback = "Ikke oppgitt") =>
    (v === null || v === undefined || v === "") ? fallback : String(v);

  const created = new Date(engagement.createdAt).toLocaleDateString("nb-NO");
  const validFrom = new Date(engagement.validFrom).toLocaleDateString("nb-NO");

  let y = 20;
  const line = (txt: string, isBold = false) => {
    if (isBold) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
    } else {
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
    }
    doc.text(txt, 10, y);
    y += isBold ? 10 : 7;
  };

  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("OPPDRAGSAVTALE", 105, 20, { align: "center" });
  y = 40;

  // Client Information
  line("KLIENTINFORMASJON", true);
  line(`Selskap: ${safe(client.name)}`);
  line(`Organisasjonsnummer: ${safe(client.orgNumber)}`);
  line(`E-post: ${safe(client.email)}`);
  line(`Telefon: ${safe(client.phone)}`);
  y += 5;

  // Contract Details
  line("AVTALEDETALJER", true);
  line(`Avtale ID: ${safe(engagement.id)}`);
  line(`System: ${safe(engagement.systemName)}`);
  line(`Lisensholder: ${safe(engagement.licenseHolder)}`);
  line(`Admin-tilgang: ${engagement.adminAccess ? "Ja" : "Nei"}`);
  line(`Status: ${safe(engagement.status)}`);
  line(`Opprettet: ${created}`);
  line(`Gyldig fra: ${validFrom}`);
  y += 5;

  // Signatories
  if (Array.isArray(engagement.signatories)) {
    line(`SIGNATARER (${engagement.signatories.length})`, true);
    engagement.signatories.forEach((sig: any) =>
      line(`- ${safe(sig.name, "Ukjent")} (${safe(sig.role, "Ukjent rolle")})`)
    );
    y += 5;
  }

  // Scopes
  if (Array.isArray(engagement.scopes)) {
    line(`ARBEIDSOMRÅDER (${engagement.scopes.length})`, true);
    engagement.scopes.forEach((scope: any) =>
      line(`- ${safe(scope.comments || scope.name, "Ukjent område")}: Frekvens ${safe(scope.frequency, "Ikke oppgitt")}`)
    );
    y += 5;
  }

  // Pricing
  if (Array.isArray(engagement.pricing)) {
    line("PRISING", true);
    engagement.pricing.forEach((price: any) =>
      line(`- ${safe(price.area, "Ukjent")}: ${safe(price.hourlyRateExVat, "0")} kr/time`)
    );
  }

  return doc;
}