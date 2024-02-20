import {Vec2} from "../math/Vec2.js";
import {Vec3} from "../math/Vec3.js";
import {Vec4} from "../math/Vec4.js";
import {Mesh} from "./Mesh.js";

/** @typedef {() => void} OnBufferChangedCallback */

/**
 * @typedef MeshAttributeSettings
 * @property {number} offset
 * @property {import("./Mesh.js").AttributeFormat} format
 * @property {number} componentCount
 * @property {import("./Mesh.js").AttributeType} attributeType
 */

export class MeshAttributeBuffer {
	/**
	 * @param {import("./Mesh.js").Mesh} mesh
	 */
	constructor(mesh, {
		arrayStride = /** @type {number?} */ (null),
		attributes = /** @type {MeshAttributeSettings[]} */ ([]),
		isUnused = false,
		arrayBuffer = new ArrayBuffer(0),
	} = {}) {
		this.mesh = mesh;
		if (isUnused && attributes.length != 1) {
			throw new Error("Unused attribute buffers must have exactly 1 attribute.");
		}
		this.arrayStride = null;
		this.attributes = attributes;
		this.isUnused = isUnused;

		this.setArrayStride(arrayStride);

		this.buffer = arrayBuffer;
		/** @type {ArrayBuffer?} */
		this._currentDataViewBuffer = null;
		this._dataView = null;

		/** @type {Set<OnBufferChangedCallback>} */
		this.onBufferChangedCbs = new Set();
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
			this.arrayStride = arrayStride;
		} else {
			this.arrayStride = 0;
			for (const attribute of this.attributes) {
				const neededBytes = attribute.componentCount * Mesh.getByteLengthForAttributeFormat(attribute.format);
				this.arrayStride = Math.max(this.arrayStride, attribute.offset + neededBytes);
			}
		}
	}

	getDataView() {
		if (this._currentDataViewBuffer != this.buffer) {
			this._dataView = null;
		}
		if (!this._dataView) {
			this._dataView = new DataView(this.buffer);
			this._currentDataViewBuffer = this.buffer;
		}
		return this._dataView;
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
		for (const attribute of this.attributes) {
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
		this.buffer = new ArrayBuffer(length);
		if (oldBuffer) {
			new Uint8Array(this.buffer).set(new Uint8Array(oldBuffer));
		}

		this.fireBufferChanged();
	}

	/**
	 * @param {boolean} assertion
	 * @param {MeshAttributeSettings} attributeSettings
	 * @param {string} expectedText
	 * @param {number[] | Vec2[] | Vec3[] | Vec4[]} dataArray
	 */
	_assertVertexDataType(assertion, attributeSettings, expectedText, dataArray) {
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
			if (this.isUnused) {
				if (this.mesh.vertexState == null) {
					vertexStateSentence = "The mesh has no VertexState.";
					fixesList.push(`add a VertexState with "${attributeName}" attribute.`);
				} else {
					vertexStateSentence = `The provided VertexState doesn't contain a "${attributeName}" attribute.`;
					fixesList.push(`add a "${attributeName}" attribute to the VertexState.`);
				}
				fixesList.push(`set the \`unusedComponentCount\` option of \`setVertexData()\` to ${receivedComponentCount}.`);
				fixesList.push(`provide a ${expectedText} array.`);
			} else {
				vertexStateSentence = `The VertexState for this attribute has a componentCount of ${attributeSettings.componentCount}.`;
				fixesList.push(`set the componentCount of "${attributeName}" in your VertexState to ${receivedComponentCount}.`);
				fixesList.push(`provide a ${expectedText} array.`);
			}
			const fixesStr = fixesList.map(str => " - " + str).join("\n");
			throw new TypeError(`Expected a ${expectedText} array but received a ${dataType} array.\n${vertexStateSentence}\nPotential fixes:\n${fixesStr}`);
		}
	}

	/**
	 * @param {import("./Mesh.js").AttributeType} attributeType
	 * @param {ArrayBufferLike | number[] | Vec2[] | Vec3[] | Vec4[]} data
	 */
	setVertexData(attributeType, data) {
		const attributeSettings = this.getAttributeSettings(attributeType);
		if (!attributeSettings) {
			throw new Error("Attribute type not found in vertex state.");
		}
		const dataView = this.getDataView();

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
				this._assertVertexDataType(typeof data[0] == "number", attributeSettings, "number", data);
				const castData = /** @type {number[]} */ (data);
				while (i < castData.length) {
					for (let j = 0; j < attributeSettings.componentCount; j++) {
						setFunction(i * this.arrayStride + attributeSettings.offset + valueByteSize * j, castData[i], true);
					}
					i++;
				}
			} else if (attributeSettings.componentCount == 2) {
				this._assertVertexDataType(data[0] instanceof Vec2, attributeSettings, "Vec2", data);
				const castData = /** @type {Vec2[]} */ (data);
				for (const [i, pos] of castData.entries()) {
					setFunction(i * this.arrayStride + attributeSettings.offset + valueByteSize * 0, pos.x, true);
					setFunction(i * this.arrayStride + attributeSettings.offset + valueByteSize * 1, pos.y, true);
				}
			} else if (attributeSettings.componentCount == 3) {
				this._assertVertexDataType(data[0] instanceof Vec3, attributeSettings, "Vec3", data);
				const castData = /** @type {Vec3[]} */ (data);
				for (const [i, pos] of castData.entries()) {
					setFunction(i * this.arrayStride + attributeSettings.offset + valueByteSize * 0, pos.x, true);
					setFunction(i * this.arrayStride + attributeSettings.offset + valueByteSize * 1, pos.y, true);
					setFunction(i * this.arrayStride + attributeSettings.offset + valueByteSize * 2, pos.z, true);
				}
			} else if (attributeSettings.componentCount == 4) {
				this._assertVertexDataType(data[0] instanceof Vec4, attributeSettings, "Vec4", data);
				const castData = /** @type {Vec4[]} */ (data);
				for (const [i, pos] of castData.entries()) {
					setFunction(i * this.arrayStride + attributeSettings.offset + valueByteSize * 0, pos.x, true);
					setFunction(i * this.arrayStride + attributeSettings.offset + valueByteSize * 1, pos.y, true);
					setFunction(i * this.arrayStride + attributeSettings.offset + valueByteSize * 2, pos.z, true);
					setFunction(i * this.arrayStride + attributeSettings.offset + valueByteSize * 3, pos.w, true);
				}
			}
		}

		this.fireBufferChanged();
	}

	/**
	 * @param {import("./Mesh.js").AttributeType} attributeType
	 */
	*getVertexData(attributeType) {
		const attributeSettings = this.getAttributeSettings(attributeType);
		if (!attributeSettings) return;

		const dataView = this.getDataView();

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
		const newBuffer = new MeshAttributeBuffer(this.mesh, {
			arrayStride: this.arrayStride,
			attributes: structuredClone(this.attributes),
			arrayBuffer: structuredClone(this.buffer),
			isUnused: this.isUnused,
		});
		return newBuffer;
	}

	/**
	 * @param {OnBufferChangedCallback} cb
	 */
	onBufferChanged(cb) {
		this.onBufferChangedCbs.add(cb);
	}

	fireBufferChanged() {
		for (const cb of this.onBufferChangedCbs) {
			cb();
		}
	}
}
