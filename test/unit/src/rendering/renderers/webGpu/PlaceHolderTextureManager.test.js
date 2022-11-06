import {assertEquals, assertStrictEquals} from "std/testing/asserts.ts";
import {assertSpyCalls, spy} from "std/testing/mock.ts";
import {PlaceHolderTextureManager} from "../../../../../../src/rendering/renderers/webGpu/PlaceHolderTextureManager.js";

function createMockRenderer() {
	/** @type {GPUTexture[]} */
	const createdTextures = [];
	const gpuDevice = /** @type {GPUDevice} */ ({
		createTexture(descriptor) {
			const texture = /** @type {GPUTexture} */ ({
				createView() {
					return /** @type {GPUTextureView} */ ({});
				},
				destroy() {},
			});
			createdTextures.push(texture);
			return texture;
		},
		queue: {
			writeTexture(destination, data, dataLayout, size) {

			},
		},
	});
	const renderer = /** @type {import("../../../../../../src/mod.js").WebGpuRenderer} */ ({
		device: gpuDevice,
	});

	const createTextureSpy = spy(gpuDevice, "createTexture");

	const oldTextureUsage = globalThis.GPUTextureUsage;
	globalThis.GPUTextureUsage = /** @type {typeof GPUTextureUsage} */ ({
	});

	return {
		renderer,
		createTextureSpy,
		createdTextures,
		uninstall() {
			globalThis.GPUTextureUsage = oldTextureUsage;
		},
	};
}

Deno.test({
	name: "Creating the same texture twice returns the same instance",
	fn() {
		const {renderer, createTextureSpy, uninstall} = createMockRenderer();

		try {
			const manager = new PlaceHolderTextureManager(renderer);

			const texture1 = manager.getTexture([0.5, 0.7, 0.9]);
			const texture2 = manager.getTexture([0.5, 0.7, 0.9]);
			assertStrictEquals(texture1, texture2);

			assertSpyCalls(createTextureSpy, 1);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "Creating a texture and destructing it",
	fn() {
		const {renderer, createTextureSpy, createdTextures, uninstall} = createMockRenderer();

		try {
			const manager = new PlaceHolderTextureManager(renderer);

			const texture = manager.getTexture([0.5, 0.7, 0.9]);
			const ref1 = texture.getReference();
			const ref2 = texture.getReference();
			assertSpyCalls(createTextureSpy, 1);
			assertEquals(createdTextures.length, 1);
			const gpuTexture = createdTextures[0];
			const destroySpy = spy(gpuTexture, "destroy");
			assertSpyCalls(destroySpy, 0);

			ref1.destructor();
			assertSpyCalls(destroySpy, 0);

			ref2.destructor();
			assertSpyCalls(destroySpy, 1);
		} finally {
			uninstall();
		}
	},
});
