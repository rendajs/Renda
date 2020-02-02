//clamp
export function clamp(v, min, max){
	return Math.max(min, Math.min(max, v));
}

export function clamp01(v){
	return clamp(v, 0, 1);
}

export function mod(n, m) {
	return ((n % m) + m) % m;
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

export function getElemSize(el){
	let w = el.offsetWidth;
	let h = el.offsetHeight;
	let style = window.getComputedStyle(el);

	w = ["margin-left", "margin-right", "border-left", "border-right", "padding-left", "padding-right"]
		.map(k => parseInt(style.getPropertyValue(k), 10))
		.reduce((prev, cur) => prev + cur, w);
	h = ["margin-top", "margin-bottom", "border-top", "border-bottom", "padding-top", "padding-bottom"]
		.map(k => parseInt(style.getPropertyValue(k), 10))
		.reduce((prev, cur) => prev + cur, h);
	return [w,h];
}
