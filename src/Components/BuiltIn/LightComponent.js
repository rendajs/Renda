import Vec3 from "../../Math/Vec3.js";
import BinaryComposer from "../../Util/BinaryComposer.js";

export default {
	uuid: "b08e7f42-3919-47e4-ae3e-046e99362090",
	name: "Light",
	properties: {
		lightType: {
			type: ["point","directional","spot"],
		},
		color: {
			type: Vec3,
		}
	},
	binaryComposerOpts: {
		structure: {
			lightType: BinaryComposer.StructureTypes.UINT8,
			color: [BinaryComposer.StructureTypes.FLOAT64],
		},
		nameIds: {
			lightType: 1,
			color: 2,
		},
	},
};
