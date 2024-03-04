import { VertexStateBuffer } from "./VertexStateBuffer.js";

/**
 * @typedef VertexStateOptions
 * @property {import("./VertexStateBuffer.js").VertexStateBufferOptions[]} [buffers]
 */

/**
 * @typedef {(attributeType: import("../core/Mesh.js").AttributeType) => number} RequestShaderLocationFn
 */

/**
 * @typedef PreferredShaderLocation
 * @property {import("../core/Mesh.js").AttributeType} attributeType
 * @property {number} location
 */

export class VertexState {
	/**
	 * @param {VertexStateOptions} options
	 */
	constructor({
		buffers = [],
	} = {}) {
		/** @type {VertexStateBuffer[]} */
		this.buffers = [];

		for (const buffer of buffers) {
			this.addBuffer(buffer);
		}
	}

	/**
	 * @param {import("./VertexStateBuffer.js").VertexStateBufferOptions} options
	 */
	addBuffer(options) {
		const buffer = new VertexStateBuffer(options);
		this.buffers.push(buffer);
	}

	/**
	 * @param {object} options
	 * @param {PreferredShaderLocation[]} [options.preferredShaderLocations] If the vertex state
	 * has "auto", null or -1 for an attribute, this will be used to determine the shader location.
	 * If this an attribute with automatic shader location is not present in this list,
	 * a location will be assigned that hasn't been used yet.
	 * If this list contains the same attribute type multiple times, an error will be thrown.
	 * If the list contains a shader location that has already been taken by the vertex state, an error will be thrown.
	 */
	getDescriptor({
		preferredShaderLocations = [],
	} = {}) {
		/** @type {Map<import("../core/Mesh.js").AttributeType, number>} */
		const preferredShaderLocationsMap = new Map();
		for (const { attributeType, location } of preferredShaderLocations) {
			if (preferredShaderLocationsMap.has(attributeType)) {
				throw new Error(`Preferred shader location for attribute type ${attributeType} is mapped to multiple locations.`);
			}
			preferredShaderLocationsMap.set(attributeType, location);
		}

		/** @type {Set<number>} */
		const takenShaderLocations = new Set();
		for (const buffer of this.buffers) {
			for (const attribute of buffer.attributes) {
				const loc = attribute.shaderLocation;
				if (loc != null && loc != "auto" && loc >= 0) {
					takenShaderLocations.add(loc);
				}
			}
		}

		for (const buffer of this.buffers) {
			for (const attribute of buffer.attributes) {
				const loc = preferredShaderLocationsMap.get(attribute.attributeType);
				if (loc !== undefined) {
					if (takenShaderLocations.has(loc)) {
						throw new Error(`Preferred shader location ${loc} is already taken by an attribute in the VertexState.`);
					}
					takenShaderLocations.add(loc);
				}
			}
		}

		let lastAutoShaderLocationIndex = 0;
		/** @type {RequestShaderLocationFn} */
		const requestShaderLocation = attributeType => {
			const preferredLocation = preferredShaderLocationsMap.get(attributeType);
			if (preferredLocation != undefined) {
				return preferredLocation;
			}
			while (takenShaderLocations.has(lastAutoShaderLocationIndex)) {
				lastAutoShaderLocationIndex++;
			}
			takenShaderLocations.add(lastAutoShaderLocationIndex);
			return lastAutoShaderLocationIndex;
		};

		const buffers = this.buffers.map(b => b.getDescriptor(requestShaderLocation));
		return { buffers };
	}
}
