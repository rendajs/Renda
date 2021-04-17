import Vec3 from "../../Math/Vec3.js";

export default {
	properties: {
		lightType: {
			type: ["point","directional","spot"],
		},
		color: {
			type: Vec3,
		}
	},
};
