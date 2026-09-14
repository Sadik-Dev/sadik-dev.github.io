import { BASE_DAYS_PER_SECOND, BODIES, getBody, orbitalPosition, rotationAngle, advanceDays } from './solar-data.mjs';
import { damp, easeProgress, flightPosition, reframeScale, PointerGesture } from './camera-motion.mjs';
import { createI18n } from './i18n.mjs';

const THREE = window.THREE;
const TAU = Math.PI * 2;

export function createSolarScene( { container, labelContainer, onSelect, onLoad, onError, onTime, onTexture, onInteraction } ) {

	let renderer;
	try {
		renderer = new THREE.WebGLRenderer( { alpha: true, antialias: true, powerPreference: 'high-performance' } );
	} catch {
		onError?.( 'WebGL unavailable' );
		return null;
	}

	const scene = new THREE.Scene();
	const camera = new THREE.PerspectiveCamera( 44, 1, 0.1, 3000 );
	const controls = new THREE.OrbitControls( camera, renderer.domElement );
	const bodies = new Map();
	const textures = new Set();
	const orbitLines = new Map();
	const raycaster = new THREE.Raycaster();
	const pointer = new THREE.Vector2();
	const projected = new THREE.Vector3();
	const scratch = new THREE.Vector3();
	const pickables = [];
	const reducedMotion = window.matchMedia( '(prefers-reduced-motion: reduce)' );
	const gesture = new PointerGesture();
	const orbitAxis = new THREE.Vector3( 0, 1, 0 );
	const sunClearance = getBody( 'sun' ).radius * 1.2;
	let motionPreference = 'system';
	let motionReduced = reducedMotion.matches;
	let paused = reducedMotion.matches;
	let speed = BASE_DAYS_PER_SECOND;
	let days = 0;
	let selectedId = 'sun';
	let focusedId = null;
	let view = 'perspective';
	let showLabels = true;
	let showOrbits = true;
	let transition = null;
	let zoomDistance = null;
	let drift = false;
	let driftRate = 0;
	let minimumDistance = 3;
	let lastInteraction = -Infinity;
	let interactionNotified = false;
	let hoveredId = null;
	let hoverPoint = null;
	let lastHover = 0;
	let frame = 0;
	let previousTime = 0;
	let lastTimeReport = 0;
	let disposed = false;
	let width = 1;
	let height = 1;
	let language = createI18n();
	const followedPosition = new THREE.Vector3();

	renderer.setPixelRatio( Math.min( window.devicePixelRatio || 1, 1.75 ) );
	renderer.setClearColor( 0x020710, 0 );
	renderer.outputEncoding = THREE.sRGBEncoding;
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 1.15;
	renderer.domElement.setAttribute( 'aria-label', language.t( 'canvasLabel' ) );
	labelContainer.setAttribute( 'aria-label', language.t( 'sceneLabels' ) );
	renderer.domElement.setAttribute( 'role', 'img' );
	renderer.domElement.style.touchAction = 'none';
	container.appendChild( renderer.domElement );

	controls.enableDamping = !motionReduced;
	controls.dampingFactor = 0.075;
	controls.enableKeys = false;
	controls.rotateSpeed = 0.55;
	controls.zoomSpeed = 0.75;
	controls.minDistance = 3;
	controls.maxDistance = 1100;
	controls.minPolarAngle = 0.005;
	controls.maxPolarAngle = Math.PI * 0.49;

	const manager = new THREE.LoadingManager();
	const loader = new THREE.TextureLoader( manager );
	manager.onLoad = () => {
		if ( ! disposed ) onLoad?.();
	};
	manager.onError = url => {
		if ( disposed ) return;
		const filename = url.split( '/' ).pop();
		scene.traverse( object => {
			if ( ! object.material ) return;
			for ( const key of [ 'map', 'normalMap', 'specularMap', 'alphaMap' ] ) {
				if ( object.material[ key ]?.name === filename ) {
					object.material[ key ] = null;
					object.material.needsUpdate = true;
				}
			}
		} );
		onError?.( 'Texture unavailable: ' + filename );
	};

	function texture( filename, color = true ) {
		const map = loader.load( 'assets/sss/' + filename, loaded => {
			if ( ! disposed && color && onTexture ) {
				const thumbnail = document.createElement( 'canvas' );
				thumbnail.width = 64;
				thumbnail.height = 32;
				thumbnail.getContext( '2d' ).drawImage( loaded.image, 0, 0, 64, 32 );
				onTexture( filename, thumbnail.toDataURL() );
			}
		} );
		map.name = filename;
		if ( color ) map.encoding = THREE.sRGBEncoding;
		map.anisotropy = Math.min( renderer.capabilities.getMaxAnisotropy(), 8 );
		textures.add( map );
		return map;
	}

	const sunlight = new THREE.PointLight( 0xffeed9, 1.9, 0 );
	scene.add( sunlight );
	scene.add( new THREE.HemisphereLight( 0x7998c2, 0x101526, 0.25 ) );
	const fill = new THREE.DirectionalLight( 0xaac6ee, 0.16 );
	fill.position.set( 0, 160, 240 );
	scene.add( fill );
	addStars();

	for ( const body of BODIES ) {
		const group = new THREE.Group();
		const axis = new THREE.Group();
		axis.rotation.x = -THREE.MathUtils.degToRad( body.inclination );
		axis.rotation.z = THREE.MathUtils.degToRad( body.tilt );
		group.add( axis );
		const map = texture( body.texture );
		let material;
		if ( body.id === 'sun' ) {
			material = new THREE.MeshBasicMaterial( { map, color: 0xffdfac, toneMapped: false } );
		} else if ( body.id === 'earth' ) {
			material = new THREE.MeshPhongMaterial( {
				map,
				normalMap: texture( '2k_earth_normal_map.png', false ),
				normalScale: new THREE.Vector2( 0.35, 0.35 ),
				specularMap: texture( '2k_earth_specular_map.png', false ),
				specular: new THREE.Color( 0x253e50 ),
				shininess: 40
			} );
		} else {
			material = new THREE.MeshStandardMaterial( { map, roughness: 0.96, metalness: 0 } );
		}
		const surface = new THREE.Mesh( new THREE.SphereBufferGeometry( body.radius, 64, 40 ), material );
		surface.userData.bodyId = body.id;
		axis.add( surface );
		pickables.push( surface );
		const entry = { body, group, axis, surface, label: createLabel( body ) };
		bodies.set( body.id, entry );
		if ( body.id === 'earth' ) addEarthLayers( entry );
		if ( body.id === 'saturn' ) addSaturnRings( entry );
		if ( body.id === 'sun' ) addSunGlow( entry );
		if ( body.orbitRadius > 0 ) addOrbit( body );
		scene.add( group );
	}

	function addStars() {
		const positions = [];
		const colors = [];
		let seed = 5271;
		function random() {
			seed = ( seed * 16807 ) % 2147483647;
			return ( seed - 1 ) / 2147483646;
		}
		for ( let i = 0; i < 1350; i ++ ) {
			const y = random() * 2 - 1;
			const angle = random() * TAU;
			const radial = Math.sqrt( 1 - y * y );
			positions.push( Math.cos( angle ) * radial * 1200, y * 1200, Math.sin( angle ) * radial * 1200 );
			const brightness = 0.12 + Math.pow( random(), 4 ) * 0.5;
			colors.push( brightness * 0.85, brightness * 0.92, brightness );
		}
		const geometry = new THREE.BufferGeometry();
		geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( positions, 3 ) );
		geometry.setAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );
		scene.add( new THREE.Points( geometry, new THREE.PointsMaterial( {
			size: 1.2, sizeAttenuation: false, vertexColors: true, transparent: true,
			opacity: 0.7, depthWrite: false, toneMapped: false
		} ) ) );
	}

	function addEarthLayers( entry ) {
		const cloudMap = texture( '2k_earth_clouds.jpg', false );
		entry.clouds = new THREE.Mesh(
			new THREE.SphereBufferGeometry( entry.body.radius * 1.012, 64, 40 ),
			new THREE.MeshPhongMaterial( { color: 0xeaf5ff, alphaMap: cloudMap, transparent: true, opacity: 0.82, depthWrite: false, shininess: 0 } )
		);
		entry.axis.add( entry.clouds );
		const atmosphere = new THREE.Mesh(
			new THREE.SphereBufferGeometry( entry.body.radius * 1.025, 64, 40 ),
			new THREE.ShaderMaterial( {
				uniforms: { tint: { value: new THREE.Color( 0x459cff ) } },
				vertexShader: `varying vec3 worldNormal;
varying vec3 worldPosition;
void main() {
	worldNormal = normalize(mat3(modelMatrix) * normal);
	worldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
	gl_Position = projectionMatrix * viewMatrix * vec4(worldPosition, 1.0);
}`,
				fragmentShader: `uniform vec3 tint;
varying vec3 worldNormal;
varying vec3 worldPosition;
void main() {
	vec3 viewDirection = normalize(cameraPosition - worldPosition);
	float rim = pow(1.0 - abs(dot(normalize(worldNormal), viewDirection)), 3.0);
	float daylight = max(dot(normalize(worldNormal), normalize(-worldPosition)), 0.0);
	gl_FragColor = vec4(tint, rim * (0.15 + daylight * 0.55));
}`,
				side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
			} )
		);
		entry.axis.add( atmosphere );
	}

	function addSaturnRings( entry ) {
		const inner = entry.body.radius * 1.24;
		const outer = entry.body.radius * 2.3;
		const geometry = new THREE.RingBufferGeometry( inner, outer, 160 );
		const positions = geometry.attributes.position;
		const uv = geometry.attributes.uv;
		for ( let i = 0; i < positions.count; i ++ ) {
			const radius = Math.hypot( positions.getX( i ), positions.getY( i ) );
			uv.setXY( i, ( radius - inner ) / ( outer - inner ), 0.5 );
		}
		const ring = new THREE.Mesh( geometry, new THREE.MeshStandardMaterial( {
			map: texture( '2k_saturn_ring_alpha.png' ), side: THREE.DoubleSide,
			transparent: true, alphaTest: 0.03, roughness: 1, metalness: 0, opacity: 0.95, depthWrite: false
		} ) );
		ring.rotation.x = - Math.PI / 2;
		ring.userData.bodyId = entry.body.id;
		entry.axis.add( ring );
		pickables.push( ring );
	}

	function addSunGlow( entry ) {
		const canvas = document.createElement( 'canvas' );
		canvas.width = canvas.height = 256;
		const context = canvas.getContext( '2d' );
		const gradient = context.createRadialGradient( 128, 128, 0, 128, 128, 128 );
		gradient.addColorStop( 0, 'rgba(255, 211, 127, 0.75)' );
		gradient.addColorStop( 0.27, 'rgba(255, 181, 71, 0.55)' );
		gradient.addColorStop( 0.42, 'rgba(255, 131, 30, 0.16)' );
		gradient.addColorStop( 0.7, 'rgba(236, 91, 11, 0.035)' );
		gradient.addColorStop( 1, 'rgba(222, 70, 0, 0)' );
		context.fillStyle = gradient;
		context.fillRect( 0, 0, 256, 256 );
		const map = new THREE.CanvasTexture( canvas );
		textures.add( map );
		const glow = new THREE.Sprite( new THREE.SpriteMaterial( {
			map, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.65, toneMapped: false
		} ) );
		glow.scale.setScalar( entry.body.radius * 5.7 );
		entry.group.add( glow );
	}

	function addOrbit( body ) {
		const points = [];
		for ( let i = 0; i <= 256; i ++ ) {
			const position = orbitalPosition( body, i / 256 * body.period );
			points.push( new THREE.Vector3( position.x, position.y, position.z ) );
		}
		const line = new THREE.Line( new THREE.BufferGeometry().setFromPoints( points ), new THREE.LineBasicMaterial( {
			color: 0x667386, transparent: true, opacity: body.id === 'moon' ? 0.09 : 0.12, depthWrite: false
		} ) );
		orbitLines.set( body.id, line );
		scene.add( line );
	}

	function createLabel( body ) {
		const localized = language.body( body.id );
		const label = document.createElement( 'button' );
		label.type = 'button';
		label.className = 'planet-label';
		label.dataset.planet = body.id;
		label.style.setProperty( '--planet-color', body.color );
		label.setAttribute( 'aria-label', language.t( 'selectWorld', { name: localized.name } ) );
		const name = document.createElement( 'span' );
		name.className = 'label-name';
		name.textContent = localized.name;
		const period = document.createElement( 'span' );
		period.className = 'label-period';
		period.textContent = labelPeriod( localized );
		label.append( name, period );
		label.addEventListener( 'click', event => {
			event.stopPropagation();
			onSelect?.( body.id );
		} );
		label.addEventListener( 'pointerenter', () => setHovered( body.id ) );
		label.addEventListener( 'pointerleave', () => setHovered( null ) );
		labelContainer.appendChild( label );
		return label;
	}

	function labelPeriod( body ) {
		return body.id === 'sun' ? language.t( 'ourStar' ) : body.id === 'moon' ? language.t( 'earthMoon' ) : body.year + ' ' + body.yearUnit;
	}

	function setLanguage( nextLanguage ) {
		language = nextLanguage;
		for ( const entry of bodies.values() ) {
			const body = language.body( entry.body.id );
			entry.label.querySelector( '.label-name' ).textContent = body.name;
			entry.label.querySelector( '.label-period' ).textContent = labelPeriod( body );
			entry.label.setAttribute( 'aria-label', language.t( 'selectWorld', { name: body.name } ) );
		}
		renderer.domElement.setAttribute( 'aria-label', language.t( 'canvasLabel' ) );
		labelContainer.setAttribute( 'aria-label', language.t( 'sceneLabels' ) );
	}

	function updateBodies() {
		for ( const entry of bodies.values() ) {
			const position = orbitalPosition( entry.body, days );
			entry.group.position.set( position.x, position.y, position.z );
			if ( entry.body.id === 'moon' ) entry.group.position.add( bodies.get( 'earth' ).group.position );
			const rotation = rotationAngle( entry.body, days );
			entry.surface.rotation.y = rotation % TAU;
			if ( entry.clouds ) entry.clouds.rotation.y = ( rotation * 0.97 + 0.3 ) % TAU;
		}
		orbitLines.get( 'moon' )?.position.copy( bodies.get( 'earth' ).group.position );
	}

	function updateLabels() {
		const placed = [];
		const entries = Array.from( bodies.values() ).sort( ( a, b ) => Number( b.body.id === selectedId ) - Number( a.body.id === selectedId ) || b.body.radius - a.body.radius );
		for ( const entry of entries ) {
			projected.copy( entry.group.position );
			projected.y += entry.body.radius * 1.2;
			projected.project( camera );
			let x = ( projected.x * 0.5 + 0.5 ) * width;
			let y = ( - projected.y * 0.5 + 0.5 ) * height;
			const related = ! focusedId || entry.body.id === focusedId || ( focusedId === 'earth' && entry.body.id === 'moon' ) || ( focusedId === 'moon' && entry.body.id === 'earth' );
			const visible = showLabels && related && projected.z < 1 && projected.z > - 1 && x > 20 && x < width - 20 && y > 50 && y < height - 145 && ( entry.body.id !== 'moon' || focusedId === 'earth' || focusedId === 'moon' );
			entry.label.hidden = ! visible;
			if ( visible ) {
				const labelWidth = width < 761 ? 60 : 82;
				const labelHeight = width < 761 ? 23 : 37;
				for ( const [ dx, dy ] of [ [ 0, 0 ], [ 0, -28 ], [ -46, 0 ], [ 46, 0 ], [ -40, 30 ], [ 40, 30 ], [ 0, -55 ] ] ) {
					const bounds = { left: x + dx - labelWidth / 2, right: x + dx + labelWidth / 2, top: y + dy - labelHeight, bottom: y + dy };
					if ( bounds.left < 8 || bounds.right > width - 8 || bounds.top < 75 || bounds.bottom > height - 145 ) continue;
					if ( placed.some( other => bounds.left < other.right + 4 && bounds.right > other.left - 4 && bounds.top < other.bottom + 3 && bounds.bottom > other.top - 3 ) ) continue;
					x += dx;
					y += dy;
					placed.push( bounds );
					break;
				}
				entry.label.style.left = x.toFixed( 1 ) + 'px';
				entry.label.style.top = y.toFixed( 1 ) + 'px';
				entry.label.style.zIndex = entry.body.id === selectedId ? '3' : '2';
			}
		}
	}

	function overviewPose() {
		if ( view === 'top' ) {
			const fit = Math.max( 1, 0.85 / camera.aspect );
			return { position: new THREE.Vector3( 0, 430 * fit, 0.01 ), target: new THREE.Vector3() };
		}
		const fit = Math.max( 1, 1.35 / camera.aspect );
		const target = new THREE.Vector3( 0, 18 * fit, 0 );
		const position = new THREE.Vector3( 0, 145 * fit, 205 * fit );
		return { position, target };
	}

	function focusPose( id ) {
		const entry = bodies.get( id );
		const extent = entry.body.radius * ( id === 'saturn' ? 2.3 : 1 );
		const distance = Math.max( 1, 0.68 / camera.aspect );
		const target = entry.group.position.clone().add( new THREE.Vector3( 0, extent * 0.3, 0 ) );
		let offset;
		if ( view === 'top' ) {
			offset = new THREE.Vector3( 0, extent * 6 * distance, 0.001 );
		} else {
			offset = id === 'sun' ? new THREE.Vector3( 0.2, 0, 1 ) : entry.group.position.clone().negate();
			offset.y = 0;
			offset.normalize().applyAxisAngle( new THREE.Vector3( 0, 1, 0 ), 0.65 ).multiplyScalar( extent * 5.7 );
			offset.y = extent * 1.9;
			offset.multiplyScalar( distance );
		}
		return { position: target.clone().add( offset ), target };
	}

	function animateCamera( pose ) {
		clearControlMotion();
		zoomDistance = null;
		driftRate = 0;
		controls.minDistance = Math.min( minimumDistance, camera.position.distanceTo( controls.target ) );
		transition = {
			fromPosition: camera.position.clone(), fromTarget: controls.target.clone(), pose, elapsed: 0,
			duration: Math.min( 2.6, 1.15 + camera.position.distanceTo( pose.position ) / 180 )
		};
		if ( motionReduced ) finishTransition();
	}

	function cancelTransition() {
		transition = null;
		zoomDistance = null;
	}

	function clearControlMotion() {
		const position = camera.position.clone();
		const target = controls.target.clone();
		controls.enableDamping = false;
		controls.update();
		camera.position.copy( position );
		controls.target.copy( target );
		controls.saveState();
		controls.reset();
		controls.enableDamping = !motionReduced;
	}

	function finishTransition() {
		if ( !transition ) return;
		const position = flightPosition( transition.fromPosition, transition.pose.position, 1, sunClearance );
		camera.position.set( position.x, position.y, position.z );
		controls.target.copy( transition.pose.target );
		controls.minDistance = minimumDistance;
		transition = null;
		controls.update();
	}

	function updateMotionPreference() {
		const nextReduced = motionPreference === 'reduced' || ( motionPreference === 'system' && reducedMotion.matches );
		if ( nextReduced === motionReduced ) return;
		motionReduced = nextReduced;
		if ( motionReduced ) {
			finishTransition();
			if ( zoomDistance !== null ) applyZoom( zoomDistance );
			zoomDistance = null;
			driftRate = 0;
		}
		clearControlMotion();
	}

	function setMotionPreference( value ) {
		if ( ![ 'system', 'full', 'reduced' ].includes( value ) ) return;
		motionPreference = value;
		updateMotionPreference();
	}

	function select( id, focus = false ) {
		if ( ! getBody( id ) ) return;
		selectedId = id;
		for ( const entry of bodies.values() ) {
			entry.label.classList.toggle( 'is-selected', entry.body.id === id );
			entry.label.setAttribute( 'aria-pressed', String( entry.body.id === id ) );
		}
		if ( focus ) {
			view = 'perspective';
			focusedId = id;
			followedPosition.copy( bodies.get( id ).group.position );
			minimumDistance = bodies.get( id ).body.radius * ( id === 'saturn' ? 3 : 1.6 );
			animateCamera( focusPose( id ) );
		}
		updateOrbits();
	}

	function updateOrbits() {
		for ( const [ id, line ] of orbitLines ) {
			line.visible = showOrbits && ( ! focusedId || ( id === 'moon' && ( focusedId === 'earth' || focusedId === 'moon' ) ) );
			line.material.color.set( id === selectedId ? getBody( id ).color : 0x667386 );
			line.material.opacity = id === selectedId ? 0.34 : id === 'moon' ? 0.09 : 0.12;
		}
	}

	function overview() {
		view = 'perspective';
		focusedId = null;
		minimumDistance = 25;
		updateOrbits();
		animateCamera( overviewPose() );
	}

	function setView( nextView ) {
		focusedId = null;
		minimumDistance = 25;
		view = nextView === 'top' ? 'top' : 'perspective';
		updateOrbits();
		animateCamera( overviewPose() );
	}

	function zoom( factor ) {
		if ( ! Number.isFinite( factor ) || factor <= 0 ) return;
		transition = null;
		driftRate = 0;
		clearControlMotion();
		const current = zoomDistance ?? camera.position.distanceTo( controls.target );
		zoomDistance = THREE.MathUtils.clamp( current * factor, controls.minDistance, controls.maxDistance );
		if ( motionReduced ) {
			applyZoom( zoomDistance );
			zoomDistance = null;
		}
	}

	function applyZoom( distance ) {
		scratch.copy( camera.position ).sub( controls.target ).setLength( distance );
		camera.position.copy( controls.target ).add( scratch );
		controls.update();
	}

	function onPointerDown( event ) {
		if ( !gesture.active ) interactionNotified = false;
		gesture.start( event.pointerId, event.clientX, event.clientY, event.button );
		cancelTransition();
		clearControlMotion();
		lastInteraction = performance.now();
		driftRate = 0;
		setHovered( null );
		if ( gesture.dragged ) directInteraction();
	}

	function onPointerMove( event ) {
		gesture.move( event.pointerId, event.clientX, event.clientY );
		if ( gesture.active && gesture.dragged ) directInteraction();
		if ( event.pointerType !== 'touch' ) hoverPoint = event.target === renderer.domElement ? { x: event.clientX, y: event.clientY } : null;
	}

	function onPointerUp( event ) {
		if ( !gesture.active ) return;
		const click = gesture.end( event.pointerId, event.clientX, event.clientY );
		if ( !gesture.active ) lastInteraction = performance.now();
		if ( click ) {
			const id = bodyAtPoint( click.x, click.y );
			if ( id ) onSelect?.( id );
		}
		updateCursor();
	}

	function cancelGesture() {
		if ( gesture.active ) cancelTransition();
		gesture.cancel();
		clearControlMotion();
		hoverPoint = null;
		setHovered( null );
		driftRate = 0;
		lastInteraction = performance.now();
	}

	function directInteraction() {
		lastInteraction = performance.now();
		driftRate = 0;
		if ( !interactionNotified ) onInteraction?.();
		interactionNotified = true;
		updateCursor();
	}

	function onWheel() {
		cancelTransition();
		clearControlMotion();
		interactionNotified = false;
		directInteraction();
	}

	function onPointerLeave() {
		hoverPoint = null;
		setHovered( null );
	}

	function bodyAtPoint( x, y ) {
		const rect = renderer.domElement.getBoundingClientRect();
		if ( x < rect.left || x > rect.right || y < rect.top || y > rect.bottom ) return null;
		pointer.set( ( x - rect.left ) / rect.width * 2 - 1, - ( y - rect.top ) / rect.height * 2 + 1 );
		raycaster.setFromCamera( pointer, camera );
		const hit = raycaster.intersectObjects( pickables, false )[ 0 ];
		return hit?.object.userData.bodyId || null;
	}

	function setHovered( id ) {
		if ( hoveredId !== id ) {
			bodies.get( hoveredId )?.label.classList.remove( 'is-hovered' );
			bodies.get( id )?.label.classList.add( 'is-hovered' );
			hoveredId = id;
		}
		updateCursor();
	}

	function updateCursor() {
		renderer.domElement.style.cursor = gesture.active && gesture.dragged ? 'grabbing' : hoveredId ? 'pointer' : 'grab';
	}

	function onVisibilityChange() {
		previousTime = 0;
		if ( document.hidden ) {
			gesture.cancel();
			clearControlMotion();
			driftRate = 0;
			onPointerLeave();
		}
	}

	function onContextLost( event ) {
		event.preventDefault();
		onError?.( 'WebGL unavailable' );
	}

	function resize() {
		const initial = width === 1 && height === 1;
		const previousAspect = camera.aspect;
		const previousOverview = focusedId ? null : overviewPose();
		width = container.clientWidth || window.innerWidth;
		height = container.clientHeight || window.innerHeight;
		camera.aspect = width / height;
		camera.updateProjectionMatrix();
		renderer.setSize( width, height );
		if ( initial ) {
			const pose = overviewPose();
			camera.position.copy( pose.position );
			controls.target.copy( pose.target );
		} else {
			const scale = reframeScale( previousAspect, camera.aspect, focusedId ? 0.68 : view === 'top' ? 0.85 : 1.35 );
			if ( scale !== 1 ) {
				camera.position.sub( controls.target ).multiplyScalar( scale ).add( controls.target );
				if ( zoomDistance !== null ) zoomDistance *= scale;
				if ( transition ) {
					transition.fromPosition.sub( transition.fromTarget ).multiplyScalar( scale ).add( transition.fromTarget );
					transition.pose.position.sub( transition.pose.target ).multiplyScalar( scale ).add( transition.pose.target );
				}
				if ( previousOverview ) {
					const shift = overviewPose().target.sub( previousOverview.target );
					camera.position.add( shift );
					controls.target.add( shift );
					if ( transition ) {
						transition.fromPosition.add( shift );
						transition.fromTarget.add( shift );
						transition.pose.position.add( shift );
						transition.pose.target.add( shift );
					}
				}
			}
		}
		controls.update();
	}

	function render( now ) {
		if ( disposed ) return;
		frame = requestAnimationFrame( render );
		const delta = previousTime ? Math.min( 0.1, Math.max( 0, ( now - previousTime ) / 1000 ) ) : 0;
		previousTime = now;
		if ( document.hidden ) return;
		days = advanceDays( days, delta, speed, paused );
		updateBodies();
		if ( focusedId ) {
			const position = bodies.get( focusedId ).group.position;
			scratch.copy( position ).sub( followedPosition );
			camera.position.add( scratch );
			controls.target.add( scratch );
			if ( transition ) {
				transition.fromPosition.add( scratch );
				transition.fromTarget.add( scratch );
				transition.pose.position.add( scratch );
				transition.pose.target.add( scratch );
			}
			followedPosition.copy( position );
		}
		if ( transition ) {
			transition.elapsed += delta;
			const progress = Math.min( transition.elapsed / transition.duration, 1 );
			const position = flightPosition( transition.fromPosition, transition.pose.position, progress, sunClearance );
			camera.position.set( position.x, position.y, position.z );
			controls.target.lerpVectors( transition.fromTarget, transition.pose.target, easeProgress( progress ) );
			if ( progress === 1 ) finishTransition();
		}
		if ( zoomDistance !== null ) {
			const distance = damp( camera.position.distanceTo( controls.target ), zoomDistance, delta );
			if ( Math.abs( distance - zoomDistance ) < 0.005 ) {
				applyZoom( zoomDistance );
				zoomDistance = null;
			} else applyZoom( distance );
		}
		const canDrift = drift && !paused && !motionReduced && !gesture.active && !transition && zoomDistance === null && now - lastInteraction > 2500;
		driftRate = canDrift ? damp( driftRate, 0.018, delta, 2 ) : 0;
		if ( driftRate ) {
			scratch.copy( camera.position ).sub( controls.target ).applyAxisAngle( orbitAxis, driftRate * delta );
			camera.position.copy( controls.target ).add( scratch );
		}
		controls.update();
		if ( camera.position.lengthSq() < sunClearance * sunClearance ) {
			if ( camera.position.lengthSq() === 0 ) camera.position.y = sunClearance;
			else camera.position.setLength( sunClearance );
			camera.lookAt( controls.target );
		}
		renderer.render( scene, camera );
		updateLabels();
		if ( hoverPoint && !gesture.active && now - lastHover > 80 ) {
			lastHover = now;
			setHovered( bodyAtPoint( hoverPoint.x, hoverPoint.y ) );
		}
		if ( now - lastTimeReport > 250 ) {
			lastTimeReport = now;
			onTime?.( days );
		}
	}

	function dispose() {
		disposed = true;
		cancelAnimationFrame( frame );
		window.removeEventListener( 'resize', resize );
		window.removeEventListener( 'blur', cancelGesture );
		reducedMotion.removeEventListener( 'change', updateMotionPreference );
		document.removeEventListener( 'visibilitychange', onVisibilityChange );
		renderer.domElement.removeEventListener( 'pointerdown', onPointerDown );
		renderer.domElement.removeEventListener( 'pointerleave', onPointerLeave );
		renderer.domElement.removeEventListener( 'wheel', onWheel, true );
		document.removeEventListener( 'pointermove', onPointerMove );
		document.removeEventListener( 'pointerup', onPointerUp );
		document.removeEventListener( 'pointercancel', cancelGesture );
		renderer.domElement.removeEventListener( 'webglcontextlost', onContextLost );
		controls.dispose();
		scene.traverse( object => {
			object.geometry?.dispose();
			object.material?.dispose();
		} );
		for ( const map of textures ) map.dispose();
		for ( const entry of bodies.values() ) entry.label.remove();
		renderer.dispose();
		renderer.domElement.remove();
	}

	renderer.domElement.addEventListener( 'pointerdown', onPointerDown );
	renderer.domElement.addEventListener( 'pointerleave', onPointerLeave );
	renderer.domElement.addEventListener( 'wheel', onWheel, { capture: true, passive: true } );
	document.addEventListener( 'pointermove', onPointerMove );
	document.addEventListener( 'pointerup', onPointerUp );
	document.addEventListener( 'pointercancel', cancelGesture );
	renderer.domElement.addEventListener( 'webglcontextlost', onContextLost );
	window.addEventListener( 'resize', resize );
	window.addEventListener( 'blur', cancelGesture );
	reducedMotion.addEventListener( 'change', updateMotionPreference );
	document.addEventListener( 'visibilitychange', onVisibilityChange );
	updateBodies();
	resize();
	select( 'sun' );
	frame = requestAnimationFrame( render );

	return {
		select, overview, setView, zoom, dispose, setMotionPreference, setLanguage,
		setPaused( value ) { paused = Boolean( value ); if ( paused ) driftRate = 0; },
		setDrift( value ) { drift = Boolean( value ); if ( !drift ) driftRate = 0; },
		setSpeed( value ) { if ( Number.isFinite( value ) && value >= 0 ) speed = value; },
		setOrbits( value ) { showOrbits = Boolean( value ); updateOrbits(); },
		setLabels( value ) { showLabels = Boolean( value ); },
		resetTime() {
			days = 0;
			updateBodies();
			onTime?.( days );
		}
	};

}
