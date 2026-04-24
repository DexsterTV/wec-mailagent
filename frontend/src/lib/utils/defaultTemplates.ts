import type { Template } from '../../types'

export const DEFAULT_TEMPLATES: Template[] = [
  {
    id: 'news-short',
    name: 'Newsletter Skrócony',
    _v: 2,
    fields: [
      {
        id: 'preheader',
        label: 'Preheader (ukryty tekst)',
        type: 'text',
        default: 'Najnowsze informacje z naszego biura prasowego',
      },
      { id: 'title', label: 'Tytuł mailingu', type: 'text', default: 'Najnowsze Informacje' },
      { id: 'lead', label: 'Lead / Wstęp', type: 'textarea', default: 'Wstęp do newslettera...' },
      { id: 'showHeroImage', label: 'Pokaż główny obrazek', type: 'boolean', default: 'true' },
      {
        id: 'heroImage',
        label: 'URL Obrazka (Hero)',
        type: 'image-url',
        default:
          'https://images.unsplash.com/photo-1555421689-491a97ff2040?auto=format&fit=crop&w=600&h=300&q=80',
        visibleIf: 'showHeroImage',
      },
      { id: 'ctaText', label: 'Tekst przycisku', type: 'text', default: 'Czytaj więcej' },
      { id: 'ctaUrl', label: 'URL przycisku', type: 'text', default: 'https://example.com' },
      { id: 'contactFooter', label: 'Stopka kontaktowa', type: 'contact-select' },
    ],
    html: `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; color: #333333;">
    <div style="display: none; max-height: 0px; overflow: hidden;">
        {{preheader}}
    </div>
    <!--[if:showHeroImage]-->
    <div style="margin-bottom: 24px;">
        <img src="{{heroImage}}" alt="Hero" style="width: 100%; height: auto; border-radius: 12px; display: block;">
    </div>
    <!--[/if:showHeroImage]-->
    <div style="padding: 0 20px;">
        <h1 style="font-size: 26px; color: #111827; margin-bottom: 16px;">{{title}}</h1>
        <p style="font-size: 16px; line-height: 1.6; color: #4B5563;">{{lead}}</p>
        <div style="margin: 32px 0;">
            <a href="{{ctaUrl}}" style="background-color: #4F46E5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">{{ctaText}}</a>
        </div>
        <!--[ifnotempty:contactFooter]-->
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 32px 0;">
        <div style="font-size: 14px; color: #6B7280; line-height: 1.5;">
            {{contactFooter}}
        </div>
        <!--[/ifnotempty:contactFooter]-->
    </div>
</div>`,
  },
  {
    id: 'press-release',
    name: 'Informacja Prasowa',
    _v: 2,
    fields: [
      { id: 'title', label: 'Tytuł Informacji', type: 'text', default: 'Nowy produkt na rynku' },
      { id: 'date', label: 'Data', type: 'text', default: '13 kwietnia 2026' },
      {
        id: 'content',
        label: 'Treść (akapity)',
        type: 'textarea',
        default: 'Firma ogłasza dzisiaj...\n\nDrugi akapit tekstu.',
      },
      { id: 'contactFooter', label: 'Kontakt dla mediów', type: 'contact-select' },
    ],
    html: `
<div style="font-family: Georgia, serif; max-width: 700px; margin: 0 auto; padding: 40px; background: #fafafa; border: 1px solid #eaeaea;">
    <p style="font-size: 14px; color: #666; margin-bottom: 24px; text-transform: uppercase; letter-spacing: 1px;">INFORMACJA PRASOWA | {{date}}</p>
    <h1 style="font-size: 32px; color: #111; margin-bottom: 24px; line-height: 1.2;">{{title}}</h1>
    <div style="font-size: 18px; line-height: 1.8; color: #333;">
        {{content}}
    </div>
    <!--[ifnotempty:contactFooter]-->
    <div style="margin-top: 60px; border-top: 2px solid #111; padding-top: 20px;">
        <p style="font-weight: bold; margin-bottom: 12px; font-family: Arial, sans-serif; font-size: 14px; text-transform: uppercase;">Kontakt dla mediów:</p>
        <div style="font-family: Arial, sans-serif; font-size: 15px; color: #444; line-height: 1.5;">
            {{contactFooter}}
        </div>
    </div>
    <!--[/ifnotempty:contactFooter]-->
</div>`,
  },
]
