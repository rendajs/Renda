//clamp
export function clamp(v, min, max){
	return Math.max(min, Math.min(max, v));
}

export function clamp01(v){
	return clamp(v, 0, 1);
}

export function lerp(a,b,t){
	return a + t * (b-a);
}

//inverse lerp
export function iLerp(a,b,t){
	return (t - a) / (b - a);
}

export function mapValue(fromMin,fromMax,toMin,toMax,val,performClamp){
	let lerpedVal = iLerp(fromMin,fromMax,val);
	if(performClamp) lerpedVal = clamp01(lerpedVal);
	return lerp(toMin,toMax,lerpedVal);
}
