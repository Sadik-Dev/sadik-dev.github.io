import { SITE_URL } from '../site-config.mjs';

export const MISSION_IDS = [ 'day-year', 'planet-families', 'earth-moon' ];
const defaultUrl = new URL( 'learn/', SITE_URL );
const languages = [ 'en', 'fr', 'nl', 'de', 'ar' ];
const views = [ 'missions', 'atlas', 'resources', 'research' ];
const storageKey = 'spaceexplorer.learning.v1';
const emptyLesson = () => ( { step: 0, answers: [ null, null, null ], checked: false } );

function lesson( value ) {
	const answers = Array.from( { length: 3 }, ( _, index ) => {
		const answer = value?.answers?.[ index ];
		return Number.isInteger( answer ) && answer >= 0 && answer < 3 ? answer : null;
	} );
	const checked = value?.checked === true && answers.every( answer => answer !== null );
	return { step: [ 0, 1, 2 ].includes( value?.step ) ? value.step : 0, answers, checked };
}

export function readProgress( raw ) {
	try {
		const value = JSON.parse( raw );
		if ( !value || typeof value !== 'object' || Array.isArray( value ) ) return {};
		return Object.fromEntries( MISSION_IDS.filter( id => Object.hasOwn( value, id ) ).map( id => [ id, lesson( value[ id ] ) ] ) );
	} catch { return {}; }
}

export function updateProgress( progress, id, patch ) {
	if ( !MISSION_IDS.includes( id ) ) throw new Error( 'Unknown mission.' );
	return { ...progress, [ id ]: lesson( { ...emptyLesson(), ...progress[ id ], ...patch } ) };
}

export function gradeMission( mission, answers = [] ) {
	const results = mission.questions.map( ( question, index ) => answers[ index ] === question.correct );
	const complete = mission.questions.every( ( question, index ) => Number.isInteger( answers[ index ] ) && answers[ index ] >= 0 && answers[ index ] < question.options.length );
	return { score: results.filter( Boolean ).length, total: results.length, complete, results };
}

export function learningRoute( value ) {
	const url = new URL( value, defaultUrl );
	const query = url.searchParams;
	const view = views.includes( query.get( 'view' ) ) ? query.get( 'view' ) : 'missions';
	return {
		view,
		mission: view === 'missions' && MISSION_IDS.includes( query.get( 'mission' ) ) ? query.get( 'mission' ) : null,
		language: languages.includes( query.get( 'lang' ) ) ? query.get( 'lang' ) : null,
		embed: query.get( 'embed' ) === '1'
	};
}

export function learningUrl( route, base = defaultUrl ) {
	const url = new URL( './', base );
	if ( languages.includes( route.language ) ) url.searchParams.set( 'lang', route.language );
	if ( views.includes( route.view ) && route.view !== 'missions' ) url.searchParams.set( 'view', route.view );
	else if ( MISSION_IDS.includes( route.mission ) ) url.searchParams.set( 'mission', route.mission );
	if ( route.embed ) url.searchParams.set( 'embed', '1' );
	return url.href;
}

export function createProgressStore( storage ) {
	let progress = {};
	let persistent = Boolean( storage );
	function refresh() {
		if ( !persistent ) return;
		try { progress = readProgress( storage.getItem( storageKey ) ); } catch { persistent = false; }
	}
	refresh();
	return {
		get persistent() { return persistent; },
		get( id ) { refresh(); return lesson( progress[ id ] ); },
		all() { refresh(); return structuredClone( progress ); },
		update( id, patch ) {
			refresh();
			progress = updateProgress( progress, id, patch );
			try { storage?.setItem( storageKey, JSON.stringify( progress ) ); } catch { persistent = false; }
			return this.get( id );
		},
		reset() {
			progress = {};
			try { storage?.removeItem( storageKey ); } catch { persistent = false; }
		}
	};
}
