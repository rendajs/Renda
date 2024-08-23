import { assertSpyCalls, returnsNext, spy, stub } from "std/testing/mock.ts";
import { assertEquals, assertExists, assertRejects } from "std/testing/asserts.ts";
import { DRACO_EXTENSION_NAME, Mesh, draco } from "../../../../../../src/mod.js";
import { UNSIGNED_INT, UNSIGNED_SHORT } from "../../../../../../src/util/gltf/constants.js";

/* eslint-disable new-cap */
/* eslint-disable no-underscore-dangle */
/* eslint-disable camelcase */

/**
 * @param {object} options
 * @param {number[]} [options.mallocReturns]
 * @param {number[][]} [options.getAttributeDataBytes]
 * @param {number[][]} [options.getTrianglesUInt16Bytes]
 * @param {number[][]} [options.getTrianglesUInt32Bytes]
 * @param {boolean} [options.decodeFails]
 * @param {import("../../../../../../src/util/gltf/applyMeshComponents.js").GltfPrimitiveParsingContextIndexAccessorData?} [options.indexAccessorData]
 */
function createMocks({
	mallocReturns = [],
	getAttributeDataBytes = [],
	getTrianglesUInt16Bytes = [],
	getTrianglesUInt32Bytes = [],
	decodeFails = false,
	indexAccessorData = null,
} = {}) {
	const HEAPU8 = new Uint8Array(100);

	/**
	 * @param {number[][]} bytesArray
	 * @param {string} functionName
	 */
	function createHeapFiller(bytesArray, functionName) {
		let callIndex = 0;
		/**
		 * @param {number} outSize
		 * @param {number} outValuesPtr
		 */
		function fillHeap(outSize, outValuesPtr) {
			const bytes = bytesArray[callIndex];
			if (!bytes) {
				throw new Error(`Expected ${functionName} to not be called more than ${bytesArray.length} times`);
			}
			if (bytes.length != outSize) {
				throw new Error(`Expected call ${callIndex} to ${functionName} to have a byteLength of ${bytes.length} (got ${outSize})`);
			}
			HEAPU8.set(bytes, outValuesPtr);
			callIndex++;
			return true;
		}
		return fillHeap;
	}
	const getAttributeDataFiller = createHeapFiller(getAttributeDataBytes, "GetAttributeDataArrayForAllPoints");
	const getTrianglesUInt16Filler = createHeapFiller(getTrianglesUInt16Bytes, "GetTrianglesUInt16Array");
	const getTrianglesUInt32Filler = createHeapFiller(getTrianglesUInt32Bytes, "GetTrianglesUInt32Array");

	class Decoder {
		/** @type {import("../../../../../../src/mod.js").DracoDecoder["GetEncodedGeometryType"]} */
		GetEncodedGeometryType(buffer) {
			return decoderModule.TRIANGULAR_MESH;
		}

		/** @type {import("../../../../../../src/mod.js").DracoDecoder["DecodeBufferToMesh"]} */
		DecodeBufferToMesh(buffer, outputGeometry) {
			return new Status();
		}

		/** @type {import("../../../../../../src/mod.js").DracoDecoder["GetAttribute"]} */
		GetAttribute(mesh, attributeId) {
			return new DracoPointAttribute();
		}

		/** @type {import("../../../../../../src/mod.js").DracoDecoder["GetAttributeDataArrayForAllPoints"]} */
		GetAttributeDataArrayForAllPoints(mesh, attribute, dataType, outSize, outValuesPtr) {
			return getAttributeDataFiller(outSize, outValuesPtr);
		}

		/** @type {import("../../../../../../src/mod.js").DracoDecoder["GetTrianglesUInt16Array"]} */
		GetTrianglesUInt16Array(mesh, outSize, outValuesPtr) {
			return getTrianglesUInt16Filler(outSize, outValuesPtr);
		}

		/** @type {import("../../../../../../src/mod.js").DracoDecoder["GetTrianglesUInt32Array"]} */
		GetTrianglesUInt32Array(mesh, outSize, outValuesPtr) {
			return getTrianglesUInt32Filler(outSize, outValuesPtr);
		}
	}

	class DecoderBuffer {
		/** @type {import("../../../../../../src/mod.js").DracoDecoderBuffer["Init"]} */
		Init(encodedBytes, byteLength) {

		}
	}

	class Mesh {
		num_points() {
			return 3;
		}

		num_faces() {
			return 1;
		}
	}

	class DracoPointAttribute {
		num_components() {
			return 3;
		}

		data_type() {
			return decoderModule.DT_FLOAT32;
		}
	}

	class Status {
		ok() {
			if (decodeFails) return false;
			return true;
		}

		error_msg() {
			if (decodeFails) return "test error";
			return "";
		}
	}

	const decoderModule = /** @type {import("../../../../../../src/mod.js").DracoDecoderModule} */ ({
		Decoder,
		DecoderBuffer,
		Mesh,
		_malloc(byteLength) {

		},
		_free(ptr) {

		},
		HEAPU8,
		TRIANGULAR_MESH: 1,
	});

	const gltfContext = /** @type {import("../../../../../../src/util/gltf/gltfParsing.js").GltfParsingContext} */ ({
		async getBufferView(bufferViewIndex) {
			return new ArrayBuffer(0);
		},
	});

	/** @type {import("../../../../../../src/util/gltf/gltfParsing.js").GltfPrimitiveParsingContext} */
	const primitiveContext = {
		setIndexBuffer(format, buffer) {},
		setAttributeBuffer(name, buffer) {},
		getIndexAccessorData() {
			return indexAccessorData;
		},
	};

	const setIndexBufferSpy = spy(primitiveContext, "setIndexBuffer");
	const setAttributeBufferSpy = spy(primitiveContext, "setAttributeBuffer");
	stub(decoderModule, "_malloc", returnsNext(mallocReturns));

	return {
		decoderModule,
		gltfContext,
		primitiveContext,
		setIndexBufferSpy,
		setAttributeBufferSpy,
	};
}

Deno.test({
	name: "primitives without draco extension are ignored",
	async fn() {
		const { decoderModule, gltfContext, primitiveContext, setIndexBufferSpy, setAttributeBufferSpy } = createMocks();
		const extension = draco(decoderModule);
		assertExists(extension.handlePrimitive);
		await extension.handlePrimitive({
			attributes: {
				POSITION: 1,
			},
		}, gltfContext, primitiveContext);
		assertSpyCalls(setIndexBufferSpy, 0);
		assertSpyCalls(setAttributeBufferSpy, 0);
	},
});

Deno.test({
	name: "attributes with draco extension are decoded",
	async fn() {
		const attributeBytes = new Array(36).fill(3);
		const { decoderModule, gltfContext, primitiveContext, setIndexBufferSpy, setAttributeBufferSpy } = createMocks({
			mallocReturns: [10],
			getAttributeDataBytes: [attributeBytes],
		});
		const extension = draco(decoderModule);
		assertExists(extension.handlePrimitive);
		/** @type {import("../../../../../../src/mod.js").GltfDracoExtensionPrimitive} */
		const extensionData = {
			attributes: {
				ATTRIBUTE_WITH_DRACO: 0,
			},
			bufferView: 2,
		};
		await extension.handlePrimitive({
			attributes: {
				POSITION: 0,
				ATTRIBUTE_WITH_DRACO: 1,
			},
			extensions: {
				[DRACO_EXTENSION_NAME]: extensionData,
			},
		}, gltfContext, primitiveContext);
		assertSpyCalls(setIndexBufferSpy, 0);
		assertSpyCalls(setAttributeBufferSpy, 1);
		assertEquals(setAttributeBufferSpy.calls[0].args[0], "ATTRIBUTE_WITH_DRACO");
		assertEquals(Array.from(new Uint8Array(setAttributeBufferSpy.calls[0].args[1])), attributeBytes);
	},
});

Deno.test({
	name: "throws an error when decoding fails",
	async fn() {
		const { decoderModule, gltfContext, primitiveContext } = createMocks({
			decodeFails: true,
		});
		const extension = draco(decoderModule);
		/** @type {import("../../../../../../src/mod.js").GltfDracoExtensionPrimitive} */
		const extensionData = {
			attributes: {
				POSITION: 0,
			},
			bufferView: 2,
		};
		await assertRejects(async () => {
			assertExists(extension.handlePrimitive);
			await extension.handlePrimitive({
				attributes: {
					POSITION: 0,
				},
				extensions: {
					[DRACO_EXTENSION_NAME]: extensionData,
				},
			}, gltfContext, primitiveContext);
		}, Error, "Failed to decode draco mesh: test error");
	},
});

Deno.test({
	name: "uint16 index buffer is decoded",
	async fn() {
		const attributeBytes = new Array(36).fill(3);
		const indicesBytes = new Array(6).fill(5);
		const { decoderModule, gltfContext, primitiveContext, setIndexBufferSpy } = createMocks({
			mallocReturns: [10, 30],
			getAttributeDataBytes: [attributeBytes],
			getTrianglesUInt16Bytes: [indicesBytes],
			indexAccessorData: {
				format: Mesh.IndexFormat.UINT_16,
				accessorData: {
					componentType: UNSIGNED_SHORT,
					count: 3,
					type: "SCALAR",
				},
			},
		});
		const extension = draco(decoderModule);
		assertExists(extension.handlePrimitive);
		/** @type {import("../../../../../../src/mod.js").GltfDracoExtensionPrimitive} */
		const extensionData = {
			attributes: {
				POSITION: 0,
			},
			bufferView: 2,
		};
		await extension.handlePrimitive({
			attributes: {
				POSITION: 0,
			},
			extensions: {
				[DRACO_EXTENSION_NAME]: extensionData,
			},
		}, gltfContext, primitiveContext);
		assertSpyCalls(setIndexBufferSpy, 1);
		assertEquals(setIndexBufferSpy.calls[0].args[0], Mesh.IndexFormat.UINT_16);
		assertEquals(Array.from(new Uint8Array(setIndexBufferSpy.calls[0].args[1])), indicesBytes);
	},
});

Deno.test({
	name: "uint32 index buffer is decoded",
	async fn() {
		const attributeBytes = new Array(36).fill(3);
		const indicesBytes = new Array(12).fill(5);
		const { decoderModule, gltfContext, primitiveContext, setIndexBufferSpy } = createMocks({
			mallocReturns: [10, 30],
			getAttributeDataBytes: [attributeBytes],
			getTrianglesUInt32Bytes: [indicesBytes],
			indexAccessorData: {
				format: Mesh.IndexFormat.UINT_32,
				accessorData: {
					componentType: UNSIGNED_INT,
					count: 3,
					type: "SCALAR",
				},
			},
		});
		const extension = draco(decoderModule);
		assertExists(extension.handlePrimitive);
		/** @type {import("../../../../../../src/mod.js").GltfDracoExtensionPrimitive} */
		const extensionData = {
			attributes: {
				POSITION: 0,
			},
			bufferView: 2,
		};
		await extension.handlePrimitive({
			attributes: {
				POSITION: 0,
			},
			extensions: {
				[DRACO_EXTENSION_NAME]: extensionData,
			},
		}, gltfContext, primitiveContext);
		assertSpyCalls(setIndexBufferSpy, 1);
		assertEquals(setIndexBufferSpy.calls[0].args[0], Mesh.IndexFormat.UINT_32);
		assertEquals(Array.from(new Uint8Array(setIndexBufferSpy.calls[0].args[1])), indicesBytes);
	},
});
