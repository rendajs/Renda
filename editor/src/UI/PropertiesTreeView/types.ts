import { Vec2, Vec3, Vec4 } from "../../../../src/mod.js";
import { ArrayGui, ArrayGuiOptions } from "../ArrayGui.js";
import { BooleanGui, BooleanGuiOptions } from "../BooleanGui.js";
import { Button, ButtonGuiOptions } from "../Button.js";
import { ButtonSelectorGui, ButtonSelectorGuiOptions } from "../ButtonSelectorGui.js";
import { DropDownGui, DropDownGuiOptions, GetDropDownValueTypeForOptions } from "../DropDownGui.js";
import { DroppableGui, DroppableGuiOptions, GetGuiReturnTypeForOptions } from "../DroppableGui.js";
import { LabelGui, LabelGuiOptions } from "../LabelGui.js";
import { NumericGui, NumericGuiOptions } from "../NumericGui.js";
import { ObjectGui, ObjectGuiOptions } from "../ObjectGui.js";
import { TextGui, TextGuiOptions } from "../TextGui.js";
import { TreeViewEvent } from "../TreeView.js";
import { VectorGui, VectorGuiOptions } from "../VectorGui.js";
import { GuiInterface, PropertiesTreeViewEntry } from "./PropertiesTreeViewEntry.js";

export type GuiOptionsBase = {
	label?: string,
	smallLabel?: boolean,
	disabled?: boolean,
	defaultValue?: any,
}

type GuisMap = {
	vec2: {
		instance: VectorGui<Vec2>,
		options: VectorGuiOptions<Vec2>,
	},
	vec3: {
		instance: VectorGui<Vec3>,
		options: VectorGuiOptions<Vec3>,
	},
	vec4: {
		instance: VectorGui<Vec4>,
		options: VectorGuiOptions<Vec4>,
	},
	string: {
		instance: TextGui,
		options: TextGuiOptions,
	},
	number: {
		instance: NumericGui,
		options: NumericGuiOptions,
	},
	boolean: {
		instance: BooleanGui,
		options: BooleanGuiOptions,
	},
	button: {
		instance: Button,
		options: ButtonGuiOptions,
	},
	buttonSelector: {
		instance: ButtonSelectorGui,
		options: ButtonSelectorGuiOptions,
	},
	label: {
		instance: LabelGui,
		options: LabelGuiOptions,
	},
	dropdown: {
		instance: DropDownGui,
		options: DropDownGuiOptions,
	},
	droppable: {
		instance: DroppableGui<any>,
		options: DroppableGuiOptions<any>,
	},
	array: {
		instance: ArrayGui,
		options: ArrayGuiOptions,
	},
	object: {
		instance: ObjectGui,
		options: ObjectGuiOptions,
	},
}
export type GuiTypes = keyof GuisMap;

type InverseGuisMapHelperGeneric<T> = T extends GuiTypes ?
	[T, GuisMap[T]] :
	never;
type InverseGuisMap = InverseGuisMapHelperGeneric<GuiTypes>;
export type GuiTypeInstances = InverseGuisMap[1]["instance"];

export type GetGuiOptions<T extends GuiTypes, TOpts = any> =
	T extends "droppable" ?
		TOpts extends DroppableGuiOptions<any> ?
			TOpts :
			never :
		NonNullable<GuisMap[T]["options"]>;

export type TreeViewEntryFactoryReturnType<T extends GuiTypes, TOpts> =
	T extends "droppable" ?
		PropertiesTreeViewEntry<GetGuiReturnTypeForOptions<TOpts>> :
		PropertiesTreeViewEntry<GuisMap[T]["instance"]>;

// The following is used for autocompletion while filling in arguments for a
// PropertiesTreeViewEntry.
export type PropertiesTreeViewEntryOptionsGeneric<T extends GuiTypes, TOpts = any> = T extends GuiTypes ? {
    type: T;
    guiOpts?: GetGuiOptions<T, TOpts>;
    callbacksContext?: Object | undefined;
} : never;
export type PropertiesTreeViewEntryOptions = PropertiesTreeViewEntryOptionsGeneric<GuiTypes>;

export type GetGuiInstanceForOpts<T extends PropertiesTreeViewEntryOptions> = GuisMap[T["type"]] extends {getTypeForOpts: infer F} ?
	F :
	never;

export type PropertiesTreeViewStructure = {
    [x: string]: PropertiesTreeViewEntryOptions;
}

type PropertiesTreeViewChangeEventType<T extends GuiTypes> = {
    newValue: any;
    target: PropertiesTreeViewEntry<T>;
}

export type PropertiesTreeViewChangeEvent<T extends GuiTypes> = TreeViewEvent & PropertiesTreeViewChangeEventType<T>

type SetValueTypeHelper<T extends GuiInterface> =
	T extends {setValue: (value: infer V, opts: infer O) => any} ?
		[V, O] :
	T extends {value: infer V} ?
		[V, never] :
	never;

export type SetValueType<T extends GuiInterface> = SetValueTypeHelper<T>[0];
export type SetValueOptionsType<T extends GuiInterface> = SetValueTypeHelper<T>[1];

export type GetValueOptionsType<T extends GuiInterface> =
	T extends {getValue: (opts: infer O) => any} ?
		O :
	never;

export type GetValueType<T extends GuiInterface, TOpts = any> =
	T extends DropDownGui ?
		GetDropDownValueTypeForOptions<TOpts> :
	T extends {getValue: (...args: any) => infer R} ?
		R :
	T extends {value: infer V} ?
		V :
	never;
