// import {MaterialMapTypeWebGlRenderer} from "./MaterialMapTypeWebGlRenderer.js";
import {MaterialMapTypeWebGpuRenderer} from "./MaterialMapTypeWebGpuRenderer.js";

const autoRegisterMaterialMapTypes = [
	// MaterialMapTypeWebGlRenderer,
	MaterialMapTypeWebGpuRenderer,
];

export {autoRegisterMaterialMapTypes};
