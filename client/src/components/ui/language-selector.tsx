import { useState, useEffect } from 'react';
import { getCurrentLanguage, setLanguage, AVAILABLE_LANGUAGES } from '@/lib/i18n';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Globe } from 'lucide-react';

export function LanguageSelector() {
  const [language, setCurrentLanguage] = useState(getCurrentLanguage());

  useEffect(() => {
    const handleLanguageChange = (event: CustomEvent) => {
      setCurrentLanguage(event.detail);
    };

    window.addEventListener('languageChange', handleLanguageChange as EventListener);
    return () => {
      window.removeEventListener('languageChange', handleLanguageChange as EventListener);
    };
  }, []);

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    setCurrentLanguage(newLanguage);
    // Force a re-render of the page
    window.location.reload();
  };

  const currentLanguageData = AVAILABLE_LANGUAGES.find(lang => lang.code === language);

  return (
    <div className="flex items-center space-x-2">
      <Globe className="h-4 w-4 text-gray-500" />
      <Select value={language} onValueChange={handleLanguageChange}>
        <SelectTrigger className="w-auto min-w-[120px] border-none shadow-none focus:ring-0 bg-transparent">
          <SelectValue className="text-sm">
            <div className="flex items-center space-x-1">
              <span>{currentLanguageData?.flag}</span>
              <span className="hidden sm:inline">{currentLanguageData?.name}</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-60 overflow-y-auto">
          {AVAILABLE_LANGUAGES.map((lang) => (
            <SelectItem key={lang.code} value={lang.code}>
              <div className="flex items-center space-x-2">
                <span>{lang.flag}</span>
                <span>{lang.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}