import { BODIES, getBody } from '../solar-data.mjs';
import { createI18n, resolveLanguage } from '../i18n.mjs';
import { getLearningCatalog, LEARNING_LANGUAGES } from './catalog.mjs';
import { createProgressStore, gradeMission, learningRoute, learningUrl } from './state.mjs';
import { createReadAloud, createOfflineAccess } from './access.mjs';

const appRoot = new URL( '../', import.meta.url );
const appUrl = path => new URL( path, appRoot ).href;
const byId = id => document.getElementById( id );
const escapeHtml = value => String( value ).replaceAll( '&', '&amp;' ).replaceAll( '<', '&lt;' ).replaceAll( '>', '&gt;' ).replaceAll( '"', '&quot;' ).replaceAll( "'", '&#39;' );
const e = escapeHtml;
let storage;
try { storage = localStorage; } catch {}
function preference( key, value ) {
	try {
		if ( value === undefined ) return storage?.getItem( key );
		storage?.setItem( key, value );
	} catch {}
}
let route = learningRoute( location.href );
const i18n = createI18n( resolveLanguage( { query: route.language, stored: preference( 'spaceexplorer.language' ), languages: navigator.languages } ) );
let catalog = getLearningCatalog( i18n.language );
const t = ( key, values = {} ) => ( catalog.ui[ key ] || key ).replace( /\{(\w+)\}/g, ( match, name ) => Object.hasOwn( values, name ) ? values[ name ] : match );
const number = ( value, maximumFractionDigits = 0 ) => i18n.number( value, { maximumFractionDigits } );
const store = createProgressStore( storage );
let atlasWorld = 'earth';
let comparison = [ 'earth', 'jupiter' ];
let elapsedDays = 365;
let phase = 0;
let speechActive = false;
let offlineState = 'idle';
let noticeTimeout;
const reader = createReadAloud( {
	onState: active => { speechActive = active; updateAccess(); },
	onUnavailable: () => notify( t( 'voiceUnavailable' ) )
} );
const offline = createOfflineAccess( { onState: state => { offlineState = state; updateAccess(); } } );
const missionForRoute = () => catalog.missions.find( mission => mission.id === route.mission );
const completeCount = () => catalog.missions.filter( mission => store.get( mission.id ).checked ).length;
const link = changes => learningUrl( { ...route, language: i18n.language, ...changes }, appUrl( 'learn/' ) );
const worldArt = id => `<span class="planet-art" style="--world:${ getBody( id ).color }" aria-hidden="true"></span>`;
const external = 'target="_blank" rel="noopener noreferrer"';
const viewerUrl = id => appUrl( `?lang=${ i18n.language }${ id ? '&body=' + id : '' }` );

function notify( text ) {
	clearTimeout( noticeTimeout );
	byId( 'notice' ).textContent = text;
	noticeTimeout = setTimeout( () => { byId( 'notice' ).textContent = ''; }, 5500 );
}

function navigate( changes, replace = false ) {
	reader.stop();
	const url = link( changes );
	history[ replace ? 'replaceState' : 'pushState' ]( null, '', url );
	route = learningRoute( url );
	render( true );
}

function renderHeader() {
	byId( 'header' ).innerHTML = `<a class="brand" href="${ e( link( { view: 'missions', mission: null } ) ) }" data-route dir="ltr"><img src="${ e( appUrl( 'assets/spaceexplorer-icon.svg' ) ) }" alt="" width="32" height="32"><span>SPACE<span class="brand-light">EXPLORER</span><small>by sadikdev</small></span></a>
		<nav aria-label="${ e( t( 'learningHub' ) ) }">${ [ 'missions', 'atlas', 'resources', 'research' ].map( view => `<a href="${ e( link( { view, mission: null } ) ) }" data-route${ route.view === view ? ' aria-current="page"' : '' }>${ e( t( view ) ) }</a>` ).join( '' ) }</nav>
		<div class="header-actions"><a class="viewer-link" href="${ viewerUrl() }" ${ external }>${ e( t( 'explore3d' ) ) } ↗</a><label class="language-label" for="language">${ e( t( 'language' ) ) }<select id="language">${ LEARNING_LANGUAGES.map( language => `<option value="${ language.code }" lang="${ language.code }" dir="${ language.dir }"${ language.code === i18n.language ? ' selected' : '' }>${ language.name }</option>` ).join( '' ) }</select></label>${ route.embed ? `<a class="text-button" href="${ e( link( { embed: false } ) ) }" ${ external }>${ e( t( 'openStandalone' ) ) } ↗</a>` : '' }</div>`;
}

function accessControls() {
	return `<section class="access-bar" aria-label="${ e( t( 'lightExperience' ) ) }"><div class="access-options"><button class="text-button" id="readAloud" type="button" aria-pressed="false">◖ ${ e( t( 'readAloud' ) ) }</button><label class="control-label" for="textSize">${ e( t( 'textSize' ) ) }<select id="textSize"><option value="normal">${ e( t( 'normalText' ) ) }</option><option value="large"${ document.documentElement.classList.contains( 'large-text' ) ? ' selected' : '' }>${ e( t( 'largeText' ) ) }</option></select></label></div><div class="offline-control"><button class="text-button" id="offlineButton" type="button">↓ ${ e( t( 'offlineSave' ) ) }</button><p id="offlineStatus" role="status"></p><p>${ e( t( 'offlineNote' ) ) }</p></div></section>`;
}

function updateAccess() {
	const readButton = byId( 'readAloud' );
	if ( readButton ) {
		readButton.textContent = ( speechActive ? '■ ' : '◖ ' ) + t( speechActive ? 'stopReading' : 'readAloud' );
		readButton.setAttribute( 'aria-pressed', String( speechActive ) );
	}
	const button = byId( 'offlineButton' );
	if ( button ) {
		const keys = { idle: 'offlineSave', saving: 'offlineSaving', ready: 'offlineRemove', error: 'offlineSave', unsupported: 'offlineUnsupported' };
		button.textContent = t( keys[ offlineState ] || 'offlineSave' );
		button.disabled = [ 'saving', 'unsupported' ].includes( offlineState );
		byId( 'offlineStatus' ).textContent = [ 'ready', 'error' ].includes( offlineState ) ? t( offlineState === 'ready' ? 'offlineReady' : 'offlineError' ) : '';
	}
}

function progressSummary() {
	const count = completeCount();
	return `<div class="progress-summary"><span>${ e( t( 'completed', { count: number( count ), total: number( 3 ) } ) ) }</span><span class="progress-track" role="progressbar" aria-label="${ e( t( 'progress' ) ) }" aria-valuemin="0" aria-valuemax="3" aria-valuenow="${ count }"><span style="width:${ count / 3 * 100 }%"></span></span></div>`;
}

function renderHome() {
	return `<section class="hero" data-read-content><div class="hero-copy"><p class="eyebrow">${ e( t( 'tagline' ) ) }</p><h1>${ e( t( 'heroTitle' ) ) }</h1><p class="lead">${ e( t( 'heroCopy' ) ) }</p><a class="button" href="#missions">${ e( t( 'startLearning' ) ) } <span aria-hidden="true">↓</span></a></div><div class="hero-orbits" aria-hidden="true"><span class="hero-star"></span><span class="planet-art hero-earth"></span><span class="planet-art hero-mars"></span><span class="planet-art hero-saturn"></span><span class="orbit-coordinate">SOL / 01</span></div></section>
		<div class="info-strip"><span>${ e( t( 'freeNote' ) ) }</span><span>${ e( t( 'ages' ) ) }</span><span>${ e( t( 'lightExperience' ) ) }</span></div>
		<section id="missions"><div class="section-heading"><div><p class="eyebrow">01 — ${ e( t( 'learningHub' ) ) }</p><h2>${ e( t( 'missions' ) ) }</h2></div>${ progressSummary() }</div><div class="mission-grid">${ catalog.missions.map( ( mission, index ) => {
			const progress = store.get( mission.id );
			const action = progress.checked ? 'retryMission' : progress.step || progress.answers.some( answer => answer !== null ) ? 'continueMission' : 'startMission';
			return `<article class="mission-card"><div class="card-top"><span class="mission-index">${ e( t( 'missionNumber', { count: number( index + 1 ) } ) ) }</span>${ worldArt( [ 'earth', 'jupiter', 'moon' ][ index ] ) }</div><p class="eyebrow">${ e( mission.subtitle ) }</p><h3>${ e( mission.title ) }</h3><p>${ e( mission.objective ) }</p><div class="card-action"><a class="text-button" href="${ e( link( { mission: mission.id } ) ) }" data-route>${ e( progress.checked ? t( 'resultTitle' ) : t( action ) ) } <span aria-hidden="true">↗</span></a><span class="${ progress.checked ? 'badge' : 'small-note' }">${ e( progress.checked ? '✓' : t( 'minutes' ) ) }</span></div></article>`;
		} ).join( '' ) }</div><div class="section-heading"><p class="small-note">${ e( t( store.persistent ? 'saveNote' : 'storageUnavailable' ) ) }</p><button class="text-button" type="button" data-action="reset">${ e( t( 'resetProgress' ) ) }</button></div></section>
		<div class="support-grid"><section class="panel"><p class="eyebrow">02 — ${ e( t( 'resources' ) ) }</p><h3>${ e( t( 'resourcesTitle' ) ) }</h3><p>${ e( t( 'resourcesIntro' ) ) }</p><a class="text-button" href="${ e( link( { view: 'resources' } ) ) }" data-route>${ e( t( 'studentPack' ) ) } ↗</a></section><section class="panel"><p class="eyebrow">03 — ${ e( t( 'research' ) ) }</p><h3>${ e( t( 'researchTitle' ) ) }</h3><p>${ e( catalog.research.intro ) }</p><a class="text-button" href="${ e( link( { view: 'research' } ) ) }" data-route>${ e( t( 'research' ) ) } ↗</a></section></div>`;
}

function renderLesson( mission ) {
	const progress = store.get( mission.id );
	const content = progress.step === 0 ? renderReading( mission ) : progress.step === 1 ? renderObservation( mission ) : renderQuiz( mission, progress );
	return `<div class="page-toolbar"><a class="text-button" href="${ e( link( { mission: null } ) ) }" data-route>← ${ e( t( 'backMissions' ) ) }</a><button class="text-button" data-action="share" type="button">${ e( t( 'share' ) ) } ↗</button></div><div class="page-heading"><p class="eyebrow">${ e( t( 'missionNumber', { count: number( catalog.missions.indexOf( mission ) + 1 ) } ) ) } · ${ e( t( 'minutes' ) ) }</p><h1>${ e( mission.title ) }</h1><p class="lead">${ e( mission.subtitle ) }</p></div><nav class="step-nav" aria-label="${ e( t( 'missions' ) ) }">${ [ 'learn', 'observe', 'quiz' ].map( ( key, index ) => `<button type="button" data-step="${ index }"${ index === progress.step ? ' aria-current="step"' : '' }><span>${ number( index + 1 ) }</span>${ e( t( key ) ) }</button>` ).join( '' ) }</nav><div data-read-content>${ content }</div>${ progress.step < 2 ? `<div class="lesson-footer">${ progress.step ? `<button class="text-button" type="button" data-step="${ progress.step - 1 }">← ${ e( t( 'previous' ) ) }</button>` : '<span></span>' }<button class="button" data-step="${ progress.step + 1 }" type="button">${ e( t( progress.step === 0 ? 'observe' : 'quiz' ) ) } <span aria-hidden="true">→</span></button></div>` : '' }`;
}

function renderReading( mission ) {
	const id = { 'day-year': 'earth', 'planet-families': 'jupiter', 'earth-moon': 'moon' }[ mission.id ];
	return `<div class="lesson-grid"><article class="lesson-copy"><div class="lesson-note"><strong>${ e( t( 'missionObjective' ) ) }</strong><p>${ e( mission.objective ) }</p></div>${ mission.reading.map( text => `<p>${ e( text ) }</p>` ).join( '' ) }<a class="source-link" href="${ e( mission.source.url ) }" ${ external }>${ e( t( 'sources' ) ) }: ${ e( mission.source.label ) } ↗</a></article><aside class="panel">${ worldArt( id ) }<h3>${ e( i18n.body( id ).name ) }</h3><p class="small-note">${ e( i18n.body( id ).fact ) }</p><a class="text-button" href="${ viewerUrl( id ) }" ${ external }>${ e( t( 'open3d' ) ) } ↗</a><p class="small-note">${ e( t( 'optional3dNote' ) ) }</p><p class="small-note">${ e( t( 'scaleNote' ) ) }</p></aside></div>`;
}

function renderObservation( mission ) {
	let control;
	if ( mission.id === 'day-year' ) {
		control = `<div class="orbit-demo" role="img" aria-label="${ e( t( 'orbitCompare' ) ) }"><div class="orbit-ring mars-ring"></div><div class="orbit-ring earth-ring"></div><span class="orbit-sun"></span><span id="earthOrbit" class="orbit-marker" style="--world:#8ac3d8"><span>${ e( i18n.body( 'earth' ).name ) }</span></span><span id="marsOrbit" class="orbit-marker" style="--world:#dca27e"><span>${ e( i18n.body( 'mars' ).name ) }</span></span></div><label class="range-label" for="daySlider"><span>${ e( t( 'daySlider' ) ) }</span><output id="dayOutput" for="daySlider"></output></label><input id="daySlider" type="range" min="0" max="730" step="1" value="${ elapsedDays }"><div class="comparison-grid">${ [ 'earth', 'mars' ].map( id => `<div><strong>${ e( i18n.body( id ).name ) }</strong><p class="small-note">${ e( t( 'orbit' ) ) }: ${ number( getBody( id ).period, 1 ) } ${ e( t( 'earthDays' ) ) }</p><span class="small-note">${ e( t( 'orbitProgress' ) ) }: <output id="${ id }Progress"></output></span></div>` ).join( '' ) }</div>`;
	} else if ( mission.id === 'planet-families' ) {
		comparison = comparison.map( ( id, index ) => [ 'sun', 'moon' ].includes( id ) ? [ 'earth', 'jupiter' ][ index ] : id );
		control = comparisonMarkup( false );
	} else {
		control = `<div class="phase-scene"><p class="small-note">${ e( t( 'phaseView' ) ) }</p><span id="phaseDisc" class="phase-disc" aria-hidden="true" data-phase="${ phase }"></span><h3 id="phaseName"></h3><p class="small-note">${ e( t( 'reflectedLight' ) ) }</p></div><label for="phaseSlider">${ e( t( 'phaseSlider' ) ) }</label><input id="phaseSlider" type="range" min="0" max="3" step="1" value="${ phase }"><div class="phase-options">${ [ 'phaseNew', 'phaseFirst', 'phaseFull', 'phaseLast' ].map( key => `<span>${ e( t( key ) ) }</span>` ).join( '' ) }</div>`;
	}
	return `<section class="experiment"><h2>${ e( mission.activity.title ) }</h2><p class="instruction">${ e( mission.activity.instruction ) }</p>${ control }<p class="small-note">${ e( t( 'sourceNote' ) ) }</p></section><div class="observation-note"><strong>${ e( mission.activity.prompt ) }</strong><p>${ e( mission.activity.conclusion ) }</p></div>`;
}

function renderQuiz( mission, progress ) {
	const result = gradeMission( mission, progress.answers );
	return `${ progress.checked ? `<section class="result-banner" tabindex="-1" id="quizResult"><p class="eyebrow">✓ ${ e( t( 'missions' ) ) }</p><h2>${ e( t( 'resultTitle' ) ) }</h2><p class="result-score">${ e( t( 'score', { score: number( result.score ), total: number( result.total ) } ) ) }</p><p>${ e( t( 'resultCopy' ) ) }</p><p><strong>${ e( t( 'reflection' ) ) }:</strong> ${ e( mission.reflection ) }</p><div class="actions"><a class="button" href="${ e( link( { mission: null } ) ) }" data-route>${ e( t( 'backMissions' ) ) }</a><button class="text-button" type="button" data-action="retry">${ e( t( 'retryMission' ) ) }</button></div></section>` : '' }
		<form class="quiz-form" id="quizForm" novalidate><p id="quizError" class="quiz-error" role="alert" hidden></p>${ mission.questions.map( ( question, index ) => `<fieldset><legend><span class="question-number">${ number( index + 1 ) }</span>${ e( question.prompt ) }</legend>${ question.options.map( ( option, answer ) => `<label class="answer-option${ progress.checked && answer === question.correct ? ' is-correct' : '' }"><input type="radio" name="question-${ index }" value="${ answer }"${ progress.answers[ index ] === answer ? ' checked' : '' }${ progress.checked ? ' disabled' : '' } required><span>${ e( option ) }</span></label>` ).join( '' ) }${ progress.checked ? `<p class="answer-explanation"><strong>${ e( t( result.results[ index ] ? 'correct' : 'tryAgain' ) ) }</strong>${ e( question.explanation ) }</p>` : '' }</fieldset>` ).join( '' ) }${ progress.checked ? '' : `<button class="button" type="submit">${ e( t( 'checkAnswers' ) ) } <span aria-hidden="true">→</span></button>` }</form>`;
}

function family( id ) {
	return t( [ 'mercury', 'venus', 'earth', 'mars' ].includes( id ) ? 'rocky' : [ 'jupiter', 'saturn' ].includes( id ) ? 'gasGiants' : [ 'uranus', 'neptune' ].includes( id ) ? 'iceGiants' : id );
}

function comparisonMarkup( allWorlds ) {
	const worlds = allWorlds ? BODIES : BODIES.filter( body => ![ 'sun', 'moon' ].includes( body.id ) );
	return `<div class="comparison-grid">${ comparison.map( ( id, index ) => `<section class="comparison-card"><label class="control-label" for="compare${ index }">${ e( t( 'chooseWorld' ) ) } ${ number( index + 1 ) }<select id="compare${ index }">${ worlds.map( body => `<option value="${ body.id }"${ body.id === id ? ' selected' : '' }>${ e( i18n.body( body.id ).name ) }</option>` ).join( '' ) }</select></label><div id="compareDetail${ index }"></div></section>` ).join( '' ) }</div>`;
}

function updateComparison() {
	const size = id => Number( getBody( id ).diameter.replace( /[^\d.]/g, '' ) );
	const maximum = Math.max( ...comparison.map( size ) );
	comparison.forEach( ( id, index ) => {
		const target = byId( 'compareDetail' + index );
		if ( !target ) return;
		const world = i18n.body( id );
		target.innerHTML = `${ worldArt( id ) }<p class="small-note">${ e( family( id ) ) }</p><dl class="facts"><div><dt>${ e( t( 'diameter' ) ) }</dt><dd><bdi>${ e( world.diameter ) }</bdi></dd></div><div><dt>${ e( t( 'rotation' ) ) }</dt><dd><bdi>${ e( world.rotation ) }</bdi></dd></div></dl><div class="diameter-bar" role="img" aria-label="${ e( world.name + ': ' + world.diameter ) }"><span style="width:${ size( id ) / maximum * 100 }%"></span></div>`;
	} );
}

function renderAtlas() {
	return `<div class="page-heading"><p class="eyebrow">${ e( t( 'lightExperience' ) ) }</p><h1>${ e( t( 'atlasTitle' ) ) }</h1><p class="lead">${ e( t( 'atlasIntro' ) ) }</p></div><div class="atlas-grid" aria-label="${ e( t( 'chooseWorld' ) ) }">${ BODIES.map( body => `<button class="world-button" type="button" data-world="${ body.id }" aria-pressed="${ body.id === atlasWorld }">${ worldArt( body.id ) }<span>${ e( i18n.body( body.id ).name ) }</span></button>` ).join( '' ) }</div><section id="atlasDetail" class="atlas-detail panel" data-read-content></section><section class="panel" style="margin-top:25px"><h2>${ e( t( 'compare' ) ) }</h2><p class="small-note">${ e( t( 'compareHint' ) ) }</p>${ comparisonMarkup( true ) }</section>`;
}

function updateAtlas() {
	const target = byId( 'atlasDetail' );
	if ( !target ) return;
	const world = i18n.body( atlasWorld );
	const period = atlasWorld === 'sun' ? world.rotation : world.year + ' ' + world.yearUnit;
	const periodLabel = i18n.t( atlasWorld === 'sun' ? 'rotationEquator' : atlasWorld === 'moon' ? 'orbitEarth' : 'orbitSun' );
	target.innerHTML = `<div><p class="eyebrow">${ e( world.type ) }</p><h2>${ e( world.name ) }</h2><p>${ e( world.description ) }</p><p class="small-note">${ e( world.fact ) }</p><a class="text-button" href="${ viewerUrl( atlasWorld ) }" ${ external }>${ e( t( 'open3d' ) ) } ↗</a><p class="small-note">${ e( t( 'optional3dNote' ) ) }</p></div><div><dl class="facts">${ [ [ t( 'diameter' ), world.diameter ], [ t( 'rotation' ), world.rotation ], [ periodLabel, period ], [ i18n.t( atlasWorld === 'moon' ? 'fromEarth' : 'fromSun' ), world.distance ] ].map( ( [ label, value ] ) => `<div><dt>${ e( label ) }</dt><dd><bdi>${ e( value ) }</bdi></dd></div>` ).join( '' ) }</dl><p class="small-note" style="margin-top:25px">${ e( t( 'scaleNote' ) ) }</p><a class="source-link" href="https://science.nasa.gov/solar-system/" ${ external }>NASA · ${ e( t( 'sources' ) ) } ↗</a></div>`;
	for ( const button of document.querySelectorAll( '[data-world]' ) ) button.setAttribute( 'aria-pressed', String( button.dataset.world === atlasWorld ) );
}

function embedCode() {
	const mission = byId( 'embedMission' )?.value || catalog.missions[ 0 ].id;
	const url = link( { view: 'missions', mission, embed: true } );
	return `<iframe src="${ url }" title="${ t( 'pageTitle' ) }" width="100%" height="800" loading="lazy" style="border:0;border-radius:12px" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"></iframe>`;
}

function renderResources() {
	return `<div class="page-heading" data-read-content><p class="eyebrow">${ e( t( 'resources' ) ) }</p><h1>${ e( t( 'resourcesTitle' ) ) }</h1><p class="lead">${ e( catalog.resources.intro ) }</p><p class="small-note">${ e( t( 'packDescription' ) ) }</p></div><div class="resource-grid">${ [ 'student', 'educator' ].map( ( type, index ) => `<section class="panel resource-card"><span class="resource-number">0${ index + 1 } / PDF + HTML</span><h2>${ e( t( type === 'student' ? 'studentPack' : 'teacherPack' ) ) }</h2><p>${ e( t( type === 'student' ? 'resourcesIntro' : 'educatorNote' ) ) }</p><div class="actions"><a class="button" href="${ e( appUrl( `learn/packs/${ i18n.language }-${ type }.pdf` ) ) }" download>${ e( t( 'downloadPdf' ) ) } ↓</a><a class="button secondary" href="${ e( appUrl( `learn/packs/${ i18n.language }-${ type }.html` ) ) }" download>${ e( t( 'downloadHtml' ) ) }</a><a class="text-button" href="${ e( appUrl( `learn/packs/${ i18n.language }-${ type }.html` ) ) }" ${ external }>${ e( t( 'printPack' ) ) } ↗</a></div></section>` ).join( '' ) }</div><div class="support-grid"><section class="panel"><h3>${ e( t( 'preparation' ) ) }</h3><ul class="resource-list">${ catalog.resources.preparation.map( item => `<li>${ e( item ) }</li>` ).join( '' ) }</ul></section><section class="panel"><h3>${ e( t( 'evaluation' ) ) }</h3><ul class="resource-list">${ catalog.resources.evaluation.map( item => `<li>${ e( item ) }</li>` ).join( '' ) }</ul></section></div><section class="panel share-panel"><h2>${ e( t( 'embedTitle' ) ) }</h2><p class="small-note">${ e( t( 'embedCopy' ) ) }</p><label class="control-label" for="embedMission">${ e( t( 'missions' ) ) }<select id="embedMission">${ catalog.missions.map( mission => `<option value="${ mission.id }">${ e( mission.title ) }</option>` ).join( '' ) }</select></label><label class="small-note" for="embedCode">HTML</label><textarea id="embedCode" readonly spellcheck="false" dir="ltr"></textarea><div class="actions"><button class="button secondary" type="button" data-action="copyEmbed">${ e( t( 'copyEmbed' ) ) }</button><button class="text-button" type="button" data-action="copyLesson">${ e( t( 'copyLink' ) ) } ↗</button></div></section>`;
}

function renderResearch() {
	return `<div data-read-content><div class="page-heading"><p class="eyebrow">${ e( t( 'research' ) ) }</p><h1>${ e( t( 'researchTitle' ) ) }</h1><p class="lead">${ e( catalog.research.intro ) }</p></div><div class="research-steps">${ catalog.research.steps.map( ( step, index ) => `<section class="panel"><span class="eyebrow">0${ index + 1 }</span><p>${ e( step ) }</p></section>` ).join( '' ) }</div><p class="lesson-note">${ e( catalog.research.participationNote ) }</p><div class="resource-grid"><section class="panel"><p class="eyebrow">ZOONIVERSE</p><h2>${ e( catalog.research.zooniverseTitle ) }</h2><p class="muted">${ e( catalog.research.zooniverseDescription ) }</p><a class="button" href="https://www.zooniverse.org/projects" ${ external }>${ e( t( 'research' ) ) } ↗</a><p class="small-note" style="margin-top:16px"><a href="https://www.zooniverse.org/get-involved/educate" ${ external }>${ e( t( 'resources' ) ) } ↗</a> · ${ e( t( 'externalLink' ) ) }</p></section><section class="panel"><p class="eyebrow">UNIVERSE AWARENESS</p><h2>${ e( catalog.research.unaweTitle ) }</h2><p class="muted">${ e( catalog.research.unaweDescription ) }</p><a class="button secondary" href="https://unawe.org/resources/universebox/" ${ external }>${ e( t( 'resources' ) ) } ↗</a><p class="small-note" style="margin-top:16px">${ e( t( 'externalLink' ) ) }</p></section></div><p class="small-note" style="margin-top:25px">${ e( t( 'researchNote' ) ) }</p></div>`;
}

function feedbackMarkup() {
	return `<details class="feedback"><summary>${ e( t( 'feedbackTitle' ) ) }</summary><form class="feedback-form" id="feedbackForm"><p class="muted">${ e( t( 'feedbackIntro' ) ) }</p><fieldset><legend>${ e( t( 'feedbackRating' ) ) }</legend><div class="rating-options">${ [ 'feedbackHelpful', 'feedbackOkay', 'feedbackDifficult' ].map( key => `<label><input type="radio" name="rating" value="${ key }" required> ${ e( t( key ) ) }</label>` ).join( '' ) }</div></fieldset><label for="feedbackMessage">${ e( t( 'feedbackMessage' ) ) }</label><textarea id="feedbackMessage" maxlength="1000" placeholder="${ e( t( 'feedbackPlaceholder' ) ) }"></textarea><p class="small-note">${ e( t( 'feedbackPrivacy' ) ) }</p><div class="actions"><button class="button secondary" type="submit">${ e( t( 'feedbackDownload' ) ) } ↓</button><button class="text-button" type="button" data-action="copyFeedback">${ e( t( 'feedbackCopy' ) ) }</button></div></form></details>`;
}

function render( focus = false ) {
	catalog = getLearningCatalog( i18n.language );
	document.documentElement.lang = i18n.language;
	document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
	document.body.classList.toggle( 'is-embedded', route.embed );
	document.title = ( missionForRoute()?.title || t( route.view ) ) + ' — SpaceExplorer';
	document.querySelector( '.skip-link' ).textContent = t( 'skipLink' );
	renderHeader();
	const mission = missionForRoute();
	const content = route.view === 'atlas' ? renderAtlas() : route.view === 'resources' ? renderResources() : route.view === 'research' ? renderResearch() : mission ? renderLesson( mission ) : renderHome();
	byId( 'main' ).innerHTML = content + accessControls() + feedbackMarkup();
	byId( 'footer' ).innerHTML = `<div class="footer-credit"><span class="signature" dir="ltr">s<span>.</span></span><p><strong dir="ltr">sadikdev / SPACEEXPLORER</strong><br>${ e( t( 'footerMotto' ) ) }</p></div><p>${ e( t( 'privacyNote' ) ) }<br><a href="${ viewerUrl() }" ${ external }>${ e( t( 'aboutProject' ) ) } ↗</a></p>`;
	byId( 'resetTitle' ).textContent = t( 'resetProgress' );
	byId( 'resetCopy' ).textContent = t( 'resetConfirm' );
	byId( 'cancelReset' ).textContent = t( 'resetCancel' );
	byId( 'confirmReset' ).textContent = t( 'confirm' );
	byId( 'resetDialog' ).setAttribute( 'aria-labelledby', 'resetTitle' );
	updateComparison();
	updateAtlas();
	updateExperiment();
	updateAccess();
	if ( byId( 'embedCode' ) ) byId( 'embedCode' ).value = embedCode();
	if ( focus ) { byId( 'main' ).focus(); window.scrollTo( 0, 0 ); }
}

function updateExperiment() {
	if ( byId( 'daySlider' ) ) {
		byId( 'dayOutput' ).textContent = number( elapsedDays ) + ' ' + t( 'earthDays' );
		for ( const id of [ 'earth', 'mars' ] ) {
			const fraction = elapsedDays / getBody( id ).period;
			const ring = document.querySelector( '.' + id + '-ring' );
			const marker = byId( id + 'Orbit' );
			marker.style.setProperty( '--x', Math.cos( fraction * Math.PI * 2 ) * ring.clientWidth / 2 );
			marker.style.setProperty( '--y', -Math.sin( fraction * Math.PI * 2 ) * ring.clientHeight / 2 );
			byId( id + 'Progress' ).textContent = number( fraction * 100, 1 ) + '%';
		}
	}
	if ( byId( 'phaseSlider' ) ) {
		const name = t( [ 'phaseNew', 'phaseFirst', 'phaseFull', 'phaseLast' ][ phase ] );
		byId( 'phaseDisc' ).dataset.phase = String( phase );
		byId( 'phaseName' ).textContent = name;
		byId( 'phaseSlider' ).setAttribute( 'aria-valuetext', name );
	}
}

async function copy( text, key, field ) {
	try {
		await navigator.clipboard.writeText( text );
		notify( t( key ) );
	} catch {
		let target = field;
		if ( !target ) {
			target = document.createElement( 'textarea' );
			target.readOnly = true;
			target.className = 'copy-fallback';
			target.setAttribute( 'aria-label', t( 'copyLink' ) );
			target.style.cssText = 'display:block;width:100%;margin:20px 0';
			byId( 'main' ).append( target );
		}
		target.value = text;
		target.focus();
		target.select();
		notify( t( 'copyFailed' ) );
	}
}

function feedbackText() {
	const form = byId( 'feedbackForm' );
	if ( !form.reportValidity() ) return;
	const rating = new FormData( form ).get( 'rating' );
	const message = byId( 'feedbackMessage' ).value.trim().slice( 0, 1000 );
	return [ t( 'feedbackReport' ), '', t( 'feedbackLanguage' ) + ': ' + i18n.language, t( 'feedbackMission' ) + ': ' + ( missionForRoute()?.title || t( route.view ) ), t( 'feedbackProgress' ) + ': ' + t( 'completed', { count: number( completeCount() ), total: number( 3 ) } ), t( 'feedbackRating' ) + ': ' + t( rating ), '', message || t( 'feedbackNoText' ) ].join( '\n' );
}

document.addEventListener( 'click', async event => {
	const routeLink = event.target.closest( 'a[data-route]' );
	if ( routeLink && event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey ) {
		event.preventDefault();
		navigate( learningRoute( routeLink.href ) );
		return;
	}
	const button = event.target.closest( 'button' );
	if ( !button || button.disabled ) return;
	if ( button.dataset.step !== undefined && missionForRoute() ) {
		reader.stop();
		store.update( route.mission, { step: Number( button.dataset.step ) } );
		render( true );
	}
	if ( button.dataset.world ) { reader.stop(); atlasWorld = button.dataset.world; updateAtlas(); }
	if ( button.id === 'readAloud' ) {
		if ( speechActive ) reader.stop();
		else reader.speak( [ ...document.querySelectorAll( '[data-read-content]' ) ].map( node => node.innerText ).join( '\n' ), i18n.language );
	}
	if ( button.id === 'offlineButton' ) {
		if ( offlineState === 'ready' ) { const state = await offline.remove(); notify( t( state === 'idle' ? 'offlineRemoved' : 'offlineError' ) ); }
		else await offline.save();
	}
	if ( button.dataset.action === 'share' ) copy( link( { embed: false } ), 'linkCopied' );
	if ( button.dataset.action === 'copyEmbed' ) copy( embedCode(), 'embedCopied', byId( 'embedCode' ) );
	if ( button.dataset.action === 'copyLesson' ) copy( link( { view: 'missions', mission: byId( 'embedMission' ).value, embed: false } ), 'linkCopied' );
	if ( button.dataset.action === 'copyFeedback' ) { const text = feedbackText(); if ( text ) copy( text, 'feedbackCopied' ); }
	if ( button.dataset.action === 'retry' ) { reader.stop(); store.update( route.mission, { step: 0, answers: [ null, null, null ], checked: false } ); render( true ); }
	if ( button.dataset.action === 'reset' ) { byId( 'resetDialog' ).returnValue = 'cancel'; byId( 'resetDialog' ).showModal(); byId( 'cancelReset' ).focus(); }
} );

document.addEventListener( 'change', event => {
	const target = event.target;
	if ( target.id === 'language' ) {
		reader.stop();
		i18n.setLanguage( target.value );
		preference( 'spaceexplorer.language', i18n.language );
		navigate( { language: i18n.language }, true );
		byId( 'language' ).focus();
	}
	if ( target.id === 'textSize' ) {
		document.documentElement.classList.toggle( 'large-text', target.value === 'large' );
		preference( 'spaceexplorer.learning.textSize', target.value );
		updateExperiment();
	}
	if ( [ 'compare0', 'compare1' ].includes( target.id ) ) { reader.stop(); comparison[ Number( target.id.slice( -1 ) ) ] = target.value; updateComparison(); }
	if ( target.id === 'embedMission' ) byId( 'embedCode' ).value = embedCode();
	if ( target.name.startsWith( 'question-' ) && missionForRoute() ) {
		const progress = store.get( route.mission );
		progress.answers[ Number( target.name.slice( 9 ) ) ] = Number( target.value );
		store.update( route.mission, { answers: progress.answers, checked: false } );
	}
} );

document.addEventListener( 'input', event => {
	if ( event.target.id === 'daySlider' ) { elapsedDays = Number( event.target.value ); updateExperiment(); }
	if ( event.target.id === 'phaseSlider' ) { phase = Number( event.target.value ); updateExperiment(); }
} );

document.addEventListener( 'submit', event => {
	if ( event.target.id === 'quizForm' ) {
		event.preventDefault();
		const mission = missionForRoute();
		const answers = store.get( mission.id ).answers;
		if ( !gradeMission( mission, answers ).complete ) {
			byId( 'quizError' ).textContent = t( 'chooseAnswer' );
			byId( 'quizError' ).hidden = false;
			const missing = answers.findIndex( answer => answer === null );
			document.querySelector( `[name="question-${ missing }"]` )?.focus();
			return;
		}
		reader.stop();
		store.update( mission.id, { answers, checked: true } );
		render( true );
		byId( 'quizResult' ).focus();
	}
	if ( event.target.id === 'feedbackForm' ) {
		event.preventDefault();
		const text = feedbackText();
		if ( !text ) return;
		const url = URL.createObjectURL( new Blob( [ text ], { type: 'text/plain;charset=utf-8' } ) );
		const anchor = document.createElement( 'a' );
		anchor.href = url;
		anchor.download = `spaceexplorer-feedback-${ i18n.language }.txt`;
		anchor.click();
		setTimeout( () => URL.revokeObjectURL( url ), 1000 );
		notify( t( 'feedbackThanks' ) );
	}
} );

byId( 'resetDialog' ).addEventListener( 'close', () => {
	if ( byId( 'resetDialog' ).returnValue === 'confirm' ) {
		store.reset();
		render();
		notify( t( 'progressReset' ) );
	}
	document.querySelector( '[data-action="reset"]' )?.focus();
} );
window.addEventListener( 'popstate', () => {
	reader.stop();
	route = learningRoute( location.href );
	if ( route.language ) i18n.setLanguage( route.language );
	render( true );
} );
window.addEventListener( 'resize', updateExperiment );
document.documentElement.classList.toggle( 'large-text', preference( 'spaceexplorer.learning.textSize' ) === 'large' );
render();
offline.status();
