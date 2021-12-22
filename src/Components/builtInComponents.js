import {CameraComponent} from "./BuiltIn/CameraComponent.js";
import {LightComponent} from "./BuiltIn/LightComponent.js";
import {MeshComponent} from "./BuiltIn/MeshComponent.js";

/** @type {typeof import("./Component.js").Component[]} */
const builtInComponents = [
	CameraComponent,
	LightComponent,
	MeshComponent,
];

export {builtInComponents};
