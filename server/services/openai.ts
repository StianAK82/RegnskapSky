import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable must be set");
}

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface DocumentCategorization {
  category: string;
  confidence: number;
  suggestedAccount: string;
  amount?: number;
  description: string;
}

export interface AccountingSuggestion {
  account: string;
  description: string;
  debitAmount?: number;
  creditAmount?: number;
  vatCode?: string;
}

export async function categorizeDocument(
  fileName: string, 
  extractedText?: string
): Promise<DocumentCategorization> {
  try {
    const prompt = `Du er en ekspert norsk regnskapsfører. Analyser dette dokumentet og kategoriser det.

Dokument: ${fileName}
${extractedText ? `Innhold: ${extractedText}` : ''}

Returner et JSON-objekt med følgende format:
{
  "category": "kategori av dokument (f.eks. 'Kjøp av varer', 'Reiseutgifter', 'Kontorrekvisita')",
  "confidence": "konfidensnivå fra 0-1",
  "suggestedAccount": "foreslått kontonummer (norsk kontoplan)",
  "amount": "beløp hvis det kan identifiseres",
  "description": "kort beskrivelse av dokumentet"
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Du er en norsk regnskapsekspert som hjelper med dokumentkategorisering og kontering. Svar alltid på norsk og bruk norsk kontoplan."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      category: result.category || "Ukategorisert",
      confidence: Math.max(0, Math.min(1, result.confidence || 0.5)),
      suggestedAccount: result.suggestedAccount || "1920",
      amount: result.amount,
      description: result.description || "Automatisk kategorisert dokument"
    };
  } catch (error) {
    console.error('OpenAI categorization error:', error);
    return {
      category: "Ukategorisert",
      confidence: 0,
      suggestedAccount: "1920",
      description: "Feil ved automatisk kategorisering"
    };
  }
}

export async function generateAccountingSuggestions(
  description: string,
  amount: number,
  documentType?: string
): Promise<AccountingSuggestion[]> {
  try {
    const prompt = `Du er en norsk regnskapsekspert. Lag konteringsforslag for denne transaksjonen:

Beskrivelse: ${description}
Beløp: ${amount} NOK
Type dokument: ${documentType || 'Ikke spesifisert'}

Returner et JSON-objekt med følgende format:
{
  "suggestions": [
    {
      "account": "kontonummer fra norsk kontoplan",
      "description": "kontobeskrivelse",
      "debitAmount": "debet beløp hvis relevant",
      "creditAmount": "kredit beløp hvis relevant", 
      "vatCode": "mva-kode hvis relevant"
    }
  ]
}

Lag et komplett bilagsforslag med både debet og kredit som balanserer.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Du er en norsk regnskapsekspert som lager nøyaktige konteringsforslag basert på norsk kontoplan og mva-regler."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result.suggestions || [];
  } catch (error) {
    console.error('OpenAI accounting suggestions error:', error);
    return [];
  }
}

export async function askAccountingQuestion(question: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Du er en ekspert norsk regnskapsfører med dyp kunnskap om:
          - Norsk kontoplan og regnskapsregler
          - Merverdiavgift (mva) og skatteregler
          - Årsregnskapslov og regnskapsstandards
          - Praktiske regnskapsprosedyrer
          
          Svar alltid på norsk og gi praktiske, nøyaktige råd basert på norske regnskapsregler.`
        },
        {
          role: "user",
          content: question
        }
      ],
    });

    return response.choices[0].message.content || "Beklager, jeg kunne ikke generere et svar på spørsmålet ditt.";
  } catch (error) {
    console.error('OpenAI question answering error:', error);
    return "Det oppstod en feil ved behandling av spørsmålet. Vennligst prøv igjen senere.";
  }
}

export async function analyzeDocumentImage(base64Image: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyser dette regnskapsdokumentet. Trekk ut viktig informasjon som beløp, dato, leverandør, og type transaksjon. Svar på norsk."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ],
        },
      ],
      max_tokens: 500,
    });

    return response.choices[0].message.content || "Kunne ikke analysere bildet.";
  } catch (error) {
    console.error('OpenAI image analysis error:', error);
    return "Feil ved bildeanalyse. Vennligst prøv igjen.";
  }
}
