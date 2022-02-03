import {CameraComponent} from "./builtIn/CameraComponent.js";
import {LightComponent} from "./builtIn/LightComponent.js";
import {MeshComponent} from "./builtIn/MeshComponent.js";

/** @type {(new (...args: any) => import("./Component.js").Component)[]} */
const builtInComponents = [
	CameraComponent,
	LightComponent,
	MeshComponent,
];

export {builtInComponents};
