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

//https://stackoverflow.com/a/8809472/3625298
export function generateUuid() {
	var d = new Date().getTime();//Timestamp
	var d2 = (performance && performance.now && (performance.now()*1000)) || 0;//Time in microseconds since page-load or 0 if unsupported
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
		var r = Math.random() * 16;//random number between 0 and 16
		if(d > 0){//Use timestamp until depleted
			r = (d + r)%16 | 0;
			d = Math.floor(d/16);
		} else {//Use microseconds since page-load if supported
			r = (d2 + r)%16 | 0;
			d2 = Math.floor(d2/16);
		}
		return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
	});
}

export function parseMimeType(mimeType){
	const split = mimeType.split("/");
	if(split.length < 2) return null;
	const type = split[0];
	const subTypeWithParams = split[1];
	const paramsSplit = subTypeWithParams.split(";");
	const [subType, ...paramsStr] = paramsSplit;
	const params = {}
	for(const [name, value] of paramsStr.map(p => p.trim().split("="))){
		params[name] = value;
	}
	return {type, subType, params};
}

export function handleDuplicateName(existingNames, prefix, suffix="", numberPrefix=" "){
	if(!Array.isArray(existingNames) && typeof existingNames == "object" && existingNames.files && existingNames.directories){
		existingNames = [...existingNames.files, ...existingNames.directories];
	}
	if(!existingNames.includes(prefix+suffix)) return prefix+suffix;
	let i = 0;
	while(true){
		i++;
		const newName = prefix+numberPrefix+i+suffix;
		if(!existingNames.includes(newName)) return newName;
	}
}

export function toFormattedJsonString(jsonObj, {
	purpose = "fileStorage",
} = {}){

	const countTabs = str => {
		let tabCount = 0;
		for(const char of str){
			if(char == "\t"){
				tabCount++;
			}else{
				break;
			}
		}
		return tabCount;
	}

	const jsonStr = JSON.stringify(jsonObj, null, "\t");

	const splitStr = jsonStr.split("\n");
	let removeNewLineIndents = [];

	let prevTabCount = 0;
	let indentStartPos = 0;
	let hasParsedCurrentIndent = false;
	for(let i=0; i<splitStr.length; i++){
		const line = splitStr[i];
		let tabCount = countTabs(line);
		if(tabCount > prevTabCount){
			indentStartPos = i;
			hasParsedCurrentIndent = false;
		}else if(tabCount < prevTabCount && !hasParsedCurrentIndent){
			hasParsedCurrentIndent = true;
			const lineBeforeIndent = splitStr[indentStartPos - 1];
			removeNewLineIndents.push({
				isObjectIndent: lineBeforeIndent.endsWith("{"),
				start: indentStartPos,
				end: i + 1,
			});
		}
		prevTabCount = tabCount;
	}

	if(removeNewLineIndents.length == 1 && removeNewLineIndents[0].isObjectIndent && purpose == "fileStorage"){
		removeNewLineIndents = [];
	}

	const needsNewLinePositions = new Array(splitStr.length).fill(true);
	for(const indent of removeNewLineIndents){
		if(indent.isObjectIndent){
			let indentCharCount = 0;
			for(let i=indent.start; i<indent.end - 1; i++){
				const line = splitStr[i];
				for(const char of line){
					if(char != "\t") indentCharCount++;
				}
			}
			if(indentCharCount > 40) continue;
		}
		for(let i=indent.start; i<indent.end; i++){
			needsNewLinePositions[i] = false;
		}
	}

	let newStr = "";
	for(let i=0; i<splitStr.length; i++){
		let addStr = splitStr[i];
		if(needsNewLinePositions[i] && i != 0){
			newStr += "\n";
		}else{
			let tabCount = countTabs(addStr);
			addStr = addStr.slice(tabCount);
			if(addStr.endsWith(",") && !needsNewLinePositions[i + 1]) addStr += " ";
		}
		newStr += addStr;
	}

	if(purpose == "fileStorage"){
		newStr += "\n";
	}
	return newStr;
}

export function prettifyVariableName(variableName){
	variableName = "" + variableName;
	const words = variableName.split(/(?=[A-Z])|_/);
	const capitalizedWords = words.map(w => {
		if(w && w.length != 0){
			return w[0].toUpperCase() + w.slice(1).toLowerCase();
		}else{
			return w;
		}
	});
	return capitalizedWords.join(" ");
}
