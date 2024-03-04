import { PlaceHolderTextureReference } from "./PlaceHolderTextureReference.js";

/**
 * Contains a generated 1x1 texture of a single color and keeps track of
 * what references are holding this texture, so that it can properly be
 * disposed of once no one is using the texture anymore.
 */
export class PlaceHolderTexture {
	#texture;
	/** @type {Set<PlaceHolderTextureReference>} */
	#references = new Set();
	/** @type {Set<() => void>} */
	#onAllReferencesDestructedCbs = new Set();

	/**
	 * @param {GPUDevice} device
	 * @param {number[]} color
	 */
	constructor(device, color) {
		this.#texture = device.createTexture({
			label: "placeHolderTexture",
			size: [1, 1, 1],
			format: "rgba8unorm",
			usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
		});
		this.view = this.#texture.createView({
			label: "place holder texture view",
		});

		const placeHolderTextureBuffer = new Uint8Array(4);
		for (let i = 0; i < placeHolderTextureBuffer.length; i++) {
			placeHolderTextureBuffer[i] = (color[i] * 255) || 0;
		}
		device.queue.writeTexture({
			texture: this.#texture,
		}, placeHolderTextureBuffer, {
			bytesPerRow: 4,
		}, [1, 1, 1]);
	}

	destructor() {
		this.#texture.destroy();
	}

	getReference() {
		const ref = new PlaceHolderTextureReference();
		this.#references.add(ref);
		ref.onDestructed(() => {
			this.#references.delete(ref);
			if (this.#references.size == 0) {
				this.#onAllReferencesDestructedCbs.forEach((cb) => cb());
			}
		});
		return ref;
	}

	/**
	 * @param {() => void} cb
	 */
	onAllReferencesDestructed(cb) {
		this.#onAllReferencesDestructedCbs.add(cb);
	}
}
