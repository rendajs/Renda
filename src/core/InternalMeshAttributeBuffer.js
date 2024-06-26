import { Vec2 } from "../math/Vec2.js";
import { Vec3 } from "../math/Vec3.js";
import { Vec4 } from "../math/Vec4.js";
import { Mesh } from "./Mesh.js";
import { MeshAttributeBuffer } from "./MeshAttributeBuffer.js";

/**
 * @typedef MeshAttributeSettings
 * @property {number} offset
 * @property {import("./Mesh.js").AttributeFormat} format
 * @property {number} componentCount
 * @property {import("./Mesh.js").AttributeType} attributeType
 */

export class InternalMeshAttributeBuffer {
	#arrayStride = 0;
	get arrayStride() {
		return this.#arrayStride;
	}

	/** @type {DataView?} */
	#dataView = null;
	/** @type {ArrayBuffer?} */
	#currentDataViewBuffer = null;
	#buffer;
	get buffer() {
		return this.#buffer;
	}

	/** @type {Set<import("./MeshAttributeBuffer.js").OnBufferChangedCallback>} */
	#onBufferChangedCbs = new Set();

	#isUnused = false;
	get isUnused() {
		return this.#isUnused;
	}

	/** @type {MeshAttributeBuffer} */
	#exposedAttributeBuffer;
	/**
	 * The `MeshAttributeBuffer` instance which is exposed to the user.
	 * We want to make sure some methods such as `setVertexCount` is only called by
	 * the `Mesh` which owns the `InternalMeshAttributeBuffer`.
	 * Otherwise the user could change the count for a single attribute buffer which would break things.
	 * The `MeshAttributeBuffer` class is a shallow representation of the `InternalMeshAttributeBuffer` class
	 * which only exposes some methods.
	 */
	get exposedAttributeBuffer() {
		return this.#exposedAttributeBuffer;
	}

	/**
	 * @param {object} [options]
	 * @param {number?} [options.arrayStride]
	 * @param {MeshAttributeSettings[]} [options.attributeSettings]
	 * @param {boolean} [options.isUnused]
	 * @param {ArrayBuffer} [options.arrayBuffer]
	 */
	constructor({
		arrayStride = null,
		attributeSettings = [],
		isUnused = false,
		arrayBuffer = new ArrayBuffer(0),
	} = {}) {
		if (isUnused && attributeSettings.length != 1) {
			throw new Error("Unused attribute buffers must have exactly 1 attribute.");
		}
		/** @type {MeshAttributeSettings[]} */
		this.attributeSettings = structuredClone(attributeSettings);
		Object.freeze(this.attributeSettings);
		for (const setting of this.attributeSettings) {
			Object.freeze(setting);
		}
		this.#isUnused = isUnused;

		this.#buffer = arrayBuffer;

		this.#exposedAttributeBuffer = new MeshAttributeBuffer(this);

		this.setArrayStride(arrayStride);
	}

	destructor() {
		// todo
	}

	/**
	 * Sets the array stride of the attributes in the buffer.
	 * Set to `null` to infer an array stride from the currently provided attributes.
	 * @param {number?} arrayStride
	 */
	setArrayStride(arrayStride) {
		if (arrayStride != null) {
			this.#arrayStride = arrayStride;
		} else {
			this.#arrayStride = 0;
			for (const attribute of this.attributeSettings) {
				const neededBytes = attribute.componentCount * Mesh.getByteLengthForAttributeFormat(attribute.format);
				this.#arrayStride = Math.max(this.#arrayStride, attribute.offset + neededBytes);
			}
		}
	}

	#getDataView() {
		if (this.#currentDataViewBuffer != this.#buffer) {
			this.#dataView = null;
		}
		if (!this.#dataView) {
			this.#dataView = new DataView(this.#buffer);
			this.#currentDataViewBuffer = this.#buffer;
		}
		return this.#dataView;
	}

	/**
	 * @param {import("./Mesh.js").AttributeType} attributeType
	 */
	hasAttributeType(attributeType) {
		return !!this.getAttributeSettings(attributeType);
	}

	/**
	 * @param {import("./Mesh.js").AttributeType} attributeType
	 * @returns {MeshAttributeSettings?}
	 */
	getAttributeSettings(attributeType) {
		for (const attribute of this.attributeSettings) {
			if (attribute.attributeType == attributeType) {
				return attribute;
			}
		}
		return null;
	}

	/**
	 * @param {number} vertexCount
	 */
	setVertexCount(vertexCount) {
		const length = vertexCount * this.arrayStride;
		const oldBuffer = this.buffer;
		this.#buffer = new ArrayBuffer(length);
		if (oldBuffer) {
			const copyBufferLength = Math.min(oldBuffer.byteLength, this.buffer.byteLength);
			new Uint8Array(this.buffer).set(new Uint8Array(oldBuffer, 0, copyBufferLength));
		}

		this.#fireBufferChanged();
	}

	/**
	 * @param {boolean} assertion
	 * @param {MeshAttributeSettings} attributeSettings
	 * @param {string} expectedText
	 * @param {number[] | Vec2[] | Vec3[] | Vec4[]} dataArray
	 * @param {boolean | undefined} meshHasVertexState
	 */
	#assertVertexDataType(assertion, attributeSettings, expectedText, dataArray, meshHasVertexState) {
		if (!assertion) {
			let dataType;
			const firstArrayItem = dataArray[0];
			let receivedComponentCount = null;
			if (typeof firstArrayItem == "number") {
				receivedComponentCount = 1;
			} else if (firstArrayItem instanceof Vec2) {
				receivedComponentCount = 2;
			} else if (firstArrayItem instanceof Vec3) {
				receivedComponentCount = 3;
			} else if (firstArrayItem instanceof Vec4) {
				receivedComponentCount = 4;
			} else {
				throw new Error("Assertion failed, unexpected array type: " + firstArrayItem);
			}
			if (firstArrayItem != null && firstArrayItem != undefined) {
				dataType = firstArrayItem.constructor.name;
			} else {
				dataType = String(firstArrayItem);
			}
			const fixesList = [];
			let vertexStateSentence;
			const attributeName = Mesh.getAttributeNameForType(attributeSettings.attributeType);
			if (this.#isUnused) {
				if (meshHasVertexState) {
					vertexStateSentence = `The provided VertexState doesn't contain a "${attributeName}" attribute.`;
					fixesList.push(`add a "${attributeName}" attribute to the VertexState.`);
				} else {
					vertexStateSentence = "The mesh has no VertexState.";
					fixesList.push(`add a VertexState with "${attributeName}" attribute.`);
				}
				fixesList.push(`set the \`unusedComponentCount\` option of \`setVertexData()\` to ${receivedComponentCount}.`);
				fixesList.push(`provide a ${expectedText} array.`);
			} else {
				vertexStateSentence = `The VertexState for this attribute has a componentCount of ${attributeSettings.componentCount}.`;
				fixesList.push(`set the componentCount of "${attributeName}" in your VertexState to ${receivedComponentCount}.`);
				fixesList.push(`provide a ${expectedText} array.`);
			}
			const fixesStr = fixesList.map((str) => " - " + str).join("\n");
			throw new TypeError(`Expected a ${expectedText} array but received a ${dataType} array.\n${vertexStateSentence}\nPotential fixes:\n${fixesStr}`);
		}
	}

	/**
	 * @param {import("./Mesh.js").AttributeType} attributeType
	 * @param {ArrayBufferLike | number[] | Vec2[] | Vec3[] | Vec4[]} data
	 * @param {boolean} meshHasVertexState A hint that is used to provide more helpful error messages.
	 * Set to true if the linked mesh contains a vertex state.
	 */
	setVertexData(attributeType, data, meshHasVertexState) {
		const attributeSettings = this.getAttributeSettings(attributeType);
		if (!attributeSettings) {
			throw new Error("Attribute type not found in vertex state.");
		}
		const dataView = this.#getDataView();

		const valueByteSize = Mesh.getByteLengthForAttributeFormat(attributeSettings.format);

		let setFunction;
		switch (attributeSettings.format) {
			case Mesh.AttributeFormat.INT8:
				setFunction = dataView.setInt8.bind(dataView);
				break;
			case Mesh.AttributeFormat.INT16:
				setFunction = dataView.setInt16.bind(dataView);
				break;
			case Mesh.AttributeFormat.INT32:
				setFunction = dataView.setInt32.bind(dataView);
				break;
			case Mesh.AttributeFormat.FLOAT16:
				throw new Error("Float16 is not yet implemented");
			case Mesh.AttributeFormat.FLOAT32:
				setFunction = dataView.setFloat32.bind(dataView);
				break;
			case Mesh.AttributeFormat.NORM8:
				throw new Error("Norm8 is not yet implemented");
			case Mesh.AttributeFormat.NORM16:
				throw new Error("Norm16 is not yet implemented");
			default:
				throw new Error("Unknown format");
		}

		if (data instanceof ArrayBuffer) {
			new Uint8Array(this.buffer).set(new Uint8Array(data));
		} else if (ArrayBuffer.isView(data)) {
			new Uint8Array(this.buffer).set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
		} else if (Array.isArray(data)) {
			if (data.length <= 0) {
				return;
			} else if (attributeSettings.componentCount == 1) {
				let i = 0;
				this.#assertVertexDataType(typeof data[0] == "number", attributeSettings, "number", data, meshHasVertexState);
				const castData = /** @type {number[]} */ (data);
				while (i < castData.length) {
					for (let j = 0; j < attributeSettings.componentCount; j++) {
						setFunction(i * this.arrayStride + attributeSettings.offset + valueByteSize * j, castData[i], true);
					}
					i++;
				}
			} else if (attributeSettings.componentCount == 2) {
				this.#assertVertexDataType(data[0] instanceof Vec2, attributeSettings, "Vec2", data, meshHasVertexState);
				const castData = /** @type {Vec2[]} */ (data);
				for (const [i, pos] of castData.entries()) {
					setFunction(i * this.arrayStride + attributeSettings.offset + valueByteSize * 0, pos.x, true);
					setFunction(i * this.arrayStride + attributeSettings.offset + valueByteSize * 1, pos.y, true);
				}
			} else if (attributeSettings.componentCount == 3) {
				this.#assertVertexDataType(data[0] instanceof Vec3, attributeSettings, "Vec3", data, meshHasVertexState);
				const castData = /** @type {Vec3[]} */ (data);
				for (const [i, pos] of castData.entries()) {
					setFunction(i * this.arrayStride + attributeSettings.offset + valueByteSize * 0, pos.x, true);
					setFunction(i * this.arrayStride + attributeSettings.offset + valueByteSize * 1, pos.y, true);
					setFunction(i * this.arrayStride + attributeSettings.offset + valueByteSize * 2, pos.z, true);
				}
			} else if (attributeSettings.componentCount == 4) {
				this.#assertVertexDataType(data[0] instanceof Vec4, attributeSettings, "Vec4", data, meshHasVertexState);
				const castData = /** @type {Vec4[]} */ (data);
				for (const [i, pos] of castData.entries()) {
					setFunction(i * this.arrayStride + attributeSettings.offset + valueByteSize * 0, pos.x, true);
					setFunction(i * this.arrayStride + attributeSettings.offset + valueByteSize * 1, pos.y, true);
					setFunction(i * this.arrayStride + attributeSettings.offset + valueByteSize * 2, pos.z, true);
					setFunction(i * this.arrayStride + attributeSettings.offset + valueByteSize * 3, pos.w, true);
				}
			}
		}

		this.#fireBufferChanged();
	}

	/**
	 * @param {import("./Mesh.js").AttributeType} attributeType
	 */
	*getVertexData(attributeType) {
		const attributeSettings = this.getAttributeSettings(attributeType);
		if (!attributeSettings) {
			throw new Error("The attribute does not contain the specified attribute type.");
		}

		const dataView = this.#getDataView();

		const valueByteSize = Mesh.getByteLengthForAttributeFormat(attributeSettings.format);

		let getFunction;
		switch (attributeSettings.format) {
			case Mesh.AttributeFormat.INT8:
				getFunction = dataView.getInt8.bind(dataView);
				break;
			case Mesh.AttributeFormat.INT16:
				getFunction = dataView.getInt16.bind(dataView);
				break;
			case Mesh.AttributeFormat.INT32:
				getFunction = dataView.getInt32.bind(dataView);
				break;
			case Mesh.AttributeFormat.FLOAT16:
				throw new Error("Float16 is not yet implemented");
			case Mesh.AttributeFormat.FLOAT32:
				getFunction = dataView.getFloat32.bind(dataView);
				break;
			case Mesh.AttributeFormat.NORM8:
				throw new Error("Norm8 is not yet implemented");
			case Mesh.AttributeFormat.NORM16:
				throw new Error("Norm16 is not yet implemented");
			default:
				throw new Error("Unknown format");
		}

		if (attributeSettings.componentCount == 1) {
			let i = 0;
			while (i <= this.buffer.byteLength - this.arrayStride) {
				yield getFunction(i + attributeSettings.offset, true);
				i += this.arrayStride;
			}
		} else if (attributeSettings.componentCount == 2) {
			let i = 0;
			while (i <= this.buffer.byteLength - this.arrayStride) {
				const x = getFunction(i + attributeSettings.offset + valueByteSize * 0, true);
				const y = getFunction(i + attributeSettings.offset + valueByteSize * 1, true);
				yield new Vec2(x, y);
				i += this.arrayStride;
			}
		} else if (attributeSettings.componentCount == 3) {
			let i = 0;
			while (i <= this.buffer.byteLength - this.arrayStride) {
				const x = getFunction(i + attributeSettings.offset + valueByteSize * 0, true);
				const y = getFunction(i + attributeSettings.offset + valueByteSize * 1, true);
				const z = getFunction(i + attributeSettings.offset + valueByteSize * 2, true);
				yield new Vec3(x, y, z);
				i += this.arrayStride;
			}
		} else if (attributeSettings.componentCount == 4) {
			let i = 0;
			while (i <= this.buffer.byteLength - this.arrayStride) {
				const x = getFunction(i + attributeSettings.offset + valueByteSize * 0, true);
				const y = getFunction(i + attributeSettings.offset + valueByteSize * 1, true);
				const z = getFunction(i + attributeSettings.offset + valueByteSize * 2, true);
				const w = getFunction(i + attributeSettings.offset + valueByteSize * 3, true);
				yield new Vec4(x, y, z, w);
				i += this.arrayStride;
			}
		}
	}

	clone() {
		const newBuffer = new InternalMeshAttributeBuffer({
			arrayStride: this.arrayStride,
			attributeSettings: this.attributeSettings,
			arrayBuffer: structuredClone(this.buffer),
			isUnused: this.#isUnused,
		});
		return newBuffer;
	}

	/**
	 * @param {import("./MeshAttributeBuffer.js").OnBufferChangedCallback} cb
	 */
	onBufferChanged(cb) {
		this.#onBufferChangedCbs.add(cb);
	}

	/**
	 * @param {() => void} cb
	 */
	removeOnBufferChanged(cb) {
		this.#onBufferChangedCbs.delete(cb);
	}

	#fireBufferChanged() {
		for (const cb of this.#onBufferChangedCbs) {
			cb();
		}
	}
}
