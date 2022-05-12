export class Sampler {
	/**
	 * @param {GPUSamplerDescriptor} [descriptor]
	 */
	constructor(descriptor) {
		/** @type {GPUSamplerDescriptor} */
		this.descriptor = {
			addressModeU: "clamp-to-edge",
			addressModeV: "clamp-to-edge",
			addressModeW: "clamp-to-edge",
			magFilter: "linear",
			minFilter: "linear",
			mipmapFilter: "linear",
			...descriptor,
		};
	}
}
