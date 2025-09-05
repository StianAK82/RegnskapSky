/**
 * Centralized Legal Terms and Standard Text for Oppdragsavtaler
 * Based on Regnskap Norge 2021 standards and Norwegian accounting law
 * 
 * All legal text, terms, and conditions are centralized here to ensure consistency
 * between UI previews and PDF generation.
 */

export interface LegalTermsSection {
  title: string;
  content: string[];
  includePageBreak?: boolean;
}

export interface StandardTermsConfig {
  includeStandardTerms: boolean;
  includeDpa: boolean;
  includeItBilag: boolean;
  paymentTermsDays: number;
  noticeMonths: number;
}

/**
 * Standard Terms and Conditions (Alminnelige vilkår)
 */
export const STANDARD_TERMS: LegalTermsSection = {
  title: "ALMINNELIGE VILKÅR",
  includePageBreak: true,
  content: [
    "Denne oppdragsavtalen reguleres av følgende alminnelige vilkår som er en integrert del av avtalen.",
    "",
    "1. OPPDRAGETS OMFANG",
    "Regnskapsførerens ansvar og plikter er begrenset til de tjenester som er spesifisert i denne oppdragsavtalen. Eventuelle endringer i oppdragets omfang må avtales skriftlig mellom partene.",
    "",
    "Oppdragstaker vil utføre tjenestene i samsvar med god regnskapsførerskikk, gjeldende lovverk og forskrifter, herunder regnskapsloven, bokføringsloven og merverdiavgiftsloven.",
    "",
    "2. OPPDRAGSGIVERS PLIKTER",
    "Oppdragsgiver plikter å:",
    "• Levere alle nødvendige bilag og dokumenter i riktig tid og format",
    "• Sikre at alle opplysninger som gis er korrekte og fullstendige", 
    "• Oppbevare grunnlagsdokumentasjon i henhold til bokføringslovens krav",
    "• Gi oppdragstaker tilgang til nødvendige systemer og informasjon",
    "• Varsle om alle forhold som kan påvirke regnskapet eller rapporteringen",
    "",
    "3. TAUSHETSPLIKT",
    "Oppdragstaker har taushetsplikt om alle forhold som blir kjent gjennom oppdraget, jf. regnskapsførerloven § 6-1. Taushetsplikten gjelder også etter oppdragets opphør.",
    "",
    "4. ANSVAR OG BEGRENSNINGER",
    "Oppdragstakers ansvar er begrenset til direkte økonomisk tap som følge av feil eller forsømmelser i arbeidet. Ansvaret kan ikke overstige det årlige honorar for oppdraget.",
    "",
    "Oppdragstaker er ikke ansvarlig for:",
    "• Tap som følge av oppdragsgivers mangelfulle eller feil informasjon",
    "• Konsekvenser av forhold utenfor oppdragstakers kontroll",
    "• Indirekte tap, herunder tapt fortjeneste",
    "",
    "5. OPPBEVARING AV DOKUMENTER",
    "Oppdragstaker oppbevarer regnskapsmateriale og korrespondanse i minimum 5 år etter avsluttet regnskapsår, eller så lenge det følger av lov eller forskrift.",
    "",
    "6. KVALITETSSIKRING",
    "Oppdragstaker har etablert kvalitetssikringssystemer for å sikre høy kvalitet på tjenestene. Dette inkluderer rutiner for kontroll, godkjenning og oppfølging av arbeidet."
  ]
};

/**
 * Payment and Invoice Terms (Honorar og betaling)
 */
export const PAYMENT_TERMS: LegalTermsSection = {
  title: "HONORAR OG BETALING", 
  includePageBreak: true,
  content: [
    "Honorar og betalingsbetingelser for oppdraget er regulert som følger:",
    "",
    "1. HONORAR",
    "Honoraret beregnes etter de satser og prinsipper som fremgår av oppdragsspesifikasjonen. Alle priser er oppgitt eksklusive merverdiavgift.",
    "",
    "For timebasert honorar gjelder følgende:",
    "• Minimum fakturerbar enhet er 15 minutter",
    "• Hastearbeid utenom normal arbeidstid kan pålegges et tillegg på inntil 50%",
    "• Reise og ventetid faktureres etter gjeldende timesats",
    "",
    "2. PRISJUSTERING", 
    "Honoraret kan justeres årlig i takt med konsumprisindeksen eller etter særskilt avtale mellom partene.",
    "",
    "3. FAKTURERING OG BETALING",
    "Fakturaer sendes månedlig og forfaller til betaling innen {{paymentTermsDays}} dager fra fakturadato.",
    "",
    "Ved forsinket betaling påløper forsinkelsesrenter i henhold til lov om renter ved forsinket betaling. Purregebyr og inkasosalær kommer i tillegg.",
    "",
    "4. SYSTEMKOSTNADER",
    "Eventuelle kostnader for lisenser, systemtilgang eller tredjepartstjenester faktureres separat eller inkluderes i det månedlige honoraret som spesifisert i avtalen.",
    "",
    "5. UTLEGG",
    "Nødvendige utlegg i forbindelse med oppdraget, som porto, kopiering og reiseutgifter, faktureres i tillegg til honoraret."
  ]
};

/**
 * Termination Terms (Oppsigelse og avslutning)
 */
export const TERMINATION_TERMS: LegalTermsSection = {
  title: "OPPSIGELSE OG AVSLUTNING",
  includePageBreak: true, 
  content: [
    "Bestemmelser om oppsigelse og avslutning av oppdragsforholdet:",
    "",
    "1. OPPSIGELSESPERIODE",
    "Avtalen kan sies opp av begge parter med {{noticeMonths}} måneders skriftlig varsel til utløpet av en kalendermåned.",
    "",
    "2. ØYEBLIKKELIG OPPSIGELSE",
    "Avtalen kan sies opp uten varsel dersom:",
    "• Den andre part vesentlig misligholder sine forpliktelser",
    "• Det foreligger betalingsmislighold som ikke rettes etter skriftlig påminnelse",
    "• Oppdragsgiver mister autorisasjon eller tillatelse som er nødvendig for virksomheten",
    "",
    "3. OVERLEVERING VED OPPHØR",
    "Ved oppdragets opphør skal:",
    "• Alt regnskapsmateriale og dokumenter overleveres oppdragsgiver",
    "• Pågående arbeid sluttføres eller overføres på en forsvarlig måte", 
    "• Alle systemtilganger og fullmakter tilbakekalles",
    "• Utestående honorar gjøres opp",
    "",
    "4. TAUSHETSPLIKT ETTER OPPHØR",
    "Taushetsplikten gjelder også etter oppdragets opphør.",
    "",
    "5. OPPBEVARING ETTER OPPHØR", 
    "Oppdragstaker oppbevarer dokumenter som lovpålagt også etter oppdragets opphør, og leverer disse tilbake til oppdragsgiver ved forespørsel."
  ]
};

/**
 * Data Processing Agreement (Databehandleravtale)
 */
export const DATA_PROCESSING_TERMS: LegalTermsSection = {
  title: "DATABEHANDLERAVTALE (DPA)",
  includePageBreak: true,
  content: [
    "Denne databehandleravtalen regulerer behandlingen av personopplysninger i forbindelse med oppdraget.",
    "",
    "1. ROLLER OG ANSVAR",
    "• Oppdragsgiver er behandlingsansvarlig for personopplysninger i egen virksomhet",
    "• Oppdragstaker er databehandler når personopplysninger behandles på vegne av oppdragsgiver",
    "",
    "2. BEHANDLINGSGRUNNLAG",
    "Behandlingen av personopplysninger skjer basert på:",
    "• Avtale (GDPR art. 6.1.b) for oppfyllelse av regnskapsmessige forpliktelser",
    "• Rettslig forpliktelse (GDPR art. 6.1.c) for lovpålagt regnskapsføring og rapportering",
    "",
    "3. KATEGORIER PERSONOPPLYSNINGER",
    "Følgende kategorier personopplysninger kan behandles:",
    "• Kontaktopplysninger (navn, telefon, e-post, adresse)",
    "• Lønnsinformasjon og personaldata",
    "• Kundeforhold og transaksjonsdata",
    "• Økonomiske opplysninger relatert til regnskapsføring",
    "",
    "4. BEHANDLINGENS FORMÅL",
    "Personopplysninger behandles kun for følgende formål:",
    "• Utførelse av regnskapsførertjenester",
    "• Overholdelse av lovpålagte rapporteringsforpliktelser", 
    "• Kommunikasjon og oppfølging av oppdraget",
    "",
    "5. SIKKERHETSTILTAK",
    "Oppdragstaker har implementert passende tekniske og organisatoriske tiltak for å beskytte personopplysninger, inkludert:",
    "• Kryptering av data i overføring og hvile",
    "• Tilgangskontroll og autentisering",
    "• Regelmessig sikkerhetskopier og gjenoppretting",
    "• Opplæring av personale i datasikkerhet",
    "",
    "6. DATAOVERFØRING",
    "Personopplysninger kan overføres til tredjeland eller internasjonale organisasjoner kun med passende sikkerhetstiltak og i samsvar med GDPR kapittel V.",
    "",
    "7. SLETTING OG TILBAKELEVERING",
    "Ved oppdragets opphør slettes eller tilbakeleveres alle personopplysninger, med mindre oppbevaring er påkrevet av lov."
  ]
};

/**
 * IT Attachment Terms (IT-bilag)
 */
export const IT_ATTACHMENT_TERMS: LegalTermsSection = {
  title: "IT-BILAG OG TEKNISKE BESTEMMELSER",
  includePageBreak: true,
  content: [
    "Tekniske bestemmelser og IT-relaterte forhold for oppdraget:",
    "",
    "1. REGNSKAPSSYSTEM",
    "Regnskapsføring utføres i {{systemName}} som er oppdragsgivers valgte regnskapssystem. Lisens og tilganger administreres som avtalt i oppdragsspesifikasjonen.",
    "",
    "2. DATAFORMAT OG OVERFØRING",  
    "• Bilag og dokumenter kan leveres både fysisk og digitalt",
    "• Digitale bilag aksepteres i formatene PDF, JPG, PNG og XML",
    "• Bankdata overføres fortrinnsvis via automatiserte banktjenester",
    "",
    "3. BACKUP OG DATASIKKERHET",
    "• Regnskapsdata sikkerheetskopieres daglig",
    "• Backup oppbevares kryptert og geografisk adskilt fra primærdata",
    "• Gjenopprettingstesting utføres regelmessig",
    "",
    "4. SYSTEMOPPDATERINGER",
    "• Regnskapssystemet holdes oppdatert med siste versjon og sikkerhetsoppdateringer",
    "• Større systemendringer varsles på forhånd",
    "• Nedetid for vedlikehold planlegges utenfor normal arbeidstid",
    "",
    "5. TILGANGSKONTROLL",
    "• Tilgang til regnskapsdata er strengt kontrollert og logges",
    "• Brukertilganger tildeles basert på minste privilegium-prinsippet",
    "• Tilganger gjennomgås og oppdateres regelmessig",
    "",
    "6. RAPPORTERING OG EKSPORT", 
    "• Standardrapporter leveres i PDF-format via e-post",
    "• Rådata kan eksporteres i Excel eller CSV-format ved forespørsel",
    "• Alle rapporter arkiveres digitalt for senere referanse",
    "",
    "7. SUPPORT OG VEDLIKEHOLD",
    "• Teknisk support er tilgjengelig i normal arbeidstid (08:00-16:00)",
    "• Kritiske feil og systemproblemer prioriteres høyest",
    "• Systemvedlikehold utføres etter forhåndsavtalt plan"
  ]
};

/**
 * Legal Framework and Compliance (Rettslig rammeverk)
 */
export const LEGAL_FRAMEWORK: LegalTermsSection = {
  title: "RETTSLIG RAMMEVERK OG ETTERLEVELSE",
  includePageBreak: true,
  content: [
    "Oppdragets utførelse er underlagt følgende rettslige rammer:",
    "",
    "1. GJELDENDE LOVVERK",
    "Oppdraget utføres i samsvar med:",
    "• Regnskapsloven med forskrifter",
    "• Bokføringsloven og bokføringsforskriften",
    "• Merverdiavgiftsloven og -forskriften",
    "• Regnskapsførerloven",
    "• Foretaksloven og aksjeloven der relevant",
    "• Personopplysningsloven og GDPR",
    "",
    "2. FAGLIGE STANDARDER",
    "Arbeidet utføres etter:",
    "• God regnskapsførerskikk etablert av Norsk Regnskapsstiftelse",
    "• Norsk Regnskapsstiftelse (NRS) standarder",
    "• Regnskap Norge sine anbefalinger og veiledninger",
    "",
    "3. ETISKE RETNINGSLINJER",
    "Oppdragstaker følger:",
    "• Regnskap Norge sine etiske retningslinjer",
    "• Autoriserte regnskapsføreres æresråd sine vedtak",
    "• Prinsipper om integritet, objektivitet og faglig kompetanse",
    "",
    "4. MELDEPLIKT",
    "Ved avdekking av vesentlige feil eller uregelmessigheter har oppdragstaker plikt til å:",
    "• Informere oppdragsgiver umiddelbart",
    "• Bistå med retting av forhold som kan rettes",
    "• Vurdere meldeplikt til offentlige myndigheter der lovverket krever det",
    "",
    "5. TVISTER OG KONFLIKTER",
    "Eventuelle tvister søkes løst ved forhandling. Dersom dette ikke fører frem, kan saken bringes inn for de ordinære domstolene med Oslo tingrett som verneting.",
    "",
    "6. FORCE MAJEURE",
    "Oppdragstaker fritas for ansvar ved hindringer som skyldes forhold utenfor oppdragstakers kontroll, som krigshandlinger, naturkatastrofer, streik eller nye myndighetspåbud."
  ]
};

/**
 * Quality Assurance and Control (Kvalitetssikring)
 */
export const QUALITY_ASSURANCE: LegalTermsSection = {
  title: "KVALITETSSIKRING OG KONTROLL",
  includePageBreak: false,
  content: [
    "Kvalitetssikring av regnskapsførertjenester:",
    "",
    "1. INTERN KVALITETSKONTROLL",
    "• Alle regnskaper gjennomgås av autorisert regnskapsfører før levering",
    "• Kritiske poster og transaksjoner dobbeltsjekkes",
    "• Månedlige kvalitetsvurderinger og oppfølging",
    "",
    "2. EKSTERNE KONTROLLER",
    "• Årlig kvalitetskontroll av Regnskap Norge eller tilsvarende organ",
    "• Deltakelse i faglige nettverk og erfaringsutveksling",
    "• Regelmessig oppdatering av faglig kompetanse",
    "",
    "3. KONTINUERLIG FORBEDRING",
    "• Kunde- og leverandørfeedback følges opp systematisk",
    "• Rutiner og prosesser evalueres og forbedres løpende",
    "• Investeringer i nye verktøy og teknologi vurderes regelmessig"
  ]
};

/**
 * Generate complete legal terms based on configuration
 */
export function generateStandardTerms(config: StandardTermsConfig): LegalTermsSection[] {
  const sections: LegalTermsSection[] = [];

  if (config.includeStandardTerms) {
    sections.push(STANDARD_TERMS);
    sections.push({
      ...PAYMENT_TERMS,
      content: PAYMENT_TERMS.content.map(line => 
        line.replace('{{paymentTermsDays}}', config.paymentTermsDays.toString())
      )
    });
    sections.push({
      ...TERMINATION_TERMS,
      content: TERMINATION_TERMS.content.map(line => 
        line.replace('{{noticeMonths}}', config.noticeMonths.toString())
      )
    });
    sections.push(LEGAL_FRAMEWORK);
    sections.push(QUALITY_ASSURANCE);
  }

  if (config.includeDpa) {
    sections.push(DATA_PROCESSING_TERMS);
  }

  if (config.includeItBilag) {
    sections.push(IT_ATTACHMENT_TERMS);
  }

  return sections;
}

/**
 * Get legal terms as plain text for PDF generation
 */
export function getLegalTermsAsText(config: StandardTermsConfig): string {
  const sections = generateStandardTerms(config);
  return sections.map(section => {
    return [section.title, '', ...section.content].join('\n');
  }).join('\n\n');
}

/**
 * Get legal terms formatted for HTML/UI preview
 */
export function getLegalTermsAsHtml(config: StandardTermsConfig): string {
  const sections = generateStandardTerms(config);
  return sections.map(section => {
    const title = `<h2 class="legal-section-title">${section.title}</h2>`;
    const content = section.content.map(line => {
      if (line === '') return '<br/>';
      if (line.match(/^\d+\./)) return `<h3 class="legal-subsection">${line}</h3>`;
      if (line.startsWith('•')) return `<li class="legal-bullet">${line.substring(1).trim()}</li>`;
      return `<p class="legal-paragraph">${line}</p>`;
    }).join('\n');
    
    const pageBreak = section.includePageBreak ? '<div class="page-break"></div>' : '';
    return `${title}\n${content}\n${pageBreak}`;
  }).join('\n\n');
}

/**
 * Legal terms metadata
 */
export const LEGAL_TERMS_METADATA = {
  version: "2021.1",
  basedOn: "Regnskap Norge 2021 standarder",
  lastUpdated: "2024-09-01",
  applicableFrom: "2024-01-01"
};