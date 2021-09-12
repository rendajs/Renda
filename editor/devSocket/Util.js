import {performance} from "perf_hooks";
import {Buffer} from "buffer";

// https://stackoverflow.com/a/8809472/3625298
export function generateUuid() {
	let d = new Date().getTime();// Timestamp
	let d2 = (performance && performance.now && (performance.now() * 1000)) || 0;// Time in microseconds since page-load or 0 if unsupported
	return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
		let r = Math.random() * 16;// random number between 0 and 16
		if (d > 0) {// Use timestamp until depleted
			r = (d + r) % 16 | 0;
			d = Math.floor(d / 16);
		} else {// Use microseconds since page-load if supported
			r = (d2 + r) % 16 | 0;
			d2 = Math.floor(d2 / 16);
		}
		return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
	});
}

export function base64ToArrayBuffer(base64) {
	const buffer = Buffer.from(base64, "base64");
	return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}
