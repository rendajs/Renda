import { Mesh } from "../../../core/Mesh.js";

/**
 * @typedef DracoDecoderModule
 * @property {Promise<DracoDecoderModule>} ready
 * @property {new () => DracoDecoderBuffer} DecoderBuffer
 * @property {new () => DracoDecoder} Decoder
 * @property {new () => DracoMesh} Mesh
 * @property {0} POINT_CLOUD
 * @property {1} TRIANGULAR_MESH
 * @property {0} DT_INVALID
 * @property {1} DT_INT8
 * @property {2} DT_UINT8
 * @property {3} DT_INT16
 * @property {4} DT_UINT16
 * @property {5} DT_INT32
 * @property {6} DT_UINT32
 * @property {7} DT_INT64
 * @property {8} DT_UINT64
 * @property {9} DT_FLOAT32
 * @property {10} DT_FLOAT64
 * @property {11} DT_BOOL
 * @property {12} DT_TYPES_COUNT
 * @property {(byteLength: number) => number} _malloc
 * @property {(ptr: number) => number} _free
 * @property {Uint8Array} HEAPU8
 */

/**
 * @typedef DracoDecoderBuffer
 * @property {(encodedBytes: Uint8Array, byteLength: number) => void} Init
 */

/**
 * @typedef DracoDecoder
 * @property {(buffer: DracoDecoderBuffer) => number} GetEncodedGeometryType
 * @property {(buffer: DracoDecoderBuffer, outputGeometry: DracoMesh) => DracoStatus} DecodeBufferToMesh
 * @property {(mesh: DracoMesh, attributeType: number) => number} GetAttributeId
 * @property {(mesh: DracoMesh, attributeId: number) => DracoPointAttribute} GetAttribute
 * @property {(mesh: DracoMesh, attribute: DracoPointAttribute, dataType: number, outSize: number, outValuesPtr: number) => boolean} GetAttributeDataArrayForAllPoints
 * @property {(mesh: DracoMesh, outSize: number, outValuesPtr: number) => boolean} GetTrianglesUInt16Array
 * @property {(mesh: DracoMesh, outSize: number, outValuesPtr: number) => boolean} GetTrianglesUInt32Array
 */

/**
 * @typedef DracoStatus
 * @property {() => boolean} ok
 * @property {() => string} error_msg
 */

/**
 * @typedef DracoMesh
 * @property {() => number} num_attributes
 * @property {() => number} num_faces
 * @property {() => number} num_points
 */

/**
 * @typedef DracoPointAttribute
 * @property {() => number} num_components
 * @property {() => number} data_type
 */

/**
 * @typedef GltfDracoExtensionPrimitive
 * @property {number} bufferView
 * @property {Object<string, number>} attributes
 */

export const DRACO_EXTENSION_NAME = "KHR_draco_mesh_compression";

/**
 * @param {DracoDecoderModule} decoderModule
 * @returns {import("../gltfParsing.js").GltfExtension}
 */
export function draco(decoderModule) {
	const decoder = new decoderModule.Decoder();

	return {
		name: DRACO_EXTENSION_NAME,
		async handlePrimitive(primitive, gltfContext, primitiveContext) {
			/* eslint-disable new-cap */
			/* eslint-disable no-underscore-dangle */
			if (!primitive.extensions) return;
			const extensionData = /** @type {GltfDracoExtensionPrimitive | undefined} */ (primitive.extensions[DRACO_EXTENSION_NAME]);
			if (!extensionData) return;

			const bufferView = await gltfContext.getBufferView(extensionData.bufferView);
			const encodedBytes = new Uint8Array(bufferView);

			const buffer = new decoderModule.DecoderBuffer();
			buffer.Init(encodedBytes, encodedBytes.byteLength);

			const geometryType = decoder.GetEncodedGeometryType(buffer);

			if (geometryType != decoderModule.TRIANGULAR_MESH) {
				throw new Error(`Unexpected geometry type for mesh: "${geometryType}".`);
			}

			const mesh = new decoderModule.Mesh();
			const status = decoder.DecodeBufferToMesh(buffer, mesh);
			if (!status.ok()) {
				throw new Error("Failed to decode draco mesh: " + status.error_msg());
			}

			for (const [attributeName, attributeId] of Object.entries(extensionData.attributes)) {
				const attribute = decoder.GetAttribute(mesh, attributeId);

				const numValues = mesh.num_points() * attribute.num_components();
				const bytesPerElement = 4;
				const byteLength = numValues * bytesPerElement;
				const dataType = attribute.data_type();

				const ptr = decoderModule._malloc(byteLength);
				decoder.GetAttributeDataArrayForAllPoints(mesh, attribute, dataType, byteLength, ptr);
				const slice = decoderModule.HEAPU8.buffer.slice(ptr, ptr + byteLength);
				decoderModule._free(ptr);
				primitiveContext.setAttributeBuffer(attributeName, slice);
			}

			// Decode index buffer
			const indexAccessorData = primitiveContext.getIndexAccessorData();
			if (indexAccessorData) {
				const indexFormat = indexAccessorData.format;
				let use16Bit;
				if (indexFormat == Mesh.IndexFormat.UINT_16) {
					use16Bit = true;
				} else if (indexFormat == Mesh.IndexFormat.UINT_32) {
					use16Bit = false;
				} else {
					throw new Error("Unexpected index format: " + indexFormat);
				}

				const indicesCount = mesh.num_faces() * 3;
				const bytesPerIndex = use16Bit ? 2 : 4;
				const indicesByteLength = indicesCount * bytesPerIndex;
				const ptr = decoderModule._malloc(indicesByteLength);
				if (use16Bit) {
					decoder.GetTrianglesUInt16Array(mesh, indicesByteLength, ptr);
				} else {
					decoder.GetTrianglesUInt32Array(mesh, indicesByteLength, ptr);
				}
				const slice = decoderModule.HEAPU8.buffer.slice(ptr, ptr + indicesByteLength);
				decoderModule._free(ptr);

				primitiveContext.setIndexBuffer(indexFormat, slice);
			}
		},
	};
}
