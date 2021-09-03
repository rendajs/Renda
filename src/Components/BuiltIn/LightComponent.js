import Vec3 from "../../Math/Vec3.js";
import { StorageType } from "../../Util/BinaryComposer.js";

const lightTypes = ["point","directional","spot"];

export default {
	uuid: "b08e7f42-3919-47e4-ae3e-046e99362090",
	name: "Light",
	properties: {
		lightType: {
			type: lightTypes,
		},
		color: {
			type: Vec3,
		}
	},
	binaryComposerOpts: {
		structure: {
			lightType: lightTypes,
			color: [StorageType.FLOAT64],
		},
		nameIds: {
			lightType: 1,
			color: 2,
		},
	},
};
