import DefaultComponentTypes from "../DefaultComponentTypes.js";

import CameraComponent from "./CameraComponent.js";
import MeshComponent from "./MeshComponent.js";

const components = new Map();
components.set(DefaultComponentTypes.camera, CameraComponent);
components.set(DefaultComponentTypes.mesh, MeshComponent);

export default components;
