import { StructureToSetObject } from "../../editor/src/ui/propertiesTreeView/types.js";
import { Component } from "./Component.js";

export type ComponentPropertyValues<TComponent extends typeof Component> = TComponent["guiStructure"] extends infer S ?
	Partial<StructureToSetObject<S>> : never;
