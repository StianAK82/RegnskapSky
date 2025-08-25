interface Translations {
  [key: string]: {
    [key: string]: string;
  };
}

export const translations: Translations = {
  no: {
    // Navigation
    'dashboard': 'Dashboard',
    'clients': 'Klienter',
    'tasks': 'Oppgaver',
    'timetracking': 'Timeregistrering',
    'employees': 'Ansatte',
    'documents': 'Bilag',
    'reports': 'Rapporter',
    'notifications': 'Varsler',
    
    // Task scheduling
    'taskScheduling': 'Oppgaveplanlegging',
    'configureStandardTasks': 'Konfigurer når standardoppgaver skal utføres for denne klienten',
    'frequency': 'Frekvens',
    'responsiblePerson': 'Ansvarlig person',
    'nextDueDate': 'Neste forfallsdato',
    'saveTaskPlans': 'Lagre oppgaveplaner',
    'active': 'Aktiv',
    'inactive': 'Inaktiv',
    
    // Language selector
    'selectLanguage': 'Velg språk',
    'language': 'Språk',
  },
  
  en: {
    // Task scheduling
    'taskScheduling': 'Task Scheduling',
    'configureStandardTasks': 'Configure when standard tasks should be performed for this client',
    'frequency': 'Frequency',
    'responsiblePerson': 'Responsible Person',
    'nextDueDate': 'Next Due Date',
    'saveTaskPlans': 'Save Task Plans',
    'active': 'Active',
    'inactive': 'Inactive',
    
    // Language selector
    'selectLanguage': 'Select Language',
    'language': 'Language',
  },
  
  sv: {
    // Task scheduling
    'taskScheduling': 'Uppgiftsschemaläggning',
    'configureStandardTasks': 'Konfigurera när standarduppgifter ska utföras för denna klient',
    'frequency': 'Frekvens',
    'responsiblePerson': 'Ansvarig person',
    'nextDueDate': 'Nästa förfallodatum',
    'saveTaskPlans': 'Spara uppgiftsplaner',
    'active': 'Aktiv',
    'inactive': 'Inaktiv',
    
    // Language selector
    'selectLanguage': 'Välj språk',
    'language': 'Språk',
  },
  
  da: {
    // Task scheduling
    'taskScheduling': 'Opgaveplanlægning',
    'configureStandardTasks': 'Konfigurer hvornår standardopgaver skal udføres for denne klient',
    'frequency': 'Frekvens',
    'responsiblePerson': 'Ansvarlig person',
    'nextDueDate': 'Næste forfaldsdato',
    'saveTaskPlans': 'Gem opgaveplaner',
    'active': 'Aktiv',
    'inactive': 'Inaktiv',
    
    // Language selector
    'selectLanguage': 'Vælg sprog',
    'language': 'Sprog',
  },
  
  de: {
    // Task scheduling
    'taskScheduling': 'Aufgabenplanung',
    'configureStandardTasks': 'Konfigurieren Sie, wann Standardaufgaben für diesen Kunden ausgeführt werden sollen',
    'frequency': 'Häufigkeit',
    'responsiblePerson': 'Verantwortliche Person',
    'nextDueDate': 'Nächstes Fälligkeitsdatum',
    'saveTaskPlans': 'Aufgabenpläne speichern',
    'active': 'Aktiv',
    'inactive': 'Inaktiv',
    
    // Language selector
    'selectLanguage': 'Sprache auswählen',
    'language': 'Sprache',
  },
  
  fr: {
    // Task scheduling
    'taskScheduling': 'Planification des tâches',
    'configureStandardTasks': 'Configurer quand les tâches standard doivent être effectuées pour ce client',
    'frequency': 'Fréquence',
    'responsiblePerson': 'Personne responsable',
    'nextDueDate': 'Prochaine date d\'échéance',
    'saveTaskPlans': 'Enregistrer les plans de tâches',
    'active': 'Actif',
    'inactive': 'Inactif',
    
    // Language selector
    'selectLanguage': 'Choisir la langue',
    'language': 'Langue',
  },
  
  es: {
    // Task scheduling
    'taskScheduling': 'Programación de tareas',
    'configureStandardTasks': 'Configurar cuándo se deben realizar las tareas estándar para este cliente',
    'frequency': 'Frecuencia',
    'responsiblePerson': 'Persona responsable',
    'nextDueDate': 'Próxima fecha de vencimiento',
    'saveTaskPlans': 'Guardar planes de tareas',
    'active': 'Activo',
    'inactive': 'Inactivo',
    
    // Language selector
    'selectLanguage': 'Seleccionar idioma',
    'language': 'Idioma',
  },
  
  it: {
    // Task scheduling
    'taskScheduling': 'Pianificazione delle attività',
    'configureStandardTasks': 'Configura quando le attività standard devono essere eseguite per questo cliente',
    'frequency': 'Frequenza',
    'responsiblePerson': 'Persona responsabile',
    'nextDueDate': 'Prossima scadenza',
    'saveTaskPlans': 'Salva i piani delle attività',
    'active': 'Attivo',
    'inactive': 'Inattivo',
    
    // Language selector
    'selectLanguage': 'Seleziona lingua',
    'language': 'Lingua',
  }
};

// Simple language management without React context
let currentLanguage = typeof window !== 'undefined' 
  ? localStorage.getItem('preferredLanguage') || 'no'
  : 'no';

export function getCurrentLanguage(): string {
  return currentLanguage;
}

export function setLanguage(lang: string): void {
  currentLanguage = lang;
  if (typeof window !== 'undefined') {
    localStorage.setItem('preferredLanguage', lang);
    // Trigger a custom event to notify components
    window.dispatchEvent(new CustomEvent('languageChange', { detail: lang }));
  }
}

export function t(key: string): string {
  return translations[currentLanguage]?.[key] || translations['no'][key] || key;
}

// Available languages
export const AVAILABLE_LANGUAGES = [
  { code: 'no', name: 'Norsk', flag: '🇳🇴' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'sv', name: 'Svenska', flag: '🇸🇪' },
  { code: 'da', name: 'Dansk', flag: '🇩🇰' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'pl', name: 'Polski', flag: '🇵🇱' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
  { code: 'fi', name: 'Suomi', flag: '🇫🇮' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'cs', name: 'Čeština', flag: '🇨🇿' },
  { code: 'hu', name: 'Magyar', flag: '🇭🇺' },
  { code: 'ro', name: 'Română', flag: '🇷🇴' },
  { code: 'sk', name: 'Slovenčina', flag: '🇸🇰' },
  { code: 'sl', name: 'Slovenščina', flag: '🇸🇮' },
  { code: 'hr', name: 'Hrvatski', flag: '🇭🇷' },
  { code: 'bg', name: 'Български', flag: '🇧🇬' },
  { code: 'et', name: 'Eesti', flag: '🇪🇪' },
  { code: 'lv', name: 'Latviešu', flag: '🇱🇻' },
  { code: 'lt', name: 'Lietuvių', flag: '🇱🇹' },
  { code: 'is', name: 'Íslenska', flag: '🇮🇸' }
];