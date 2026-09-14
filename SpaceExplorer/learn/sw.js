const APP_ROOT = new URL( '../', self.location.href );
const LEARN_PATH = new URL( 'learn/', APP_ROOT ).pathname;
const CACHE_PREFIX = `spaceexplorer-learning-${ encodeURIComponent( APP_ROOT.pathname ) }-`;
const CACHE_NAME = `${ CACHE_PREFIX }v1`;
const SHELL = [
	'learn/', 'learning/app.mjs', 'learning/state.mjs', 'learning/catalog.mjs',
	'learning/access.mjs', 'learning/styles.css', 'i18n.mjs', 'solar-data.mjs', 'site-config.mjs',
	'assets/spaceexplorer-icon.svg',
	...[ 'en', 'fr', 'nl', 'de', 'ar' ].flatMap( language => [ `learning/locales/${ language }.mjs`, `locales/${ language }.mjs` ] )
].map( path => new URL( path, APP_ROOT ).pathname );

async function saveShell() {
	const existed = await caches.has( CACHE_NAME );
	try {
		const cache = await caches.open( CACHE_NAME );
		await cache.addAll( SHELL.map( path => new Request( new URL( path, self.location.origin ), { cache: 'reload', mode: 'same-origin', redirect: 'error' } ) ) );
		if ( !await shellReady() ) throw new Error( 'Incomplete learner shell' );
	} catch ( error ) {
		if ( !existed ) await caches.delete( CACHE_NAME );
		throw error;
	}
}

self.addEventListener( 'install', event => {
	event.waitUntil( saveShell().then( () => self.skipWaiting() ) );
} );

self.addEventListener( 'activate', event => {
	event.waitUntil( ( async () => {
		const names = await caches.keys();
		await Promise.all( names.filter( name => name !== CACHE_NAME && ( name.startsWith( CACHE_PREFIX ) || APP_ROOT.pathname === '/' && /^spaceexplorer-learning-v\d+$/.test( name ) ) ).map( name => caches.delete( name ) ) );
		await self.clients.claim();
	} )() );
} );

function usableResponse( response, path ) {
	if ( !response?.ok || response.type === 'opaque' ) return false;
	const type = response.headers.get( 'Content-Type' )?.split( ';' )[ 0 ].trim().toLowerCase();
	if ( path.endsWith( '.mjs' ) ) return [ 'text/javascript', 'application/javascript', 'text/ecmascript', 'application/ecmascript' ].includes( type );
	return type === ( path.endsWith( '.css' ) ? 'text/css' : path.endsWith( '.svg' ) ? 'image/svg+xml' : 'text/html' );
}

async function shellReady() {
	if ( !await caches.has( CACHE_NAME ) ) return false;
	const cache = await caches.open( CACHE_NAME );
	return ( await Promise.all( SHELL.map( async path => usableResponse( await cache.match( path ), path ) ) ) ).every( Boolean );
}

self.addEventListener( 'message', event => {
	if ( ![ 'LEARNING_OFFLINE_STATUS', 'LEARNING_OFFLINE_SAVE' ].includes( event.data?.type ) || !event.ports?.[ 0 ] ) return;
	event.waitUntil( ( async () => {
		let ready = false;
		try {
			if ( event.data.type === 'LEARNING_OFFLINE_SAVE' ) await saveShell();
			ready = await shellReady();
		} catch {}
		event.ports[ 0 ].postMessage( { state: ready ? 'ready' : 'idle', version: CACHE_NAME } );
	} )() );
} );

async function networkFirst( request, path ) {
	let cache;
	let cached;
	try {
		if ( await caches.has( CACHE_NAME ) ) cache = await caches.open( CACHE_NAME );
		cached = await cache?.match( path );
	} catch {}
	try {
		const response = await fetch( request );
		if ( usableResponse( response, path ) ) {
			const destination = response.url ? new URL( response.url ) : undefined;
			if ( cache && response.type !== 'opaque' && ( !destination || destination.origin === self.location.origin && destination.pathname === path ) ) {
				try { await cache.put( path, response.clone() ); } catch {}
			}
			return response;
		}
		return cached || response;
	} catch {
		return cached || Response.error();
	}
}

self.addEventListener( 'fetch', event => {
	const request = event.request;
	if ( request.method !== 'GET' ) return;
	const url = new URL( request.url );
	if ( url.origin !== self.location.origin ) return;
	const document = url.pathname === LEARN_PATH || url.pathname === `${ LEARN_PATH }index.html`;
	const path = document ? LEARN_PATH : url.pathname;
	if ( !SHELL.includes( path ) || !document && url.search ) return;
	event.respondWith( networkFirst( request, path ) );
} );
