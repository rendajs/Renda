import DefaultComponentTypes from "../DefaultComponentTypes.js";

import CameraComponent from "./CameraComponent.js";
import MeshComponent from "./MeshComponent.js";
import LightComponent from "./LightComponent.js";

const components = new Map();
components.set(DefaultComponentTypes.camera, CameraComponent);
components.set(DefaultComponentTypes.mesh, MeshComponent);
components.set(DefaultComponentTypes.light, LightComponent);

export default components;
