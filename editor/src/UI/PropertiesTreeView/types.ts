import { Vec2, Vec3, Vec4 } from "../../../../src/mod.js";
import { UnionToIntersection } from "../../../../src/util/types.js";
import { ArrayGui, ArrayGuiOptions } from "../ArrayGui.js";
import { BooleanGui, BooleanGuiOptions } from "../BooleanGui.js";
import { Button, ButtonGuiOptions } from "../Button.js";
import { ButtonSelectorGui, ButtonSelectorGuiOptions } from "../ButtonSelectorGui.js";
import { DropDownGui, DropDownGuiOptions, GetDropDownValueTypeForOptions } from "../DropDownGui.js";
import { DroppableGui, DroppableGuiOptions, GetDroppableValueTypeForOptions, GetGuiReturnTypeForOptions } from "../DroppableGui.js";
import { LabelGui, LabelGuiOptions } from "../LabelGui.js";
import { NumericGui, NumericGuiOptions } from "../NumericGui.js";
import { ObjectGui, ObjectGuiOptions } from "../ObjectGui.js";
import { TextGui, TextGuiOptions } from "../TextGui.js";
import { TreeViewEvent } from "../TreeView.js";
import { VectorGui, VectorGuiOptions } from "../VectorGui.js";
import { BeforeValueSetHookData, GuiInterface, PropertiesTreeViewEntry } from "./PropertiesTreeViewEntry.js";

export type GuiOptionsBase = {
	label?: string,
	smallLabel?: boolean,
	disabled?: boolean,
	defaultValue?: any,
}

export type ReplaceUnknown<T, U> = unknown extends T ? U : T;

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
		instance: ObjectGui<any>,
		options: ObjectGuiOptions<any>,
	},
}
export type GuiTypes = keyof GuisMap;

type InverseGuisMapHelperGeneric<T> = T extends GuiTypes ?
	[T, GuisMap[T]] :
	never;
type InverseGuisMap = InverseGuisMapHelperGeneric<GuiTypes>;
export type GuiTypeInstances = InverseGuisMap[1]["instance"];

/**
 * Results in gui type id and guiOpts and returns an instance with the proper generics set.
 *
 * ### Usage
 * ```ts
 * GetGuiInstanceForTypeAndOpts<"droppable", {
 * 	supportedAssetTypes: [Material],
 * }>
 * ```
 * results in
 * ```ts
 * DroppableGui<Material>
 * ```
 */
type GetGuiInstanceForTypeAndOpts<T extends GuiTypes, TOpts> =
	T extends "droppable" ?
		GetGuiReturnTypeForOptions<TOpts> :
		GuisMap[T]["instance"];

/**
 * Takes an options object and results in an instance with the proper generics set.
 *
 * ### Usage
 * ```ts
 * GetGuiInstanceForOpts<{
 * 	type: "droppable",
 * 	guiOpts: {
 * 		supportedAssetTypes: [Material],
 * 	},
 * }>
 * ```
 * results in
 * ```ts
 * DroppableGui<Material>
 * ```
 */
type GetGuiInstanceForOpts<T extends PropertiesTreeViewEntryOptions> = GetGuiInstanceForTypeAndOpts<T["type"], T["guiOpts"]>;

export type GetGuiOptions<T extends GuiTypes, TOpts = any> =
	T extends "droppable" ?
		TOpts extends DroppableGuiOptions<any> ?
			TOpts :
			never :
		NonNullable<GuisMap[T]["options"]>;

export type TreeViewEntryFactoryReturnType<T extends GuiTypes, TOpts> = PropertiesTreeViewEntry<GetGuiInstanceForTypeAndOpts<T, TOpts>>;

// The following types are used for autocompletion while filling in arguments
// for a PropertiesTreeViewEntry.

/**
 * Gets the structure for a specific GuiType and it's guiOpts value.
 *
 * ### Usage
 *
 * ```ts
 * PropertiesTreeViewEntryOptionsGeneric<"droppable", {
 * 	supportedAssetTypes: [Material],
 * }>;
 * ```
 * results in
 * ```ts
 * {
 * 	type: "droppable",
 * 	guiOpts: {
 * 		supportedAssetTypes: [Material],
 * 	},
 * }
 * ```
 * Can also be used to infer the type and guiOpts value. For an example of this
 * see {@linkcode PropertiesTreeViewEntry.of}.
 */
export type PropertiesTreeViewEntryOptionsGeneric<T extends GuiTypes, TOpts = any> = T extends GuiTypes ? {
    type: T;
    guiOpts?: GetGuiOptions<T, TOpts>;
    callbacksContext?: Object | undefined;
} : never;
export type PropertiesTreeViewEntryOptions = PropertiesTreeViewEntryOptionsGeneric<GuiTypes>;

export type PropertiesTreeViewStructure = {
    [x: string]: PropertiesTreeViewEntryOptions;
}

/**
 * Converts a TreeView Structure to the return type when getting the value of
 * a PropertiesTreeView or ObjectGui.
 *
 * ### Usage
 *
 * ```ts
 * StructureToObject<{
 * 	a: {
 * 		type: "droppable",
 * 		guiOpts: {
 * 			supportedAssetTypes: [Material],
 * 		},
 * 	},
 * }, {
 * 	returnLiveAsset: true,
 * }>;
 * ```
 * results in
 * ```ts
 * {
 * 	a: Material,
 * }
 * ```
 */
export type StructureToGetObject<T extends PropertiesTreeViewStructure, TGuiOpts> = {
	[x in keyof T]: GetValueType<GetGuiInstanceForOpts<T[x]>, TGuiOpts>;
}

/**
 * Same as StructureToGetObject but with SetValue GuiOpts.
 */
export type StructureToSetObject<T extends PropertiesTreeViewStructure> = {
	[x in keyof T]: SetValueType<GetGuiInstanceForOpts<T[x]>>;
}

export type PropertiesTreeViewChangeEvent<T extends PropertiesTreeViewStructure> = TreeViewEvent & {
	newValue: StructureToGetObject<T, {}>;
	target: PropertiesTreeViewEntry<T>;
}

type SetValueTypeHelper<T extends GuiInterface> =
	T extends {setValue: (value: infer V, opts: infer O) => any} ?
		unknown extends O ?
			[V, {}] :
			[V, O] :
	T extends {value: infer V} ?
		[V, never] :
	never;

export type SetValueType<T extends GuiInterface> = SetValueTypeHelper<T>[0];
export type SetValueOptionsType<T extends GuiInterface> = SetValueTypeHelper<T>[1] & BaseSetValueOptions;

export type GetValueOptionsType<T extends GuiInterface> =
	T extends {getValue: (opts: infer O) => any} ?
		unknown extends O ?
			never :
			O & BaseGetValueOptions :
		never;

export type GetValueType<T extends GuiInterface, TOpts = any> =
	T extends DropDownGui ?
		GetDropDownValueTypeForOptions<TOpts> :
	T extends DroppableGui<any> ?
		GetDroppableValueTypeForOptions<T, TOpts> :
	T extends {getValue: (...args: any) => infer R} ?
		R :
	T extends {value: infer V} ?
		V :
	never;

/**
 * `"default"` uses the default behaviour of PropertiesTreeViewEntries
 * `"fileStorage"` optimizes for data stored as json in project asset files
 * `"binaryComposer"` optimizes for data passed to BinaryComposer.objectToBinary
 * `"script"` optimizes for how in game scripts are most likely to access the data (e.g. Entity Components).
 */
export type TreeViewStructureOutputPurpose = "default" | "fileStorage" | "binaryComposer" | "script";

type BaseGetValueOptions = {
	purpose?: TreeViewStructureOutputPurpose;
	stripDefaultValues?: boolean;
}

type BaseSetValueOptions = {
	beforeValueSetHook?: (data: BeforeValueSetHookData) => any,
	setOnObject?: any,
	setOnObjectKey?: string,
}

type FlattenAllPossibleOptsHelper<T> = UnionToIntersection<Partial<NonNullable<T>>>

export type AllPossibleGetValueOpts = FlattenAllPossibleOptsHelper<GetValueOptionsType<Exclude<GuiTypeInstances, ObjectGui<any>>>>;
export type AllPossibleSetValueOpts = FlattenAllPossibleOptsHelper<SetValueOptionsType<Exclude<GuiTypeInstances, ObjectGui<any>>>>;

export type GetStructureValuesReturnType<TStructure extends PropertiesTreeViewStructure, TGuiOpts extends AllPossibleGetValueOpts = {}> =
	TGuiOpts["stripDefaultValues"] extends true ?
		StructureToGetObject<TStructure, TGuiOpts> | undefined :
	TGuiOpts["purpose"] extends "fileStorage" ?
		StructureToGetObject<TStructure, TGuiOpts> | undefined :
	StructureToGetObject<TStructure, TGuiOpts>;
