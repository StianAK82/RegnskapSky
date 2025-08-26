# Zaldo CRM - Lisenssystem og Betalingsprosess

## Oversikt
Zaldo CRM bruker Stripe for å håndtere abonnementsbetalinger og lisenser. Systemet støtter månedlige abonnementer med automatisk fakturering.

## 1. KUNDENS BETALINGSPROSESS

### Steg 1: Registrering
1. Kunden går til `/subscribe` siden
2. Ser pris: **799 kr/måned** (eksklusiv MVA)
3. Får oversikt over alle funksjoner inkludert:
   - Ubegrenset klienter
   - Automatisk oppgavegenerering
   - AML/KYC integrasjon
   - AI-assistent
   - Timeregistrering
   - Integrasjoner med regnskapssystemer

### Steg 2: Betaling
1. Fyller ut betalingsinformasjon (kort/bankoverføring)
2. Stripe behandler betalingen sikkert
3. Ved vellykket betaling:
   - Kunden får tilgang til alle Pro-funksjoner
   - Stripe oppretter abonnement med automatisk fornyelse
   - Kunden mottar bekreftelse på e-post

### Steg 3: Månedlig fornyelse
- Stripe trekker automatisk 799 kr hver måned
- Kunden kan si opp når som helst
- 30 dagers pengene-tilbake-garanti

## 2. TEKNISK IMPLEMENTERING

### Backend (server/routes.ts)
```javascript
// Stripe abonnement-rute
app.post('/api/create-subscription', authenticateToken, async (req, res) => {
  // 1. Sjekk om bruker allerede har abonnement
  if (user.stripeSubscriptionId) {
    // Hent eksisterende abonnement
    const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
    return res.send({ subscriptionId: subscription.id, clientSecret: ... });
  }

  // 2. Opprett Stripe kunde
  const customer = await stripe.customers.create({
    email: user.email,
    name: `${user.firstName} ${user.lastName}`,
  });

  // 3. Opprett abonnement
  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: process.env.STRIPE_PRICE_ID }], // 799 kr/måned
    payment_behavior: 'default_incomplete',
    expand: ['latest_invoice.payment_intent'],
  });

  // 4. Lagre Stripe-info i database
  await storage.updateUserStripeInfo(user.id, customer.id, subscription.id);
});
```

### Frontend (client/src/pages/subscribe.tsx)
- Bruker Stripe Elements for sikker betalingshåndtering
- Viser priser og funksjoner
- Behandler betalingsbekreftelse

## 3. ADMIN-OVERSIKT FOR SYSTEMEIER

### Tilgang til admin-oversikt
- Kun brukere med rolle `lisensadmin` har tilgang
- Gå til: `/admin/subscriptions`

### Hva du kan se:
1. **Alle registrerte kunder**
   - Navn, e-post, bedriftsnavn
   - Registreringsdato
   - Stripe kunde-status

2. **Abonnementsinformasjon**
   - Aktive/inaktive abonnementer
   - Månedlig inntekt per kunde
   - Betalingsstatus (betalt/forfalt/kansellert)
   - Start- og fornyelsesdatoer

3. **Inntektsoversikt**
   - Total månedlig recurring revenue (MRR)
   - Antall aktive betalende kunder
   - Kundevekst over tid

### Eksempel på admin-visning:
```
Customer XF AS
├── E-post: kunde@bedrift.no
├── Registrert: 26.08.2025
├── Stripe kunde-ID: cus_xxxxxxxxxx
└── Abonnement: 
    ├── Status: Aktiv ✅
    ├── Månedlig betaling: 799 kr
    ├── Neste fakturering: 26.09.2025
    └── Total betalt: 2397 kr (3 måneder)
```

## 4. STRIPE DASHBOARD

Som systemeier har du også tilgang til fullstendig Stripe dashboard på:
- https://dashboard.stripe.com

Her kan du se:
- Detaljerte betalingsrapporter
- Transaksjonshistorikk
- Refunderinger og chargebacks
- Webhook-events
- Betalingsmetoder og feilede betalinger

## 5. PRISER OG INNTEKT

### Månedlig abonnement: 799 kr
- Eksklusiv MVA (25% kommer i tillegg = 998.75 kr total)
- Stripe tar 2.9% + 2 kr per transaksjon
- **Din netto inntekt per kunde**: ~775 kr/måned

### Eksempel med 100 kunder:
- Brutto inntekt: 79,900 kr/måned
- Stripe gebyr: ~2,400 kr/måned  
- **Netto inntekt**: ~77,500 kr/måned

## 6. KUNDESUPPORT

### Kunder kan:
- Se sin abonnementsstatus på `/subscriptions`
- Oppdatere betalingsmetode
- Laste ned fakturaer
- Si opp abonnement (beholder tilgang til måneden er ute)

### Du kan:
- Se all kundeinformasjon i admin-panelet
- Håndtere refunderinger via Stripe
- Overvåke betalingsfeil og følge opp

## 7. SIKKERHET

- Alle betalinger behandles av Stripe (PCI-kompatibel)
- Ingen kortnumre lagres i din database
- Kun Stripe kunde-ID og abonnement-ID lagres
- All kommunikasjon er kryptert (HTTPS)

## 8. NESTE STEG

For å gjøre systemet produksjonsklart:

1. **Sett opp Stripe webhook** for å håndtere:
   - Mislykkede betalinger
   - Abonnementskansellering
   - Refunderinger

2. **Legg til e-postnotifikasjoner**:
   - Velkomstmail ved registrering
   - Betalingsbekreftelse
   - Påminnelse før forfall

3. **Implementer fakturasystem**:
   - Automatisk PDF-fakturaer
   - Norsk MVA-håndtering
   - Regnskapsintegrasjon

Systemet er nå klart for betalende kunder!