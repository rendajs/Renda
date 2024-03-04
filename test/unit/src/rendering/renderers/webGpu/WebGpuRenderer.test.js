import { CustomMaterialData, WebGpuRenderer } from "../../../../../../src/mod.js";
import { WebGpuChunkedBufferGroup } from "../../../../../../src/rendering/renderers/webGpu/bufferHelper/WebGpuChunkedBufferGroup.js";
import { assertIsType, testTypes } from "../../../../shared/typeAssertions.js";

testTypes({
	name: "CustomMaterialData callback arguments have the correct types",
	fn() {
		const engineAssetsManager = /** @type {import("../../../../../../src/mod.js").EngineAssetsManager} */ ({});
		const renderer = new WebGpuRenderer(engineAssetsManager);
		const customData = new CustomMaterialData();
		customData.registerCallback(renderer, group => {
			// Verify that the type is a string and nothing else
			const realGroup = new WebGpuChunkedBufferGroup();
			assertIsType(realGroup, group);

			// @ts-expect-error Verify that the type isn't 'any'
			assertIsType(true, group);
		});
	},
});
