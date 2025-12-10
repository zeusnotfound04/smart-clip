import { Request, Response } from 'express';

export const getSupportedLanguages = async (req: Request, res: Response) => {
  const languages = [
    { code: 'en-US', name: 'English (US)', priority: 1 },
    { code: 'hi-IN', name: 'Hindi (India)', priority: 1 },
    { code: 'es-ES', name: 'Spanish (Spain)', priority: 2 },
    { code: 'fr-FR', name: 'French (France)', priority: 2 },
    { code: 'de-DE', name: 'German', priority: 2 },
    { code: 'pt-BR', name: 'Portuguese (Brazil)', priority: 2 },
    { code: 'ja-JP', name: 'Japanese', priority: 3 },
    { code: 'ko-KR', name: 'Korean', priority: 3 },
    { code: 'ar-SA', name: 'Arabic (Saudi Arabia)', priority: 3 },
    { code: 'ru-RU', name: 'Russian', priority: 3 },
    { code: 'it-IT', name: 'Italian', priority: 3 },
    { code: 'nl-NL', name: 'Dutch', priority: 3 },
    { code: 'tr-TR', name: 'Turkish', priority: 3 },
    { code: 'zh-Hans', name: 'Chinese (Simplified)', priority: 3 },
    { code: 'id-ID', name: 'Indonesian', priority: 3 }
  ];

  res.json({
    languages: languages.sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name)),
    note: 'Specify language code in the request to skip auto-detection and speed up processing by 5-10x'
  });
};
