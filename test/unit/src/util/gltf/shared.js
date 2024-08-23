export function createMockParsingContext() {
	/** @type {import("../../../../../src/util/gltf/gltfParsing.js").GltfParsingContext} */
	const context = {
		async getBuffer(bufferIndex) {
			return new ArrayBuffer(0);
		},
		async getBufferView(bufferViewIndex) {
			return new ArrayBuffer(0);
		},
		extensions: [],
	};
	return context;
}
