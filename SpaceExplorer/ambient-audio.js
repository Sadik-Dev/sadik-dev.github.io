export function createAmbientAudio( {
	onState,
	onError,
	AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext
} = {} ) {
	let context = null;
	let output = null;
	let nodes = [];
	let sources = [];
	let enabled = false;
	let hidden = false;
	let disposed = false;
	let revision = 0;
	let dirty = false;
	let work = null;
	let cancelFade = null;

	function createGraph() {
		context = new AudioContext();
		output = context.createGain();
		output.gain.value = 0;
		nodes.push( output );
		output.connect( context.destination );

		for ( const [ frequency, level ] of [ [ 65.406, 0.11 ], [ 65.65, 0.06 ], [ 98, 0.045 ] ] ) {
			const oscillator = context.createOscillator();
			nodes.push( oscillator );
			sources.push( oscillator );
			const gain = context.createGain();
			nodes.push( gain );
			oscillator.type = 'sine';
			oscillator.frequency.value = frequency;
			gain.gain.value = level;
			oscillator.connect( gain );
			gain.connect( output );
			oscillator.start();
		}

		const buffer = context.createBuffer( 1, context.sampleRate * 6, context.sampleRate );
		const samples = buffer.getChannelData( 0 );
		for ( let i = 0; i < samples.length; i++ ) {
			const edge = Math.min( 1, i / 128, ( samples.length - 1 - i ) / 128 );
			samples[ i ] = ( Math.random() * 2 - 1 ) * edge;
		}
		const noise = context.createBufferSource();
		nodes.push( noise );
		sources.push( noise );
		noise.buffer = buffer;
		noise.loop = true;
		const filter = context.createBiquadFilter();
		nodes.push( filter );
		filter.type = 'lowpass';
		filter.frequency.value = 220;
		filter.Q.value = 0.4;
		const noiseGain = context.createGain();
		nodes.push( noiseGain );
		noiseGain.gain.value = 0.12;
		noise.connect( filter );
		filter.connect( noiseGain );
		noiseGain.connect( output );
		noise.start();
	}

	function fadeTo( value, duration ) {
		const now = context.currentTime;
		const gain = output.gain;
		if ( gain.cancelAndHoldAtTime ) gain.cancelAndHoldAtTime( now );
		else {
			const current = gain.value;
			gain.cancelScheduledValues( now );
			gain.setValueAtTime( current, now );
		}
		if ( duration ) gain.linearRampToValueAtTime( value, now + duration );
		else gain.setValueAtTime( value, now );
	}

	function waitForFade() {
		return new Promise( resolve => {
			const timer = setTimeout( finish, 350 );
			function finish() {
				clearTimeout( timer );
				cancelFade = null;
				resolve();
			}
			cancelFade = finish;
		} );
	}

	async function releaseGraph() {
		const previous = context;
		context = null;
		output = null;
		for ( const source of sources ) {
			try { source.stop(); } catch {}
		}
		for ( const node of nodes ) node.disconnect();
		sources = [];
		nodes = [];
		if ( previous && previous.state !== 'closed' ) {
			try { await previous.close(); } catch {}
		}
	}

	async function reconcile() {
		while ( dirty && !disposed && context ) {
			dirty = false;
			const current = revision;
			try {
				if ( enabled && !hidden ) {
					await context.resume();
					if ( current !== revision || disposed ) continue;
					fadeTo( 0.055, 1.2 );
				} else {
					const duration = !hidden && context.state === 'running' ? 0.35 : 0;
					fadeTo( 0, duration );
					if ( duration ) await waitForFade();
					if ( current !== revision || disposed ) continue;
					if ( context.state !== 'suspended' ) await context.suspend();
				}
			} catch {
				if ( current !== revision || disposed ) continue;
				if ( enabled ) { enabled = false; onState?.( false ); }
				onError?.( 'Ambient sound is unavailable. Try turning it on again.' );
				await releaseGraph();
			}
		}
		return enabled;
	}

	function synchronize() {
		revision += 1;
		dirty = true;
		cancelFade?.();
		if ( !work ) work = reconcile().finally( () => {
			work = null;
			if ( dirty && context && !disposed ) return synchronize();
		} );
		return work.then( () => enabled );
	}

	return {
		async toggle() {
			if ( disposed ) return false;
			if ( !enabled && !context ) {
				try {
					if ( !AudioContext ) throw new Error( 'Web Audio unavailable' );
					createGraph();
				} catch {
					onError?.( 'Ambient sound is unavailable in this browser.' );
					await releaseGraph();
					return false;
				}
			}
			enabled = !enabled;
			onState?.( enabled );
			return synchronize();
		},
		setHidden( value ) {
			if ( disposed || hidden === Boolean( value ) ) return Promise.resolve( enabled );
			hidden = Boolean( value );
			return synchronize();
		},
		async dispose() {
			if ( disposed ) return;
			disposed = true;
			revision += 1;
			cancelFade?.();
			if ( enabled ) { enabled = false; onState?.( false ); }
			await releaseGraph();
		}
	};
}
