import Component from "./Component.js";
import CameraComponent from "./CameraComponent.js";
import MeshComponent from "./MeshComponent.js";

export {Component, CameraComponent, MeshComponent};
export * from "./ComponentProperties/ComponentProperties.js";

export const autoRegisterComponents = [CameraComponent, MeshComponent];
