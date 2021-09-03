import Mat4 from "../../Math/Mat4.js";
import { StorageType } from "../../Util/BinaryComposer.js";
import RenderOutputConfig from "../../Rendering/RenderOutputConfig.js";
import ClusteredLightsConfig from "../../Rendering/ClusteredLightsConfig.js";

export default {
	uuid: "1a78b3f2-7688-4776-b512-ed1ee2326d8a",
	name: "Camera",
	properties: {
		fov: {
			defaultValue: 70,
			guiOpts: {
				min: 0,
				max: 180,
			},
		},
		clipNear: {
			defaultValue: 0.01,
			guiOpts: {
				min: 0,
			},
		},
		clipFar: {
			defaultValue: 1000,
			guiOpts: {
				min: 0,
			}
		},
		aspect: {
			defaultValue: 1,
			guiOpts: {
				min: 0,
			},
		},
		autoUpdateProjectionMatrix: {
			defaultValue: true,
		},
		projectionMatrix: {
			type: Mat4,
		},
		renderOutputConfig: {
			type: RenderOutputConfig,
		},
		clusteredLightsConfig: {
			type: ClusteredLightsConfig,
		},
		// autoManageRootRenderEntities: {
		// 	type: "bool",
		// 	defaultValue: true,
		// },
		// rootRenderEntities: {
		// 	type: "array",
		// }
	},
	binaryComposerOpts: {
		structure: {
			fov: StorageType.FLOAT64,
			clipNear: StorageType.FLOAT64,
			clipFar: StorageType.FLOAT64,
			aspect: StorageType.FLOAT64,
			renderOutputConfig: StorageType.ASSET_UUID,
			clusteredLightsConfig: StorageType.ASSET_UUID,
		},
		nameIds: {
			fov: 1,
			clipNear: 2,
			clipFar: 3,
			aspect: 4,
			renderOutputConfig: 5,
			clusteredLightsConfig: 6,
		},
	},
};
