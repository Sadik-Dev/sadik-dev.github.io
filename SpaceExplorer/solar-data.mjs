export const BASE_DAYS_PER_SECOND = 0.01;

export const BODIES = [
	{
		id: 'sun',
		name: 'Sun',
		type: 'G-type star',
		tagline: 'The heart of our solar system',
		description: 'Our nearest star holds the solar system together with its gravity. Deep in its core, hydrogen fuses into helium, releasing the energy that lights our world.',
		color: '#ffbd66',
		texture: '2k_sun.jpg',
		radius: 10.5,
		orbitRadius: 0,
		period: 0,
		rotationDays: 25,
		tilt: 7.25,
		phase: 0,
		inclination: 0,
		eccentricity: 0,
		diameter: '1,400,000 km',
		distance: '0 AU',
		temperature: '5,500 °C',
		year: '0',
		yearUnit: 'days',
		fact: 'Sunlight takes about 8 minutes and 20 seconds to reach Earth.'
	},
	{
		id: 'mercury',
		name: 'Mercury',
		type: 'Terrestrial planet',
		tagline: 'Small world. Swift orbit.',
		description: 'Mercury races around the Sun faster than any other planet. Its ancient, cratered surface moves between searing daylight and bitterly cold nights.',
		color: '#c5b3a1',
		texture: '2k_mercury.jpg',
		radius: 1.3,
		orbitRadius: 18,
		period: 87.969,
		rotationDays: 58.6462,
		tilt: 0.03,
		phase: 2.85,
		inclination: 7.00498,
		eccentricity: 0.205636,
		diameter: '4,879 km',
		distance: '0.39 AU',
		temperature: '167 °C',
		year: '88',
		yearUnit: 'days',
		fact: 'One sunrise-to-sunrise day lasts 176 Earth days.'
	},
	{
		id: 'venus',
		name: 'Venus',
		type: 'Terrestrial planet',
		tagline: 'A world behind the clouds',
		description: 'A thick atmosphere wraps Venus in an unbroken veil of clouds. Its powerful greenhouse effect makes it the hottest planet in our solar system.',
		color: '#eac58c',
		texture: '2k_venus_surface.jpg',
		radius: 2.4,
		orbitRadius: 26,
		period: 224.701,
		rotationDays: -243.018,
		tilt: 177.36,
		phase: 3.8,
		inclination: 3.39468,
		eccentricity: 0.006777,
		diameter: '12,104 km',
		distance: '0.72 AU',
		temperature: '464 °C',
		year: '225',
		yearUnit: 'days',
		fact: 'Venus takes longer to rotate once than to orbit the Sun.'
	},
	{
		id: 'earth',
		name: 'Earth',
		type: 'Terrestrial planet',
		tagline: 'Our pale blue home',
		description: 'Liquid oceans and a thin, protective atmosphere make Earth a world unlike any other we know. It is the only place where life has been found.',
		color: '#70c8f3',
		texture: '2k_earth_daymap.jpg',
		radius: 2.7,
		orbitRadius: 35,
		period: 365.256,
		rotationDays: 0.99726968,
		tilt: 23.44,
		phase: 2.4,
		inclination: 0,
		eccentricity: 0.016711,
		diameter: '12,742 km',
		distance: '1.00 AU',
		temperature: '15 °C',
		year: '365.3',
		yearUnit: 'days',
		fact: 'Oceans cover about 71% of Earth’s surface.'
	},
	{
		id: 'mars',
		name: 'Mars',
		type: 'Terrestrial planet',
		tagline: 'The red planet',
		description: 'Iron-rich dust gives Mars its familiar rusty glow. Dry riverbeds and polar ice preserve clues to a wetter past.',
		color: '#e18c6c',
		texture: '2k_mars.jpg',
		radius: 1.9,
		orbitRadius: 45,
		period: 686.98,
		rotationDays: 1.02595676,
		tilt: 25.19,
		phase: 4.9,
		inclination: 1.84969,
		eccentricity: 0.093394,
		diameter: '6,779 km',
		distance: '1.52 AU',
		temperature: '−65 °C',
		year: '687',
		yearUnit: 'days',
		fact: 'Mars is home to Olympus Mons, the largest volcano in the solar system.'
	},
	{
		id: 'jupiter',
		name: 'Jupiter',
		type: 'Gas giant',
		tagline: 'A giant of swirling storms',
		description: 'Bands of cloud sweep around the largest planet in our solar system. Beneath them lies a deep atmosphere of hydrogen and helium.',
		color: '#d8b697',
		texture: '2k_jupiter.jpg',
		radius: 6.8,
		orbitRadius: 64,
		period: 4332.82,
		rotationDays: 0.41354,
		tilt: 3.13,
		phase: 0.3,
		inclination: 1.3044,
		eccentricity: 0.048386,
		diameter: '139,822 km',
		distance: '5.20 AU',
		temperature: '−110 °C',
		year: '11.86',
		yearUnit: 'years',
		fact: 'Jupiter spins once in about 10 hours, giving it the shortest day of any planet.'
	},
	{
		id: 'saturn',
		name: 'Saturn',
		type: 'Gas giant',
		tagline: 'A world crowned in ice',
		description: 'Countless pieces of ice and rock form Saturn’s luminous rings. This pale gas giant is the second-largest planet in our solar system.',
		color: '#e2c992',
		texture: '2k_saturn.jpg',
		radius: 5.6,
		orbitRadius: 86,
		period: 10755.699,
		rotationDays: 0.44401,
		tilt: 26.73,
		phase: 3.15,
		inclination: 2.48599,
		eccentricity: 0.053862,
		diameter: '116,464 km',
		distance: '9.54 AU',
		temperature: '−140 °C',
		year: '29.45',
		yearUnit: 'years',
		fact: 'Saturn’s average density is lower than that of water.'
	},
	{
		id: 'uranus',
		name: 'Uranus',
		type: 'Ice giant',
		tagline: 'The planet on its side',
		description: 'Uranus rolls around the Sun with its rotation axis tipped almost into its orbital plane. Methane in its atmosphere absorbs red light, leaving a blue-green hue.',
		color: '#a1dfe2',
		texture: '2k_uranus.jpg',
		radius: 3.5,
		orbitRadius: 108,
		period: 30687.153,
		rotationDays: -0.71833,
		tilt: 97.77,
		phase: 2.8,
		inclination: 0.77264,
		eccentricity: 0.047257,
		diameter: '50,724 km',
		distance: '19.19 AU',
		temperature: '−195 °C',
		year: '84.02',
		yearUnit: 'years',
		fact: 'Its extreme axial tilt gives Uranus seasons that last about 21 Earth years.'
	},
	{
		id: 'neptune',
		name: 'Neptune',
		type: 'Ice giant',
		tagline: 'At the edge of the planetary realm',
		description: 'Cold and windswept, Neptune circles the Sun far beyond the warmth of Earth. This distant ice giant was predicted mathematically before it was seen through a telescope.',
		color: '#6f9be9',
		texture: '2k_neptune.jpg',
		radius: 3.35,
		orbitRadius: 130,
		period: 60190.03,
		rotationDays: 0.67125,
		tilt: 28.32,
		phase: 5.3,
		inclination: 1.77004,
		eccentricity: 0.00859,
		diameter: '49,244 km',
		distance: '30.07 AU',
		temperature: '−200 °C',
		year: '164.79',
		yearUnit: 'years',
		fact: 'Neptune’s winds can exceed 2,000 kilometers per hour.'
	},
	{
		id: 'moon',
		name: 'Moon',
		type: 'Natural satellite',
		tagline: 'Earth’s constant companion',
		description: 'Dark volcanic plains and bright impact craters record the Moon’s long history. It turns once per orbit, keeping the same face toward Earth.',
		color: '#d3d5d8',
		texture: '2k_moon.jpg',
		radius: 0.58,
		orbitRadius: 7.5,
		period: 27.3217,
		rotationDays: 27.3217,
		tilt: 6.68,
		phase: 0.5,
		inclination: 5.145,
		eccentricity: 0.0549,
		diameter: '3,475 km',
		distance: '0.00257 AU',
		temperature: '−173 to 127 °C',
		year: '27.3',
		yearUnit: 'days',
		fact: 'The Moon drifts about 3.8 centimeters farther from Earth each year.'
	}
];

export const DATA_SOURCES = [
	{ name: 'NASA Solar System', url: 'https://science.nasa.gov/solar-system/' },
	{ name: 'JPL Planetary Physical Parameters', url: 'https://ssd.jpl.nasa.gov/planets/phys_par.html' },
	{ name: 'JPL Approximate Planetary Positions', url: 'https://ssd.jpl.nasa.gov/planets/approx_pos.html' },
	{ name: 'NASA Solar System Temperatures', url: 'https://science.nasa.gov/resource/solar-system-temperatures/' },
	{ name: 'NASA Moon Facts', url: 'https://science.nasa.gov/moon/facts/' }
];

export function getBody( id ) {
	return BODIES.find( body => body.id === id );
}

export function rotationAngle( body, days ) {
	return body.rotationDays ? -days / Math.abs( body.rotationDays ) * Math.PI * 2 : 0;
}

export function orbitalPosition( body, days ) {
	if ( body.period === 0 ) return { x: 0, y: 0, z: 0 };

	const tau = Math.PI * 2;
	const meanAnomaly = ( body.phase + tau * ( days % body.period ) / body.period ) % tau;
	let eccentricAnomaly = meanAnomaly;
	for ( let i = 0; i < 8; i++ ) {
		eccentricAnomaly -= ( eccentricAnomaly - body.eccentricity * Math.sin( eccentricAnomaly ) - meanAnomaly ) /
			( 1 - body.eccentricity * Math.cos( eccentricAnomaly ) );
	}

	const x = body.orbitRadius * ( Math.cos( eccentricAnomaly ) - body.eccentricity );
	const z = body.orbitRadius * Math.sqrt( 1 - body.eccentricity ** 2 ) * Math.sin( eccentricAnomaly );
	const inclination = body.inclination * Math.PI / 180;
	return { x, y: z * Math.sin( inclination ), z: z * Math.cos( inclination ) };
}

export function advanceDays( days, deltaSeconds, daysPerSecond, paused ) {
	return paused ? days : days + Math.min( Math.max( deltaSeconds, 0 ), 0.1 ) * daysPerSecond;
}
