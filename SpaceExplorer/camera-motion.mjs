export function damp( current, target, delta, rate = 9 ) {
	return target + ( current - target ) * Math.exp( -rate * Math.max( 0, delta ) );
}

function outsideSphere( point, radius ) {
	const length = Math.hypot( point.x, point.y, point.z );
	if ( length >= radius ) return { ...point };
	if ( length === 0 ) return { x: 0, y: radius, z: 0 };
	const scale = radius / length;
	return { x: point.x * scale, y: point.y * scale, z: point.z * scale };
}

export function easeProgress( progress ) {
	const time = Math.max( 0, Math.min( 1, progress ) );
	return time * time * time * ( time * ( time * 6 - 15 ) + 10 );
}

export function flightPosition( from, to, progress, clearance ) {
	const start = outsideSphere( from, clearance );
	const end = outsideSphere( to, clearance );
	const t = easeProgress( progress );
	if ( t === 0 ) return start;
	if ( t === 1 ) return end;
	const delta = { x: end.x - start.x, y: end.y - start.y, z: end.z - start.z };
	const lengthSquared = delta.x ** 2 + delta.y ** 2 + delta.z ** 2;
	const nearest = lengthSquared ? Math.max( 0, Math.min( 1, -( start.x * delta.x + start.y * delta.y + start.z * delta.z ) / lengthSquared ) ) : 0;
	const distance = Math.hypot( start.x + delta.x * nearest, start.y + delta.y * nearest, start.z + delta.z * nearest );
	if ( distance >= clearance - 1e-8 ) {
		return { x: start.x + delta.x * t, y: start.y + delta.y * t, z: start.z + delta.z * t };
	}

	const fromRadius = Math.hypot( start.x, start.y, start.z );
	const toRadius = Math.hypot( end.x, end.y, end.z );
	const axis = { x: start.x / fromRadius, y: start.y / fromRadius, z: start.z / fromRadius };
	const dot = Math.max( -1, Math.min( 1, ( axis.x * end.x + axis.y * end.y + axis.z * end.z ) / toRadius ) );
	let tangent = { x: end.x / toRadius - axis.x * dot, y: end.y / toRadius - axis.y * dot, z: end.z / toRadius - axis.z * dot };
	let tangentLength = Math.hypot( tangent.x, tangent.y, tangent.z );
	if ( tangentLength < 1e-6 ) {
		const up = Math.abs( axis.y ) < 0.9 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
		const along = axis.x * up.x + axis.y * up.y;
		tangent = { x: up.x - axis.x * along, y: up.y - axis.y * along, z: -axis.z * along };
		tangentLength = Math.hypot( tangent.x, tangent.y, tangent.z );
	}
	const angle = Math.acos( dot ) * t;
	const radius = fromRadius + ( toRadius - fromRadius ) * t;
	const a = Math.cos( angle ) * radius;
	const b = Math.sin( angle ) * radius / tangentLength;
	return { x: axis.x * a + tangent.x * b, y: axis.y * a + tangent.y * b, z: axis.z * a + tangent.z * b };
}

export function reframeScale( previousAspect, nextAspect, fitAspect ) {
	const rotated = ( previousAspect < 1 ) !== ( nextAspect < 1 );
	if ( !rotated && Math.abs( nextAspect / previousAspect - 1 ) < 0.35 ) return 1;
	return Math.max( 1, fitAspect / nextAspect ) / Math.max( 1, fitAspect / previousAspect );
}

export class PointerGesture {
	constructor( threshold = 6 ) {
		this.threshold = threshold;
		this.points = new Map();
		this.candidate = null;
		this.dragged = false;
	}

	get active() { return this.points.size > 0; }

	start( id, x, y, button = 0 ) {
		if ( !this.active ) {
			this.dragged = false;
			this.candidate = button === 0 ? id : null;
		} else this.dragged = true;
		this.points.set( id, { x, y } );
	}

	move( id, x, y ) {
		const start = this.points.get( id );
		if ( start && Math.hypot( x - start.x, y - start.y ) > this.threshold ) this.dragged = true;
	}

	end( id, x, y ) {
		if ( !this.points.has( id ) ) return null;
		this.move( id, x, y );
		this.points.delete( id );
		const click = !this.active && !this.dragged && this.candidate === id ? { x, y } : null;
		if ( !this.active ) this.candidate = null;
		return click;
	}

	cancel() {
		this.points.clear();
		this.candidate = null;
		this.dragged = false;
	}
}
