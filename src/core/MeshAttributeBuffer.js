import {Vec2} from "../math/Vec2.js";
import {Vec3} from "../math/Vec3.js";
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
			throw new Error("Unused attribute buffers must have exactly 1 attribute");
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
	 * @param {number[] | Vec2[] | Vec3[]} dataArray
	 */
	_assertVertexDataType(assertion, attributeSettings, expectedText, dataArray) {
		if (!assertion) {
			let dataType;
			if (dataArray[0] != null && dataArray[0] != undefined) {
				dataType = dataArray[0].constructor.name;
			} else {
				dataType = String(dataArray[0]);
			}
			const expectedSentence = `Expected a ${expectedText} array but received a ${dataType} array.`;
			let extraSentence;
			const attributeName = Mesh.getAttributeNameForType(attributeSettings.attributeType);
			if (this.isUnused) {
				let firstPart;
				let addVertexStatePart;
				if (this.mesh.vertexState == null) {
					firstPart = "The mesh has no vertex state.";
					addVertexStatePart = `add a VertexState with "${attributeName}" attribute`;
				} else {
					firstPart = `The provided VertexState doesn't contain a "${attributeName}" attribute.`;
					addVertexStatePart = `add a "${attributeName}" attribute to the VertexState`;
				}
				extraSentence = `${firstPart} Either set the \`unusedComponentCount\` option of \`setVertexData()\` to ${attributeSettings.componentCount}, ${addVertexStatePart}, or provide a ${expectedText} array.`;
			} else {
				extraSentence = `The VertexState for this attribute has a componentCount of ${attributeSettings.componentCount}. Either set the componentCount of "${attributeName}" in your VertexState to ${attributeSettings.componentCount}, or provide a ${expectedText} array.`;
			}
			throw new TypeError(`${expectedSentence} ${extraSentence}`);
		}
	}

	/**
	 * @param {import("./Mesh.js").AttributeType} attributeType
	 * @param {ArrayBufferLike | number[] | Vec2[] | Vec3[]} data
	 * @suppress {suspiciousCode}
	 */
	setVertexData(attributeType, data) {
		const attributeSettings = this.getAttributeSettings(attributeType);
		if (!attributeSettings) {
			throw new Error("Attribute type not found in vertex state");
		}
		const dataView = this.getDataView();

		// todo: pick function based on attributeSettings.format
		const setFunction = dataView.setFloat32.bind(dataView);
		const valueByteSize = 4;

		if (data instanceof ArrayBuffer) {
			// todo: implement and remove the @suppress for this function
		} else if (ArrayBuffer.isView(data)) {
			data = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
			// todo
		} else if (Array.isArray(data)) {
			if (data.length <= 0) {
				this.buffer = new ArrayBuffer(0);
			} else if (attributeSettings.componentCount == 1) {
				let i = 0;
				this._assertVertexDataType(typeof data[0] == "number", attributeSettings, "a number", data);
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
			}
			// todo: support more vector types
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

		// todo: pick function based on attributeSettings.format
		const getFunction = dataView.getFloat32.bind(dataView);
		const valueByteSize = 4;
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
		}
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
