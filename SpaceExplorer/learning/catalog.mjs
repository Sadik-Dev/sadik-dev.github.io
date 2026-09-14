import en from './locales/en.mjs';
import fr from './locales/fr.mjs';
import nl from './locales/nl.mjs';
import de from './locales/de.mjs';
import ar from './locales/ar.mjs';

export const LEARNING_LANGUAGES = [
	{ code: 'en', name: 'English', dir: 'ltr' },
	{ code: 'fr', name: 'Français', dir: 'ltr' },
	{ code: 'nl', name: 'Nederlands', dir: 'ltr' },
	{ code: 'de', name: 'Deutsch', dir: 'ltr' },
	{ code: 'ar', name: 'العربية', dir: 'rtl' }
];

const catalogs = { en, fr, nl, de, ar };

export function getLearningCatalog( code = 'en' ) {
	return Object.hasOwn( catalogs, code ) ? catalogs[ code ] : en;
}
