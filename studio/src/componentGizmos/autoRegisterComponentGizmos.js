import { ComponentGizmosCamera } from "./gizmos/ComponentGizmosCamera.js";
import { ComponentGizmosLight } from "./gizmos/ComponentGizmosLight.js";

/** @type {import("./gizmos/ComponentGizmos.js").ComponentGizmosConstructorAny[]} */
const autoRegisterComponentGizmos = [
	ComponentGizmosCamera,
	ComponentGizmosLight,
];

export { autoRegisterComponentGizmos };
