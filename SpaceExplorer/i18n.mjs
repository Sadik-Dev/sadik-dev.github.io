import { getBody } from './solar-data.mjs';
import en from './locales/en.mjs';
import fr from './locales/fr.mjs';
import nl from './locales/nl.mjs';
import de from './locales/de.mjs';
import ar from './locales/ar.mjs';

export const LANGUAGES = [
	{ code: 'en', name: 'English', dir: 'ltr' },
	{ code: 'fr', name: 'Français', dir: 'ltr' },
	{ code: 'nl', name: 'Nederlands', dir: 'ltr' },
	{ code: 'de', name: 'Deutsch', dir: 'ltr' },
	{ code: 'ar', name: 'العربية', dir: 'rtl' }
];

const catalogs = { en, fr, nl, de, ar };
const textFields = [ 'name', 'type', 'tagline', 'description', 'fact' ];

function supportedLanguage( value ) {
	if ( typeof value !== 'string' ) return;
	const code = value.trim().toLowerCase().split( /[-_]/ )[ 0 ];
	return Object.hasOwn( catalogs, code ) ? code : undefined;
}

export function resolveLanguage( { query, stored, languages = [] } = {} ) {
	return supportedLanguage( query ) || supportedLanguage( stored ) ||
		languages.map( supportedLanguage ).find( Boolean ) || 'en';
}

function translation( section, key ) {
	const value = section && Object.hasOwn( section, key ) ? section[ key ] : undefined;
	return typeof value === 'string' && value.trim() ? value : undefined;
}

export function createI18n( initial = 'en' ) {
	let language = supportedLanguage( initial ) || 'en';

	function setLanguage( code ) {
		language = supportedLanguage( code ) || 'en';
	}

	function t( key, values = {} ) {
		const text = translation( catalogs[ language ]?.ui, key ) || translation( en.ui, key ) || key;
		return text.replace( /\{(\w+)\}/g, ( match, name ) => Object.hasOwn( values, name ) ? String( values[ name ] ) : match );
	}

	function number( value, options = {} ) {
		return new Intl.NumberFormat( language === 'ar' ? 'ar-u-nu-arab' : language, options ).format( value );
	}

	function displayNumbers( value ) {
		return String( value ).match( /[−-]?\d[\d,]*(?:\.\d+)?/g ).map( token => {
			const decimals = token.split( '.' )[ 1 ]?.length || 0;
			return number( Number( token.replaceAll( ',', '' ).replace( '−', '-' ) ), {
				minimumFractionDigits: decimals, maximumFractionDigits: decimals
			} );
		} );
	}

	function body( id ) {
		const source = getBody( id );
		if ( !source ) return;
		const localized = { ...source };
		for ( const field of textFields ) {
			localized[ field ] = translation( catalogs[ language ]?.worlds?.[ id ], field ) ||
				translation( en.worlds?.[ id ], field ) || source[ field ];
		}
		localized.diameter = displayNumbers( source.diameter )[ 0 ] + ' ' + t( 'km' );
		localized.distance = displayNumbers( source.distance )[ 0 ] + ' ' + t( 'au' );
		const [ from, to ] = displayNumbers( source.temperature );
		localized.temperature = ( to === undefined ? from : t( 'range', { from, to } ) ) + ' ' + t( 'celsius' );
		localized.year = displayNumbers( source.year )[ 0 ];
		localized.yearUnit = t( source.yearUnit );
		const rotationDays = Math.abs( source.rotationDays );
		localized.rotation = t( 'rotationValue', {
			number: number( rotationDays < 2 ? rotationDays * 24 : rotationDays, { maximumFractionDigits: 1 } ),
			unit: t( rotationDays < 2 ? 'hours' : 'days' )
		} );
		return localized;
	}

	return { get language() { return language; }, setLanguage, t, number, body };
}
