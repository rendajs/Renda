export function getBasicOptions() {
	/** @type {import("../../../../../../src/util/gltf/parseJsonData.js").ParseJsonDataOptions} */
	const options = {
		defaultMaterial: null,
		defaultMaterialMap: null,
		defaultSampler: null,
		hooks: {},
	};
	return options;
}
