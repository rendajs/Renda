import {Mat4} from "../../index.js";

export default {
	properties: {
		fov: {
			defaultValue: 70,
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
		},
		autoUpdateProjectionMatrix: {
			defaultValue: true,
		},
		projectionMatrix: {
			type: Mat4,
		},
		// autoManageRootRenderEntities: {
		// 	type: "bool",
		// 	defaultValue: true,
		// },
		// rootRenderEntities: {
		// 	type: "array",
		// }
	},
};
