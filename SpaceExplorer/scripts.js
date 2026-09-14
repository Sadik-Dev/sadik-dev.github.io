import { BODIES, getBody, BASE_DAYS_PER_SECOND } from './solar-data.mjs';
import { createSolarScene } from './solar-scene.js';
import { createAmbientAudio } from './ambient-audio.js';
import { createJourney, adjacentPlanet } from './journey.mjs';
import { LANGUAGES, createI18n, resolveLanguage } from './i18n.mjs';

let savedLanguage;
try { savedLanguage = localStorage.getItem( 'spaceexplorer.language' ); } catch {}
const i18n = createI18n( resolveLanguage( { query: new URLSearchParams( location.search ).get( 'lang' ), stored: savedLanguage, languages: navigator.languages } ) );
const t = i18n.t;
const byId = id => document.getElementById( id );
const planets = BODIES.filter( body => body.id !== 'sun' && body.id !== 'moon' );
const reducedMotion = window.matchMedia( '(prefers-reduced-motion: reduce)' );
const requestedBody = new URLSearchParams( location.search ).get( 'body' );
let selected = getBody( requestedBody )?.id || 'earth';
let focused = false;
let paused = reducedMotion.matches;
let topView = false;
let immersive = false;
let drift = false;
let motionPreference = 'system';
let speedMultiplier = 1;
let tourPlayback = null;
let sceneAvailable = false;
let renderedPlanet;
let panelAnimation;
let toastTimer;
let solarScene;
let soundEnabled = false;
let lastDays = 0;
let journeyStep = null;
let activeToast = null;
let failed = false;

function updateSound() {
	for ( const id of [ 'soundButton', 'cinemaSoundButton' ] ) {
		byId( id ).setAttribute( 'aria-pressed', String( soundEnabled ) );
		byId( id ).setAttribute( 'aria-label', t( soundEnabled ? 'muteSound' : 'enableSound' ) );
	}
}

function updateDay() {
	const label = t( 'day', { number: i18n.number( Math.floor( lastDays ) + 1, { minimumIntegerDigits: 5, useGrouping: false } ) } );
	for ( const id of [ 'dayReadout', 'mobileDay', 'cinemaDay' ] ) byId( id ).textContent = label;
}

function updateJourneyText() {
	const values = journeyStep && { index: i18n.number( journeyStep.index, { minimumIntegerDigits: 2 } ), total: i18n.number( journeyStep.total ) };
	byId( 'tourText' ).textContent = values ? t( 'tourStep', values ) : t( 'tourStart' );
	byId( 'cinemaEyebrow' ).textContent = values ? t( 'journeyEyebrow', values ) : t( 'momentEyebrow' );
}

function applyLanguage() {
	for ( const link of document.querySelectorAll( '[data-learning-link]' ) ) link.href = `learn/?lang=${ i18n.language }`;
	document.documentElement.lang = i18n.language;
	document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
	const metadata = byId( 'appMetadata' );
	const application = JSON.parse( metadata.textContent );
	application.description = t( 'pageDescription' );
	application.inLanguage = i18n.language;
	metadata.textContent = JSON.stringify( application );
	for ( const element of document.querySelectorAll( '[data-i18n]' ) ) element.textContent = t( element.dataset.i18n );
	for ( const element of document.querySelectorAll( '[data-i18n-html]' ) ) element.innerHTML = t( element.dataset.i18nHtml );
	for ( const attribute of [ 'aria-label', 'title', 'content' ] ) {
		for ( const element of document.querySelectorAll( `[data-i18n-${ attribute }]` ) ) element.setAttribute( attribute, t( element.getAttribute( `data-i18n-${ attribute }` ) ) );
	}
	for ( const element of document.querySelectorAll( '[data-local-guide]' ) ) element.href = `${ i18n.language === 'en' ? '' : i18n.language + '/' }${ element.dataset.localGuide }/`;
	for ( const button of document.querySelectorAll( '[data-world]' ) ) {
		const body = i18n.body( button.dataset.world );
		button.querySelector( '.planet-nav-name' ).textContent = body.name;
		button.setAttribute( 'aria-label', t( 'viewWorld', { name: body.name } ) );
	}
	for ( const id of [ 'languageCode', 'cinemaLanguageCode' ] ) byId( id ).textContent = i18n.language.toUpperCase();
	for ( const option of byId( 'speedSelect' ).options ) option.textContent = `${ i18n.number( Number( option.value ) ) }×`;
	document.querySelectorAll( '.guide-steps > div > span' ).forEach( ( element, index ) => { element.textContent = i18n.number( index + 1, { minimumIntegerDigits: 2 } ); } );
	for ( const button of document.querySelectorAll( '[data-language]' ) ) button.setAttribute( 'aria-pressed', String( button.dataset.language === i18n.language ) );
	renderedPlanet = undefined;
	updatePlanet();
	updatePlayback();
	updateSound();
	updateSpeed();
	updateDay();
	updateJourneyText();
	byId( 'fullscreenButton' ).setAttribute( 'aria-label', t( document.fullscreenElement ? 'exitFullscreen' : 'enterFullscreen' ) );
	solarScene?.setLanguage( i18n );
	if ( activeToast ) byId( 'toast' ).textContent = t( activeToast.key, activeToast.values );
}

function changeLanguage( language ) {
	i18n.setLanguage( language );
	try { localStorage.setItem( 'spaceexplorer.language', i18n.language ); } catch {}
	const url = new URL( location.href );
	url.searchParams.set( 'lang', i18n.language );
	history.replaceState( null, '', url );
	applyLanguage();
	byId( 'languageDialog' ).close();
	notify( 'languageChanged' );
}

for ( const language of LANGUAGES ) {
	const button = document.createElement( 'button' );
	button.type = 'button';
	button.dataset.language = language.code;
	button.lang = language.code;
	button.dir = language.dir;
	const code = document.createElement( 'span' );
	code.dir = 'ltr';
	code.textContent = language.code.toUpperCase();
	const name = document.createElement( 'span' );
	name.textContent = language.name;
	button.append( code, name );
	button.addEventListener( 'click', () => changeLanguage( language.code ) );
	byId( 'languageOptions' ).append( button );
}
for ( const id of [ 'languageButton', 'cinemaLanguageButton', 'fallbackLanguageButton' ] ) {
	byId( id ).addEventListener( 'click', () => {
		byId( 'languageDialog' ).showModal();
		document.querySelector( `[data-language="${ i18n.language }"]` ).focus();
	} );
}

const ambient = createAmbientAudio( {
	onState: enabled => { soundEnabled = enabled; updateSound(); },
	onError: () => notify( 'soundUnavailable' )
} );
const journey = createJourney( {
	onStep: ( id, index, total ) => {
		choosePlanet( id, true );
		journeyStep = { index, total };
		updateJourneyText();
	},
	onProgress: progress => {
		byId( 'tourProgress' ).style.setProperty( '--progress', progress );
		byId( 'tourProgress' ).setAttribute( 'aria-valuenow', String( Math.round( progress * 100 ) ) );
	},
	onState: running => {
		document.body.classList.toggle( 'is-touring', running );
		byId( 'tourButton' ).setAttribute( 'aria-pressed', String( running ) );
		byId( 'endJourneyButton' ).hidden = !running;
		byId( 'tourProgress' ).hidden = !running;
		if ( !running ) {
			journeyStep = null;
			updateJourneyText();
			if ( tourPlayback ) {
				paused = tourPlayback.paused;
				speedMultiplier = tourPlayback.speed;
				tourPlayback = null;
				updateSpeed();
				updatePlayback();
			}
		}
		solarScene?.setDrift( running || drift );
	},
	onComplete: () => { overview(); setImmersive( false ); notify( 'tourComplete' ); }
} );

function motionReduced() {
	return motionPreference === 'reduced' || ( motionPreference === 'system' && reducedMotion.matches );
}

function notify( key, values = {} ) {
	activeToast = { key, values };
	clearTimeout( toastTimer );
	byId( 'toast' ).textContent = t( key, values );
	byId( 'toast' ).classList.add( 'is-visible' );
	toastTimer = setTimeout( () => byId( 'toast' ).classList.remove( 'is-visible' ), 3200 );
}

function updatePlanet() {
	const body = i18n.body( selected );
	const index = planets.findIndex( planet => planet.id === selected );
	byId( 'selectedBody' ).textContent = body.name;
	byId( 'bodyType' ).textContent = body.type.toLocaleUpperCase( i18n.language );
	byId( 'planetCounter' ).textContent = index < 0 ? t( selected === 'sun' ? 'star' : 'moon' ) : `${ i18n.number( index + 1, { minimumIntegerDigits: 2 } ) } / ${ i18n.number( 8, { minimumIntegerDigits: 2 } ) }`;
	byId( 'orbitalPeriod' ).textContent = selected === 'sun' ? i18n.number( Math.abs( body.rotationDays ), { maximumFractionDigits: 2 } ) : body.year;
	byId( 'periodUnit' ).textContent = selected === 'sun' ? t( 'days' ) : body.yearUnit;
	byId( 'periodLabel' ).textContent = t( selected === 'sun' ? 'rotationEquator' : selected === 'moon' ? 'orbitEarth' : 'orbitSun' );
	byId( 'planetDescription' ).textContent = body.description;
	byId( 'planetDiameter' ).textContent = body.diameter;
	byId( 'planetRotation' ).textContent = body.rotation;
	byId( 'planetDistance' ).textContent = body.distance;
	byId( 'distanceLabel' ).textContent = t( selected === 'moon' ? 'fromEarth' : selected === 'sun' ? 'solarCenter' : 'fromSun' );
	byId( 'temperatureLabel' ).textContent = t( selected === 'sun' ? 'photosphere' : selected === 'moon' ? 'surfaceRange' : 'meanTemperature' );
	byId( 'planetTemperature' ).textContent = body.temperature;
	byId( 'focusText' ).textContent = focused ? t( 'backOverview' ) : t( 'discover', { name: body.name } );
	byId( 'focusTagline' ).textContent = body.tagline;
	byId( 'focusType' ).textContent = body.type.toUpperCase();
	byId( 'cinemaWorld' ).textContent = body.name;
	byId( 'cinemaTagline' ).textContent = body.tagline;
	byId( 'worldTitle' ).textContent = body.name;
	byId( 'worldType' ).textContent = body.type.toUpperCase();
	byId( 'worldDescription' ).textContent = body.description;
	byId( 'worldFact' ).textContent = body.fact;
	for ( const [ from, to ] of [ [ 'planetDiameter', 'worldDiameter' ], [ 'planetRotation', 'worldRotation' ], [ 'planetDistance', 'worldDistance' ], [ 'planetTemperature', 'worldTemperature' ], [ 'distanceLabel', 'worldDistanceLabel' ], [ 'temperatureLabel', 'worldTemperatureLabel' ] ] ) byId( to ).textContent = byId( from ).textContent;
	byId( 'moonButton' ).hidden = selected !== 'earth' && selected !== 'moon';
	byId( 'moonButton' ).textContent = t( selected === 'moon' ? 'backEarth' : 'meetMoon' );
	document.querySelector( '.planet-panel' ).style.setProperty( '--planet-color', body.color );
	document.querySelectorAll( '[data-world]' ).forEach( button => {
		const active = button.dataset.world === selected;
		button.classList.toggle( 'is-active', active );
		button.setAttribute( 'aria-pressed', String( active ) );
		if ( active ) {
			const nav = byId( 'planetNav' );
			const bounds = button.getBoundingClientRect();
			const viewport = nav.getBoundingClientRect();
			if ( bounds.left < viewport.left || bounds.right > viewport.right ) button.scrollIntoView( { block: 'nearest', inline: 'center', behavior: motionReduced() ? 'instant' : 'smooth' } );
		}
	} );
	if ( renderedPlanet !== selected ) {
		byId( 'selectionAnnouncement' ).textContent = `${ body.name }. ${ body.type }. ${ body.fact }`;
		if ( renderedPlanet && !motionReduced() ) {
			panelAnimation?.cancel();
			panelAnimation = document.querySelector( '.planet-panel' ).animate( [ { opacity: .3, transform: 'translateY(7px)' }, { opacity: 1, transform: 'translateY(0)' } ], { duration: 400, easing: 'cubic-bezier(.2,.7,.2,1)' } );
		}
		renderedPlanet = selected;
	}
}

function setFocused( value ) {
	focused = value;
	document.body.classList.toggle( 'is-focused', value );
	byId( 'focusCaption' ).hidden = !value;
	byId( 'overviewButton' ).classList.toggle( 'is-active', !value );
	byId( 'overviewButton' ).setAttribute( 'aria-pressed', String( !value ) );
	byId( 'closeupButton' ).classList.toggle( 'is-active', value );
	byId( 'closeupButton' ).setAttribute( 'aria-pressed', String( value ) );
	updatePlanet();
}

function stopTour() {
	journey.stop();
}

function choosePlanet( id, closeup = focused ) {
	if ( !getBody( id ) ) return;
	selected = id;
	if ( closeup ) {
		topView = false;
		byId( 'topViewButton' ).setAttribute( 'aria-pressed', 'false' );
	}
	setFocused( closeup );
	solarScene?.select( id, closeup );
}

function overview() {
	stopTour();
	setFocused( false );
	topView = false;
	byId( 'topViewButton' ).setAttribute( 'aria-pressed', 'false' );
	solarScene?.overview();
	solarScene?.select( selected, false );
}

function changePlanet( direction ) {
	stopTour();
	choosePlanet( adjacentPlanet( selected, direction ) );
}

function updatePlayback() {
	document.body.classList.toggle( 'is-paused', paused );
	byId( 'pauseButton' ).setAttribute( 'aria-label', t( paused ? 'resume' : 'pause' ) );
	byId( 'pauseButton' ).title = t( 'playbackTitle', { action: t( paused ? 'resume' : 'pause' ) } );
	byId( 'playIcon' ).setAttribute( 'href', paused ? '#i-play' : '#i-pause' );
	byId( 'cinemaPauseButton' ).setAttribute( 'aria-label', t( paused ? 'resume' : 'pause' ) );
	byId( 'cinemaPlayIcon' ).setAttribute( 'href', paused ? '#i-play' : '#i-pause' );
	byId( 'statusText' ).textContent = t( failed ? 'statusUnavailable' : paused ? 'statusPaused' : 'statusRunning' );
	solarScene?.setPaused( paused );
}

function togglePause() {
	if ( !sceneAvailable ) return;
	const next = !paused;
	stopTour();
	paused = next;
	updatePlayback();
}

function updateSpeed() {
	byId( 'speedSelect' ).value = String( speedMultiplier );
	const rate = speedMultiplier * BASE_DAYS_PER_SECOND;
	solarScene?.setSpeed( rate );
	byId( 'speedUnit' ).textContent = t( 'speedUnit', { seconds: i18n.number( Math.round( 1 / rate ) ) } );
}

function setImmersive( value ) {
	immersive = value;
	document.body.classList.toggle( 'is-cinema', value );
	byId( 'cinemaHUD' ).hidden = !value;
	byId( 'cinemaButton' ).setAttribute( 'aria-pressed', String( value ) );
	for ( const element of document.querySelectorAll( '.topbar, .intro, .planet-panel, .focus-caption, .view-options, .camera-controls, .control-dock, .planet-nav, .footer' ) ) element.inert = value;
	if ( value ) byId( 'cinemaHUD' ).focus( { preventScroll: true } );
	else byId( 'cinemaButton' ).focus( { preventScroll: true } );
}

function toggleImmersive() {
	if ( !sceneAvailable ) return;
	if ( immersive ) stopTour();
	setImmersive( !immersive );
}

function toggleJourney() {
	if ( !sceneAvailable ) return;
	if ( journey.isRunning() ) { stopTour(); setImmersive( false ); return; }
	tourPlayback = { paused, speed: speedMultiplier };
	paused = false;
	speedMultiplier = 1;
	updateSpeed();
	updatePlayback();
	setImmersive( true );
	journey.start();
}

function applyMotionPreference() {
	document.body.classList.toggle( 'full-motion', motionPreference === 'full' );
	solarScene?.setMotionPreference( motionPreference );
	const reduced = motionReduced();
	document.body.classList.toggle( 'reduce-motion', reduced );
	byId( 'driftButton' ).setAttribute( 'aria-disabled', String( reduced ) );
	if ( reduced ) {
		panelAnimation?.cancel();
		drift = false;
		byId( 'driftButton' ).setAttribute( 'aria-pressed', 'false' );
		stopTour();
		paused = true;
		updatePlayback();
	}
	solarScene?.setDrift( drift );
}

for ( const body of BODIES.filter( body => body.id !== 'moon' ) ) {
	const button = document.createElement( 'button' );
	button.type = 'button';
	button.dataset.world = body.id;
	button.style.setProperty( '--planet-color', body.color );
	button.setAttribute( 'aria-label', t( 'viewWorld', { name: i18n.body( body.id ).name } ) );
	const thumbnail = document.createElement( 'span' );
	thumbnail.className = 'planet-thumbnail';
	thumbnail.style.backgroundColor = body.color;
	thumbnail.setAttribute( 'aria-hidden', 'true' );
	const name = document.createElement( 'span' );
	name.textContent = i18n.body( body.id ).name;
	name.className = 'planet-nav-name';
	button.append( thumbnail, name );
	button.addEventListener( 'click', () => { stopTour(); choosePlanet( body.id ); } );
	byId( 'planetNav' ).append( button );
}

byId( 'previousPlanet' ).addEventListener( 'click', () => changePlanet( -1 ) );
byId( 'nextPlanet' ).addEventListener( 'click', () => changePlanet( 1 ) );
byId( 'focusButton' ).addEventListener( 'click', () => { stopTour(); if ( focused ) overview(); else choosePlanet( selected, true ); } );
byId( 'moonButton' ).addEventListener( 'click', () => { stopTour(); choosePlanet( selected === 'moon' ? 'earth' : 'moon', true ); } );
byId( 'overviewButton' ).addEventListener( 'click', overview );
byId( 'exploreNav' ).addEventListener( 'click', overview );
byId( 'resetButton' ).addEventListener( 'click', overview );
byId( 'backButton' ).addEventListener( 'click', overview );
byId( 'closeupButton' ).addEventListener( 'click', () => { stopTour(); choosePlanet( selected, true ); } );
byId( 'pauseButton' ).addEventListener( 'click', togglePause );
byId( 'speedSelect' ).addEventListener( 'change', event => {
	const value = Number( event.target.value );
	stopTour();
	speedMultiplier = value;
	updateSpeed();
} );
byId( 'resetTimeButton' ).addEventListener( 'click', () => { solarScene?.resetTime(); notify( 'resetNotice' ); } );
byId( 'zoomInButton' ).addEventListener( 'click', () => { stopTour(); solarScene?.zoom( .8 ); } );
byId( 'zoomOutButton' ).addEventListener( 'click', () => { stopTour(); solarScene?.zoom( 1.25 ); } );
for ( const [ id, method ] of [ [ 'orbitsButton', 'setOrbits' ], [ 'labelsButton', 'setLabels' ] ] ) {
	byId( id ).addEventListener( 'click', () => {
		const active = byId( id ).getAttribute( 'aria-pressed' ) !== 'true';
		byId( id ).setAttribute( 'aria-pressed', String( active ) );
		solarScene?.[ method ]( active );
	} );
}
byId( 'topViewButton' ).addEventListener( 'click', () => {
	stopTour();
	topView = !topView;
	setFocused( false );
	byId( 'topViewButton' ).setAttribute( 'aria-pressed', String( topView ) );
	solarScene?.setView( topView ? 'top' : 'perspective' );
} );
byId( 'tourButton' ).addEventListener( 'click', toggleJourney );
byId( 'endJourneyButton' ).addEventListener( 'click', () => { stopTour(); setImmersive( false ); } );
byId( 'cinemaButton' ).addEventListener( 'click', toggleImmersive );
byId( 'exitCinemaButton' ).addEventListener( 'click', toggleImmersive );
byId( 'cinemaPrevious' ).addEventListener( 'click', () => changePlanet( -1 ) );
byId( 'cinemaNext' ).addEventListener( 'click', () => changePlanet( 1 ) );
byId( 'cinemaPauseButton' ).addEventListener( 'click', togglePause );
for ( const id of [ 'soundButton', 'cinemaSoundButton' ] ) byId( id ).addEventListener( 'click', () => ambient.toggle() );
byId( 'driftButton' ).addEventListener( 'click', () => {
	if ( motionReduced() ) { notify( 'driftReducedNotice' ); return; }
	stopTour();
	drift = !drift;
	byId( 'driftButton' ).setAttribute( 'aria-pressed', String( drift ) );
	solarScene?.setDrift( drift );
	if ( drift && paused ) notify( 'driftPausedNotice' );
} );
byId( 'motionSelect' ).addEventListener( 'change', event => { motionPreference = event.target.value; applyMotionPreference(); } );
byId( 'guideResetTime' ).addEventListener( 'click', () => { solarScene?.resetTime(); notify( 'resetNotice' ); } );
for ( const button of document.querySelectorAll( '[data-dialog]' ) ) {
	button.addEventListener( 'click', () => { stopTour(); byId( button.dataset.dialog ).showModal(); } );
}
for ( const dialog of document.querySelectorAll( 'dialog' ) ) {
	dialog.querySelector( '.dialog-close' ).addEventListener( 'click', () => dialog.close() );
	dialog.addEventListener( 'click', event => {
		if ( event.target !== dialog ) return;
		const bounds = dialog.getBoundingClientRect();
		if ( event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom ) dialog.close();
	} );
}
byId( 'fullscreenButton' ).addEventListener( 'click', async () => {
	try {
		if ( document.fullscreenElement ) await document.exitFullscreen();
		else await document.documentElement.requestFullscreen();
	} catch { notify( 'fullscreenUnavailable' ); }
} );
document.addEventListener( 'fullscreenchange', () => byId( 'fullscreenButton' ).setAttribute( 'aria-label', t( document.fullscreenElement ? 'exitFullscreen' : 'enterFullscreen' ) ) );
if ( !document.fullscreenEnabled ) byId( 'fullscreenButton' ).hidden = true;
document.addEventListener( 'keydown', event => {
	if ( event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || !sceneAvailable ) return;
	if ( document.querySelector( 'dialog[open]' ) || /INPUT|SELECT|TEXTAREA/.test( event.target.tagName ) ) return;
	if ( event.key === 'Escape' ) { if ( immersive ) toggleImmersive(); else overview(); return; }
	if ( !event.repeat && event.key.toLowerCase() === 'h' ) { event.preventDefault(); toggleImmersive(); return; }
	if ( !event.repeat && event.key.toLowerCase() === 'm' ) { event.preventDefault(); ambient.toggle(); return; }
	if ( !event.repeat && event.key.toLowerCase() === 't' ) { event.preventDefault(); toggleJourney(); return; }
	if ( /BUTTON|A/.test( event.target.tagName ) && event.code === 'Space' ) return;
	if ( event.code === 'Space' ) { event.preventDefault(); if ( !event.repeat ) togglePause(); }
	if ( event.key === 'ArrowRight' ) { event.preventDefault(); changePlanet( i18n.language === 'ar' ? -1 : 1 ); }
	if ( event.key === 'ArrowLeft' ) { event.preventDefault(); changePlanet( i18n.language === 'ar' ? 1 : -1 ); }
	if ( event.key === '+' || event.key === '=' ) { stopTour(); solarScene?.zoom( .8 ); }
	if ( event.key === '-' ) { stopTour(); solarScene?.zoom( 1.25 ); }
} );
document.addEventListener( 'visibilitychange', () => { if ( document.hidden ) stopTour(); ambient.setHidden( document.hidden ); } );
reducedMotion.addEventListener( 'change', () => { if ( motionPreference === 'system' ) applyMotionPreference(); } );
window.addEventListener( 'pagehide', event => { stopTour(); if ( !event.persisted ) { ambient.dispose(); solarScene?.dispose(); } else ambient.setHidden( true ); } );
window.addEventListener( 'pageshow', () => ambient.setHidden( document.hidden ) );

function showFallback() {
	failed = true;
	stopTour();
	if ( immersive ) setImmersive( false );
	sceneAvailable = false;
	solarScene?.dispose();
	solarScene = null;
	ambient.dispose();
	for ( const element of document.querySelectorAll( '.topbar, .intro, .planet-panel, .focus-caption, .view-options, .camera-controls, .control-dock, .planet-nav, .footer, #planetLabels' ) ) element.inert = true;
	for ( const dialog of document.querySelectorAll( 'dialog[open]' ) ) dialog.close();
	byId( 'webglFallback' ).hidden = false;
	byId( 'webglFallback' ).tabIndex = -1;
	byId( 'webglFallback' ).focus();
	byId( 'loadingNotice' ).hidden = true;
	byId( 'statusText' ).textContent = t( 'statusUnavailable' );
}

applyLanguage();
try {
	solarScene = createSolarScene( {
		container: byId( 'container' ), labelContainer: byId( 'planetLabels' ),
		onInteraction: stopTour,
		onTexture: ( filename, image ) => {
			const body = BODIES.find( item => item.texture === filename );
			const thumbnail = body && document.querySelector( `[data-world="${ body.id }"] .planet-thumbnail` );
			if ( thumbnail ) thumbnail.style.backgroundImage = `url("${ image }")`;
		},
		onSelect: id => { stopTour(); choosePlanet( id ); },
		onLoad: () => { byId( 'loadingNotice' ).hidden = true; document.body.classList.add( 'is-ready' ); if ( sceneAvailable ) updatePlayback(); },
		onError: message => {
			if ( message === 'WebGL unavailable' ) {
				showFallback();
			} else notify( 'textureUnavailable' );
		},
		onTime: days => { lastDays = days; updateDay(); }
	} );
	sceneAvailable = Boolean( solarScene );
	if ( solarScene ) {
		solarScene.setLanguage( i18n );
		solarScene.select( selected, false );
		updateSpeed(); updatePlayback(); applyMotionPreference();
		if ( getBody( requestedBody ) ) choosePlanet( selected, true );
	}
} catch ( error ) {
	console.error( error );
	showFallback();
}
