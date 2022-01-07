import { Vec2, Vec3, Vec4 } from "../../../../src/mod.js";
import { ArrayGui, ArrayGuiOptions } from "../ArrayGui.js";
import { BooleanGui, BooleanGuiOptions } from "../BooleanGui.js";
import { Button, ButtonGuiOptions } from "../Button.js";
import { ButtonSelectorGui, ButtonSelectorGuiOptions } from "../ButtonSelectorGui.js";
import { DropDownGui, DropDownGuiOptions } from "../DropDownGui.js";
import { DroppableGui, DroppableGuiOptions } from "../DroppableGui.js";
import { LabelGui, LabelGuiOptions } from "../LabelGui.js";
import { NumericGui, NumericGuiOptions } from "../NumericGui.js";
import { ObjectGui, ObjectGuiOptions } from "../ObjectGui.js";
import { TextGui, TextGuiOptions } from "../TextGui.js";
import { TreeViewEvent } from "../TreeView.js";
import { VectorGuiOptions } from "../VectorGui.js";
import { PropertiesTreeViewEntry } from "./PropertiesTreeViewEntry.js";

export type GuiOptionsBase = {
	label?: string,
	smallLabel?: boolean,
	disabled?: boolean,
	defaultValue?: any,
}

export type PropertiesTreeViewGuiOptionsMap = {
	vec2: VectorGuiOptions<Vec2>,
	vec3: VectorGuiOptions<Vec3>,
	vec4: VectorGuiOptions<Vec4>,
	string: TextGuiOptions,
	number: NumericGuiOptions,
	boolean: BooleanGuiOptions,
	button: ButtonGuiOptions,
	buttonSelector: ButtonSelectorGuiOptions,
	label: LabelGuiOptions,
	dropdown: DropDownGuiOptions,
	droppable: DroppableGuiOptions,
	array: ArrayGuiOptions,
	object: ObjectGuiOptions,
}

type PropertiesTreeViewGuiMap = {
	vec2: Vec2,
	vec3: Vec3,
	vec4: Vec4,
	string: TextGui,
	number: NumericGui,
	boolean: BooleanGui,
	button: Button,
	buttonSelector: ButtonSelectorGui,
	label: LabelGui,
	dropdown: DropDownGui,
	droppable: DroppableGui<unknown>,
	array: ArrayGui,
	object: ObjectGui,
}

export type PropertiesTreeViewEntryType = keyof PropertiesTreeViewGuiOptionsMap;

export type PropertiesTreeViewEntryOptionsGeneric<T> = T extends string | number | symbol ? {
    type: T;
    guiOpts?: any;
    callbacksContext?: Object | undefined;
} : never

export type PropertiesTreeViewEntryOptions = PropertiesTreeViewEntryOptionsGeneric<PropertiesTreeViewEntryType>;

export type PropertiesTreeViewStructure = {
    [x: string]: PropertiesTreeViewEntryOptions;
}

type PropertiesTreeViewChangeEventType<T extends PropertiesTreeViewEntryType> = {
    newValue: any;
    target: PropertiesTreeViewEntry<T>;
}

export type PropertiesTreeViewChangeEvent<T extends PropertiesTreeViewEntryType> = TreeViewEvent & PropertiesTreeViewChangeEventType<T>
