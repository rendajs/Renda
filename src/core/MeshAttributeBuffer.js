import {Vec2} from "../Math/Vec2.js";
import {Vec3} from "../Math/Vec3.js";
import {Mesh} from "./Mesh.js";

export class MeshAttributeBuffer {
	constructor({
		arrayStride = null,
		attributes = [{offset: 0, format: Mesh.AttributeFormat.FLOAT32, componentCount: 1, attributeType: null}],
		isUnused = false,
		arrayBuffer = null,
	} = {}) {
		if (isUnused && attributes.length != 1) {
			throw new Error("Unused attribute buffers must have exactly 1 attribute");
		}
		this.arrayStride = null;
		this.attributes = attributes;
		this.isUnused = isUnused;

		this.setArrayStride(arrayStride);

		this.buffer = arrayBuffer;
		this._currentDataViewBuffer = null;
		this._dataView = null;

		this.onBufferChangedCbs = new Set();
	}

	destructor() {
		// todo
	}

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
		if (this._currentDataViewBuffer != !this.buffer) {
			this._dataView = null;
		}
		if (!this._dataView) {
			this._dataView = new DataView(this.buffer);
			this._currentDataViewBuffer = this.buffer;
		}
		return this._dataView;
	}

	hasAttributeType(attributeType) {
		return !!this.getAttributeSettings(attributeType);
	}

	getAttributeSettings(attributeType) {
		for (const attribute of this.attributes) {
			if (attribute.attributeType == attributeType) {
				return attribute;
			}
		}
		return null;
	}

	setVertexCount(vertexCount) {
		const length = vertexCount * this.arrayStride;
		const oldBuffer = this.buffer;
		this.buffer = new ArrayBuffer(length);
		if (oldBuffer) {
			new Uint8Array(this.buffer).set(oldBuffer);
		}

		this.fireBufferChanged();
	}

	/**
	 * @param {Object} attributeType
	 * @param {Object} data
	 * @suppress {suspiciousCode}
	 */
	setVertexData(attributeType, data) {
		const attributeSettings = this.getAttributeSettings(attributeType);
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
				return;
			} else if (typeof data[0] == "number") {
				let i = 0;
				while (i < data.length) {
					for (let j = 0; j < attributeSettings.componentCount; j++) {
						setFunction(i * this.arrayStride + attributeSettings.offset + valueByteSize * j, data[i], true);
					}
					i++;
				}
			} else if (data[0] instanceof Vec2) {
				if (attributeSettings.componentCount != 2) {
					throw new TypeError("Vec2 array expected");
				}
				for (const [i, pos] of data.entries()) {
					setFunction(i * this.arrayStride + attributeSettings.offset + valueByteSize * 0, pos.x, true);
					setFunction(i * this.arrayStride + attributeSettings.offset + valueByteSize * 1, pos.y, true);
				}
			} else if (data[0] instanceof Vec3) {
				if (attributeSettings.componentCount != 3) {
					throw new TypeError("Vec3 array expected");
				}
				for (const [i, pos] of data.entries()) {
					setFunction(i * this.arrayStride + attributeSettings.offset + valueByteSize * 0, pos.x, true);
					setFunction(i * this.arrayStride + attributeSettings.offset + valueByteSize * 1, pos.y, true);
					setFunction(i * this.arrayStride + attributeSettings.offset + valueByteSize * 2, pos.z, true);
				}
			}
			// todo: support more vector types
		} else {
			throw new TypeError("invalid data type");
		}

		this.fireBufferChanged();
	}

	*getVertexData(attributeType) {
		const attributeSettings = this.getAttributeSettings(attributeType);
		if (!attributeSettings) return;

		const dataView = this.getDataView();

		// todo: pick function based on attributeSettings.format
		const getFunction = dataView.getFloat32.bind(dataView);
		const valueByteSize = 4;
		// todo, add cases for different component counts
		if (attributeSettings.componentCount == 3) {
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

	onBufferChanged(cb) {
		this.onBufferChangedCbs.add(cb);
	}

	fireBufferChanged() {
		for (const cb of this.onBufferChangedCbs) {
			cb();
		}
	}
}
