export {default as BinaryComposer} from "./BinaryComposer.js";
export {default as BinaryDecomposer} from "./BinaryDecomposer.js";
export {default as MultiKeyWeakMap} from "./MultiKeyWeakMap.js";
export {default as SingleInstancePromise} from "./SingleInstancePromise.js";

export async function* streamAsyncIterator(stream){
	const reader = stream.getReader();
	try{
		while(true){
			const {done, value} = await reader.read();
			if(done) return;
			yield value;
		}
	}finally{
		reader.releaseLock();
	}
}

export function isUuid(uuidStr){
	const re = /[0-9a-f]{8}\-[0-9a-f]{4}\-[0-9a-f]{4}\-[0-9a-f]{4}\-[0-9a-f]{12}/gmi;
	return re.test(uuidStr);
}

export function findObjectKey(obj, value){
	for(const [key,val] of Object.entries(obj)){
		if(val == value){
			return key;
		}
	}
}
