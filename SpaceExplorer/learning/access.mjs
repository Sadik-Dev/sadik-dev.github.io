function browserValue( object, key ) {
	try { return object?.[ key ]; } catch { return undefined; }
}

export function createReadAloud( {
	onState = () => {}, onUnavailable = () => {},
	speechSynthesis = browserValue( globalThis, 'speechSynthesis' ),
	Utterance = browserValue( globalThis, 'SpeechSynthesisUtterance' ),
	document = browserValue( globalThis, 'document' ), window = browserValue( globalThis, 'window' )
} = {} ) {
	let active = false;
	let disposed = false;
	let request = 0;
	let finishWaiting;
	const available = !!( speechSynthesis?.speak && speechSynthesis?.cancel && speechSynthesis?.getVoices && Utterance );

	function setActive( value ) {
		active = value;
		if ( !disposed ) onState( value );
	}

	function voices() {
		try { return available ? speechSynthesis.getVoices() : []; } catch { return []; }
	}

	function voiceFor( language ) {
		const code = String( language || '' ).toLowerCase().replaceAll( '_', '-' );
		if ( !code ) return;
		const choices = voices().filter( voice => voice.lang?.toLowerCase().split( /[-_]/ )[ 0 ] === code.split( '-' )[ 0 ] );
		return choices.find( voice => voice.lang.toLowerCase() === code ) || choices[ 0 ];
	}

	function stop() {
		request++;
		finishWaiting?.();
		try { if ( available ) speechSynthesis.cancel(); } catch {}
		setActive( false );
	}

	function voicesChanged() {
		finishWaiting?.();
		if ( !active && !disposed ) onState( false );
	}

	function waitForVoices() {
		return new Promise( resolve => {
			const timeout = setTimeout( finish, 1500 );
			function finish() {
				clearTimeout( timeout );
				finishWaiting = undefined;
				resolve();
			}
			finishWaiting = finish;
		} );
	}

	async function speak( text, language ) {
		stop();
		if ( disposed || typeof text !== 'string' || !text.trim() ) return false;
		const current = request;
		if ( available && !voices().length ) {
			setActive( true );
			await waitForVoices();
		}
		if ( disposed || current !== request ) return false;
		const voice = voiceFor( language );
		if ( !available || !voice ) {
			setActive( false );
			onUnavailable();
			return false;
		}
		try {
			const utterance = new Utterance( text.trim() );
			utterance.voice = voice;
			utterance.lang = voice.lang;
			utterance.onend = () => { if ( current === request ) setActive( false ); };
			utterance.onerror = event => {
				if ( current !== request || disposed ) return;
				setActive( false );
				if ( ![ 'canceled', 'interrupted' ].includes( event.error ) ) onUnavailable();
			};
			setActive( true );
			speechSynthesis.speak( utterance );
			return true;
		} catch {
			setActive( false );
			onUnavailable();
			return false;
		}
	}

	function visibilityChanged() { if ( document?.hidden ) stop(); }
	speechSynthesis?.addEventListener?.( 'voiceschanged', voicesChanged );
	document?.addEventListener?.( 'visibilitychange', visibilityChanged );
	for ( const event of [ 'pagehide', 'popstate', 'hashchange' ] ) window?.addEventListener?.( event, stop );

	function dispose() {
		stop();
		disposed = true;
		speechSynthesis?.removeEventListener?.( 'voiceschanged', voicesChanged );
		document?.removeEventListener?.( 'visibilitychange', visibilityChanged );
		for ( const event of [ 'pagehide', 'popstate', 'hashchange' ] ) window?.removeEventListener?.( event, stop );
	}

	return { speak, stop, supported: language => !disposed && !!voiceFor( language ), dispose };
}

export function createOfflineAccess( {
	onState = () => {},
	serviceWorker = browserValue( browserValue( globalThis, 'navigator' ), 'serviceWorker' ),
	caches = browserValue( globalThis, 'caches' ), location = browserValue( globalThis, 'location' ),
	Channel = browserValue( globalThis, 'MessageChannel' ), appRoot = new URL( '../', import.meta.url )
} = {} ) {
	const available = !!( serviceWorker?.register && serviceWorker?.getRegistration && caches?.keys && Channel && location?.origin );
	const appPath = new URL( appRoot ).pathname;
	const scope = new URL( 'learn/', appRoot ).pathname;
	const workerPath = new URL( 'learn/sw.js', appRoot ).pathname;
	const cachePrefix = `spaceexplorer-learning-${ encodeURIComponent( appPath ) }-`;
	let disposed = false;
	let state = available ? 'idle' : 'unsupported';
	let operation = Promise.resolve();

	function setState( value ) {
		state = value;
		if ( !disposed ) onState( state );
		return state;
	}

	function ownRegistration( registration ) {
		if ( registration?.scope !== `${ location.origin }${ scope }` ) return false;
		const worker = registration.active || registration.waiting || registration.installing;
		return worker?.scriptURL === `${ location.origin }${ workerPath }`;
	}

	function cachedState( worker, type = 'LEARNING_OFFLINE_STATUS' ) {
		return new Promise( ( resolve, reject ) => {
			const channel = new Channel();
			const timeout = setTimeout( () => finish( new Error( 'Offline status timed out' ) ), type === 'LEARNING_OFFLINE_SAVE' ? 30000 : 8000 );
			function finish( error, value ) {
				clearTimeout( timeout );
				channel.port1.close();
				channel.port2.close();
				if ( error ) reject( error ); else resolve( value );
			}
			channel.port1.onmessage = event => finish( null, event.data?.state === 'ready' ? 'ready' : 'idle' );
			try { worker.postMessage( { type }, [ channel.port2 ] ); } catch ( error ) { finish( error ); }
		} );
	}

	function activated( worker ) {
		if ( !worker ) return Promise.reject( new Error( 'Offline worker unavailable' ) );
		if ( worker.state === 'activated' ) return Promise.resolve( worker );
		return new Promise( ( resolve, reject ) => {
			const timeout = setTimeout( () => finish( new Error( 'Offline installation timed out' ) ), 30000 );
			function finish( error ) {
				clearTimeout( timeout );
				worker.removeEventListener( 'statechange', changed );
				if ( error ) reject( error ); else resolve( worker );
			}
			function changed() {
				if ( worker.state === 'activated' ) finish();
				if ( worker.state === 'redundant' ) finish( new Error( 'Offline installation failed' ) );
			}
			worker.addEventListener( 'statechange', changed );
			changed();
		} );
	}

	function run( action ) {
		operation = operation.then( async () => {
			if ( disposed ) return state;
			if ( !available ) return setState( 'unsupported' );
			try { return await action(); } catch { return setState( 'error' ); }
		} );
		return operation;
	}

	function status() {
		return run( async () => {
			const registration = await serviceWorker.getRegistration( scope );
			return setState( ownRegistration( registration ) && registration.active ? await cachedState( registration.active ) : 'idle' );
		} );
	}

	function save() {
		return run( async () => {
			setState( 'saving' );
			const existing = await serviceWorker.getRegistration( scope );
			if ( existing?.scope === `${ location.origin }${ scope }` && !ownRegistration( existing ) ) return setState( 'error' );
			const registration = await serviceWorker.register( workerPath, { scope, updateViaCache: 'none' } );
			const worker = await activated( registration.installing || registration.waiting || registration.active );
			let result = await cachedState( worker );
			if ( result !== 'ready' ) result = await cachedState( worker, 'LEARNING_OFFLINE_SAVE' );
			return setState( result === 'ready' ? 'ready' : 'error' );
		} );
	}

	function remove() {
		return run( async () => {
			const registration = await serviceWorker.getRegistration( scope );
			if ( ownRegistration( registration ) ) await registration.unregister();
			const names = await caches.keys();
			await Promise.all( names.filter( name => name.startsWith( cachePrefix ) || appPath === '/' && /^spaceexplorer-learning-v\d+$/.test( name ) ).map( name => caches.delete( name ) ) );
			return setState( 'idle' );
		} );
	}

	return { save, remove, status, dispose: () => { disposed = true; } };
}
