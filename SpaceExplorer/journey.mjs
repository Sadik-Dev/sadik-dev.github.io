import { BODIES } from './solar-data.mjs';

const planets = BODIES.filter( body => body.id !== 'sun' && body.id !== 'moon' ).map( body => body.id );
const sequence = [ 'sun', ...planets ];
const stopDuration = 11000;

export function adjacentPlanet( id, direction ) {
	const index = planets.indexOf( id === 'moon' ? 'earth' : id );
	if ( index < 0 ) return direction < 0 ? planets.at( -1 ) : planets[ 0 ];
	return planets[ ( index + direction + planets.length ) % planets.length ];
}

export function createJourney( { onStep, onProgress, onState, onComplete } = {} ) {
	let running = false;
	let index = 0;
	let timer;
	let progressTimer;

	function stop() {
		clearTimeout( timer );
		clearInterval( progressTimer );
		if ( !running ) return;
		running = false;
		onState?.( false );
	}

	function step() {
		clearInterval( progressTimer );
		if ( index === sequence.length ) {
			stop();
			onComplete?.();
			return;
		}
		const started = Date.now();
		onStep?.( sequence[ index ], index + 1, sequence.length );
		if ( !running ) return;
		onProgress?.( 0 );
		progressTimer = setInterval( () => onProgress?.( Math.min( ( Date.now() - started ) / stopDuration, 1 ) ), 250 );
		index++;
		timer = setTimeout( step, stopDuration );
	}

	return {
		start() {
			stop();
			index = 0;
			running = true;
			onState?.( true );
			step();
		},
		stop,
		isRunning() { return running; }
	};
}
