import { getLearningCatalog, LEARNING_LANGUAGES } from './catalog.mjs';
import { SITE_URL } from '../site-config.mjs';

const escapeHtml = value => String( value ).replaceAll( '&', '&amp;' ).replaceAll( '<', '&lt;' ).replaceAll( '>', '&gt;' ).replaceAll( '"', '&quot;' );
const list = items => `<ul>${ items.map( item => `<li>${ escapeHtml( item ) }</li>` ).join( '' ) }</ul>`;
const writingSpace = ( lines = 3 ) => `<div class="writing-space" aria-hidden="true">${ '<div></div>'.repeat( lines ) }</div>`;

const styles = `
	* { box-sizing: border-box; }
	:root { color-scheme: light; }
	body { margin: 0; background: #e8ebef; color: #192331; font: 11pt/1.45 Arial, "Segoe UI", Tahoma, sans-serif; }
	[dir="rtl"] { font-family: Tahoma, Arial, sans-serif; }
	h1, h2, h3, p { margin: 0 0 3mm; text-wrap: pretty; }
	h1 { font-size: 22pt; line-height: 1.15; }
	h2 { font-size: 20pt; line-height: 1.2; }
	h3 { font-size: 12pt; line-height: 1.3; margin-top: 3mm; }
	a { color: #174d74; text-decoration-thickness: 1px; text-underline-offset: 2px; }
	ul, ol { padding-inline-start: 6mm; margin: 2mm 0 4mm; }
	li { margin-bottom: 2mm; }
	.toolbar { max-width: 210mm; margin: 16px auto; display: flex; gap: 16px; align-items: center; flex-wrap: wrap; padding: 0 16px; }
	.toolbar button { border: 0; border-radius: 5px; padding: 12px 18px; background: #192331; color: #fff; font: inherit; cursor: pointer; }
	.toolbar a { font-weight: bold; }
	.sheet { width: 210mm; min-height: 297mm; margin: 16px auto; padding: 15mm 17mm; background: #fff; display: flex; flex-direction: column; }
	.sheet > * { flex-shrink: 0; }
	.brand { display: flex; justify-content: space-between; gap: 8mm; border-bottom: 0.6mm solid #273d53; padding-bottom: 3mm; margin-bottom: 4mm; font-size: 9pt; }
	.brand strong { font-size: 12pt; }
	.brand small { font-size: 9pt; font-weight: normal; margin-inline-start: 2mm; }
	.eyebrow { color: #435a70; font-size: 9pt; font-weight: bold; margin-bottom: 2mm; }
	.metadata { display: flex; gap: 3mm 7mm; flex-wrap: wrap; font-size: 9pt; margin: 3mm 0; }
	.subtitle { color: #435a70; }
	.objective { border-inline-start: 1mm solid #8094a7; padding-inline-start: 4mm; margin: 3mm 0; }
	.objective strong { display: block; font-size: 9pt; margin-bottom: 1mm; }
	.activity { padding: 3mm; border: 0.25mm solid #a9b5c0; border-radius: 2mm; margin: 3mm 0; break-inside: avoid; }
	.activity h3 { margin-top: 0; }
	.writing-space { margin: 2mm 0 5mm; }
	.writing-space div { height: 8mm; border-bottom: 0.2mm solid #9aa7b3; }
	.questions { list-style: none; padding: 0; counter-reset: question; }
	.question { counter-increment: question; break-inside: avoid; margin-bottom: 5mm; }
	.question > h3 { margin-bottom: 3mm; }
	.question > h3::before { content: counter(question) ". "; color: #435a70; }
	.options { padding: 0; list-style: none; }
	.options li { display: flex; align-items: baseline; gap: 3mm; margin: 2mm 0; }
	.box { display: inline-block; width: 3mm; height: 3mm; border: 0.25mm solid #506273; flex-shrink: 0; }
	.correct-answer { font-weight: bold; padding-inline-start: 3mm; border-inline-start: 0.7mm solid #647f70; }
	.note { color: #43505e; font-size: 9pt; }
	.lesson-link { font-size: 8.5pt; overflow-wrap: anywhere; }
	.lesson-link a { direction: ltr; unicode-bidi: isolate; }
	.footer { margin-top: auto; padding-top: 3mm; border-top: 0.2mm solid #bec6cf; font-size: 8pt; }
	.footer > div { display: flex; justify-content: space-between; gap: 5mm; }
	.footer p { margin-bottom: 1mm; }
	.footer a { direction: ltr; unicode-bidi: isolate; overflow-wrap: anywhere; }
	.pack-intro { margin-bottom: 3mm; }
	.student .pack-intro h1 { font-size: 18pt; }
	.student .sheet > p { margin-bottom: 2mm; }
	.educator .mission-content { font-size: 10pt; line-height: 1.4; }
	.educator .mission-content h2 { font-size: 18pt; }
	.educator .mission-content h3 { margin-top: 2mm; font-size: 11pt; }
	.educator .question { margin-bottom: 2mm; }
	.educator .mission-content p { margin-bottom: 1.5mm; }
	@media screen and (max-width: 820px) {
		.sheet { width: auto; min-height: 0; margin: 16px 8px; padding: 24px 20px; }
		h1 { font-size: 20pt; }
		h2 { font-size: 18pt; }
		.brand { flex-wrap: wrap; gap: 8px; }
		.footer { margin-top: 16px; }
	}
	@page { size: A4; margin: 15mm 17mm; }
	@media print {
		body { background: #fff; }
		.toolbar { display: none; }
		.sheet { width: auto; min-height: 266mm; margin: 0; padding: 0; break-after: page; }
		.sheet:last-child { break-after: auto; }
		a { color: inherit; }
	}
`;

export function renderPack( language, { answers = false } = {} ) {
	const code = LEARNING_LANGUAGES.some( item => item.code === language ) ? language : 'en';
	const { ui, missions, resources } = getLearningCatalog( code );
	const title = answers ? ui.answersTitle : ui.worksheetTitle;
	const packName = answers ? ui.teacherPack : ui.studentPack;
	const totalPages = answers ? 4 : 6;
	let pageNumber = 0;
	const missionNumber = index => escapeHtml( ui.missionNumber.replace( '{count}', index + 1 ) );
	const lessonUrl = mission => `${ SITE_URL }learn/?lang=${ code }&mission=${ mission.id }`;
	const footer = mission => `<footer class="footer">${ mission ? `<p class="lesson-link">${ escapeHtml( ui.lessonLink ) }: <a href="${ escapeHtml( lessonUrl( mission ) ) }">${ escapeHtml( lessonUrl( mission ) ) }</a></p><p>${ escapeHtml( ui.sources ) }: ${ escapeHtml( mission.source.label ) } - <a href="${ escapeHtml( mission.source.url ) }">${ escapeHtml( mission.source.url ) }</a></p>` : '' }<div><span><bdi>sadikdev</bdi> · ${ escapeHtml( ui.footerMotto ) }</span><bdi>${ ++ pageNumber } / ${ totalPages }</bdi></div></footer>`;
	const sheet = ( content, mission = null ) => `<section class="sheet"><header class="brand"><span dir="ltr"><strong>SpaceExplorer</strong><small>sadikdev</small></span><span>${ escapeHtml( packName ) }</span></header>${ content }${ footer( mission ) }</section>`;
	const missionHeading = ( mission, index ) => `<p class="eyebrow">${ missionNumber( index ) } · ${ escapeHtml( ui.minutes ) }</p><h2>${ escapeHtml( mission.title ) }</h2><p class="subtitle">${ escapeHtml( mission.subtitle ) }</p><div class="objective"><strong>${ escapeHtml( ui.learningGoals ) }</strong>${ escapeHtml( mission.objective ) }</div>`;
	const reading = mission => `<h3>${ escapeHtml( ui.reading ) }</h3>${ mission.reading.map( paragraph => `<p>${ escapeHtml( paragraph ) }</p>` ).join( '' ) }`;
	const activity = mission => `<div class="activity"><h3>${ escapeHtml( ui.activity ) }: ${ escapeHtml( mission.activity.title ) }</h3><p>${ escapeHtml( mission.activity.instruction ) }</p><p><strong>${ escapeHtml( mission.activity.prompt ) }</strong></p></div>`;
	let pages;
	if ( answers ) {
		pages = sheet( `<div class="pack-intro"><h1>${ escapeHtml( title ) }</h1><p>${ escapeHtml( resources.intro ) }</p><div class="metadata"><strong>${ escapeHtml( ui.ages ) }</strong><span>${ escapeHtml( ui.totalTime ) }</span></div><p class="note">${ escapeHtml( ui.educatorNote ) }</p></div><h2>${ escapeHtml( ui.learningGoals ) }</h2>${ list( missions.map( mission => mission.objective ) ) }<h3>${ escapeHtml( ui.preparation ) }</h3>${ list( resources.preparation ) }<h3>${ escapeHtml( ui.facilitation ) }</h3>${ list( resources.facilitation ) }<h3>${ escapeHtml( ui.evaluation ) }</h3>${ list( resources.evaluation ) }<p class="note">${ escapeHtml( ui.scaleNote ) }</p>` );
		pages += missions.map( ( mission, index ) => sheet( `<div class="mission-content">${ missionHeading( mission, index ) }${ reading( mission ) }${ activity( mission ) }<p><strong>${ escapeHtml( ui.discuss ) }:</strong> ${ escapeHtml( mission.activity.conclusion ) }</p><h3>${ escapeHtml( ui.answers ) }</h3><ol class="answer-key questions">${ mission.questions.map( question => `<li class="question"><h3>${ escapeHtml( question.prompt ) }</h3><p class="correct-answer">${ escapeHtml( question.options[ question.correct ] ) }</p><p>${ escapeHtml( question.explanation ) }</p></li>` ).join( '' ) }</ol><p><strong>${ escapeHtml( ui.reflection ) }:</strong> ${ escapeHtml( mission.reflection ) }</p></div>`, mission ) ).join( '' );
	} else {
		pages = missions.map( ( mission, index ) => {
			const introduction = index === 0 ? `<div class="pack-intro"><h1>${ escapeHtml( title ) }</h1><div class="metadata"><strong>${ escapeHtml( ui.ages ) }</strong><span>${ escapeHtml( ui.minutes ) } · ${ escapeHtml( ui.perMission ) }</span></div><p class="note">${ escapeHtml( ui.materials ) }</p></div>` : '';
			const lesson = sheet( `${ introduction }${ missionHeading( mission, index ) }${ reading( mission ) }${ activity( mission ) }<h3>${ escapeHtml( ui.observationNotes ) }</h3>${ writingSpace() }<p class="note">${ escapeHtml( ui.scaleNote ) }</p>`, mission );
			const worksheet = sheet( `<p class="eyebrow">${ missionNumber( index ) }</p><h2>${ escapeHtml( mission.title ) }</h2><h3>${ escapeHtml( ui.questions ) }</h3><p>${ escapeHtml( ui.selectAnswer ) }</p><ol class="questions">${ mission.questions.map( question => `<li class="question"><h3>${ escapeHtml( question.prompt ) }</h3><ul class="options">${ question.options.map( option => `<li><span class="box" aria-hidden="true"></span><span>${ escapeHtml( option ) }</span></li>` ).join( '' ) }</ul></li>` ).join( '' ) }</ol><h3>${ escapeHtml( ui.reflection ) }</h3><p>${ escapeHtml( mission.reflection ) }</p>${ writingSpace( 4 ) }`, mission );
			return lesson + worksheet;
		} ).join( '' );
	}
	return `<!DOCTYPE html>
<html lang="${ code }" dir="${ code === 'ar' ? 'rtl' : 'ltr' }">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title>${ escapeHtml( title ) } - SpaceExplorer</title>
	<style>${ styles }</style>
</head>
<body class="${ answers ? 'educator' : 'student' }">
	<nav class="toolbar"><button type="button" onclick="window.print()">${ escapeHtml( ui.printPack ) }</button><a href="${ SITE_URL }learn/?lang=${ code }&amp;view=resources">${ escapeHtml( ui.resourcesTitle ) }</a></nav>
	<main>${ pages }</main>
</body>
</html>
`;
}
