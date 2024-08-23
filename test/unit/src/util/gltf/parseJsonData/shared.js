export function getBasicOptions() {
	/** @type {import("../../../../../../src/util/gltf/parseJsonData.js").ParseJsonDataOptions} */
	const options = {
		defaultMaterial: null,
		defaultMaterialMap: null,
		defaultSampler: null,
		extensions: [],
		hooks: {},
	};
	return options;
}
