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

export function binaryToUuid(buffer, offset = 0){
	const view = new Uint8Array(buffer);
	let str = "";
	for(let i=0; i<16; i++){
        str += view[offset+i].toString(16).padStart(2, "0");
        if(i == 3 || i == 5 || i == 7 || i == 9) str += "-";
    }
	return str;
}
