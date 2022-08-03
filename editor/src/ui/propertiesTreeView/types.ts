import { Vec2, Vec3, Vec4 } from "../../../../src/mod.js";
import { UnionToIntersection } from "../../../../src/util/types.js";
import { ArrayGui, ArrayGuiOptions, GetArrayGuiForOptions, GetArrayGuiValueTypeForOptions } from "../ArrayGui.js";
import { BooleanGui, BooleanGuiOptions } from "../BooleanGui.js";
import { Button, ButtonGuiOptions } from "../Button.js";
import { ButtonSelectorGui, ButtonSelectorGuiOptions } from "../ButtonSelectorGui.js";
import { DropDownGui, DropDownGuiOptions, GetDropDownValueTypeForOptions } from "../DropDownGui.js";
import { DroppableGui, DroppableGuiOptions, GetDroppableValueTypeForOptions, GetGuiReturnTypeForOptions } from "../DroppableGui.js";
import { LabelGui, LabelGuiOptions } from "../LabelGui.js";
import { GetNumericGuiValueTypeForOptions, NumericGui, NumericGuiGetValueReturn, NumericGuiOptions } from "../NumericGui.js";
import { GetObjectGuiForOptions, GetObjectValueTypeForOptions, ObjectGui, ObjectGuiOptions } from "../ObjectGui.js";
import { TextGui, TextGuiOptions } from "../TextGui.js";
import { TreeViewEvent } from "../TreeView.js";
import { GetVectorValueTypeForOptions, VectorGui, VectorGuiOptions } from "../VectorGui.js";
import { BeforeValueSetHookData, GuiInterface, PropertiesTreeViewEntry } from "./PropertiesTreeViewEntry.js";
import type { objectToBinary } from "../../../../src/util/binarySerialization.js";

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
		instance: ArrayGui<any>,
		options: ArrayGuiOptions<any>,
	},
	object: {
		instance: ObjectGui<any>,
		options: ObjectGuiOptions<any>,
	},
}

type NonCircularInstances = VectorGui<Vec2> | VectorGui<Vec3> | VectorGui<Vec4> | TextGui | NumericGui | BooleanGui | Button | ButtonSelectorGui | LabelGui | DropDownGui | DroppableGui<any>

export type GuiTypes = keyof GuisMap;

type InverseGuisMapHelperGeneric<T> = T extends GuiTypes ?
	[T, GuisMap[T]] :
	never;
type InverseGuisMap = InverseGuisMapHelperGeneric<GuiTypes>;
export type GuiTypeInstances = InverseGuisMap[1]["instance"];
export type GuiTypeOptions = InverseGuisMap[1]["options"];

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
	T extends "object" ?
		GetObjectGuiForOptions<TOpts> :
	T extends "array" ?
		GetArrayGuiForOptions<TOpts> :
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

// If your gui options get lost and converted to plain types,
// (such as "number" | "vec3" | "string" getting converted to plain `string`)
// when entering the options in a structure (such as `PropertiesTreeView.addItem`
// and `PropertiesTreeViewEntry.of`) you'll need to implement your logic here.
export type GetGuiOptions<T extends GuiTypes, TOpts = any> =
	T extends "droppable" ?
		TOpts extends DroppableGuiOptions<any> ?
			DroppableGuiOptions<any> :
			never :
	T extends "object" ?
		TOpts extends ObjectGuiOptions<PropertiesTreeViewStructure> ?
			ObjectGuiOptions<PropertiesTreeViewStructure> :
			never :
	T extends "array" ?
		TOpts extends ArrayGuiOptions<GuiTypes> ?
			ArrayGuiOptions<GuiTypes> :
			never :
	NonNullable<GuisMap[T]["options"]>;

export type TreeViewEntryFactoryReturnType<T extends PropertiesTreeViewEntryOptions> = PropertiesTreeViewEntry<GetGuiInstanceForOpts<T>>;

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
 * I don't know why, but TypeScript complaints if `StructureToGetObject` and
 * `StructureToSetObject` extend `PropertiesTreeViewStructure` for their first
 * generic argument. Using this instead seems to fix it somehow without breaking
 * anything else.
 */
type StringKeyMap = {
	[x: string]: any;
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
type StructureToGetObject<T extends StringKeyMap, TGuiOpts> = {
	[x in keyof T]: GetValueType<GetGuiInstanceForOpts<T[x]>, TGuiOpts>;
}

/**
 * Same as StructureToGetObject but with SetValue GuiOpts.
 */
export type StructureToSetObject<T extends StringKeyMap> = {
	[x in keyof T]: SetValueType<GetGuiInstanceForOpts<T[x]>>;
}

export type PropertiesTreeViewChangeEvent<T extends PropertiesTreeViewStructure> = TreeViewEvent & {
	newValue: StructureToGetObject<T, {}>;
	target: PropertiesTreeViewEntry<any>;
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
			{} :
			O & BaseGetValueOptions :
		{};

// When remapping object types to gui values it seems like TypeScript has
// already taken care of infinite recursion for us. But this doesn't seem to be
// the case for arrays. So we'll manually handle this by passing a recursion
// counter as generic argument. We'll decrement this counter for every step
// where an ArrayGui makes use of `GetValueType`. And once it reaches 0 we'll
// return never.
// I'm not sure if it is possible to have infinite recursion for arrays,
// but this limit of 9 will work for now.
type Prev = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
export type RecursionLimitNumbers = Prev[number];
export type DefaultRecursionLimit = 9;

// If you want to return a specific type based on what options were used,
// You'll need to add a type with custom logic here.
//
// T is the gui type, if your gui type has a generic, these might be set here
// so you can use them. For instance, DroppableGui<Material>. So you can infer
// Material from the instance and use it. Though if you want this to work
// you'll need to add your gui to `GetGuiInstanceForTypeAndOpts`.
//
// TOpts is the raw options object that was passed in.
// For instance {returnLiveAsset: true, purpose: "default"}, or {} if no
// options were passed in. Use this to return a specific type based on the
// options.
export type GetValueType<T extends GuiInterface, TOpts = any, TRecursionLimit extends RecursionLimitNumbers = DefaultRecursionLimit> =
	T extends VectorGui<infer TVectorType> ?
		GetVectorValueTypeForOptions<TVectorType, TOpts> :
	T extends NumericGui ?
		GetNumericGuiValueTypeForOptions<TOpts> :
	T extends DropDownGui ?
		GetDropDownValueTypeForOptions<TOpts> :
	T extends DroppableGui<any> ?
		GetDroppableValueTypeForOptions<T, TOpts> :
	T extends ObjectGui<any> ?
		GetObjectValueTypeForOptions<T, TOpts> :
	T extends ArrayGui<any, Prev[TRecursionLimit]> ?
		[TRecursionLimit] extends [never] ?
			never :
			GetArrayGuiValueTypeForOptions<T, TOpts, TRecursionLimit> :
	T extends {getValue: (...args: any) => infer R} ?
		R :
	T extends {value: infer V} ?
		V :
	never;

/**
 * - `"default"` uses the default behaviour of PropertiesTreeViewEntries
 * - `"fileStorage"` optimizes for data stored as json in project asset files
 * - `"binarySerialization"` optimizes for data passed to {@linkcode objectToBinary}
 * - `"script"` optimizes for how in game scripts are most likely to access the data (e.g. Entity Components).
 */
export type TreeViewStructureOutputPurpose = "default" | "fileStorage" | "binarySerialization" | "script";

export type BaseGetValueOptions = {
	purpose?: TreeViewStructureOutputPurpose;
	stripDefaultValues?: boolean;
}

export type BaseSetValueOptions = {
	beforeValueSetHook?: (data: BeforeValueSetHookData) => any,
	setOnObject?: any,
	setOnObjectKey?: string | number,
}

type FlattenAllPossibleOptsHelper<T> = UnionToIntersection<Partial<NonNullable<T>>>

export type AllPossibleGetValueOpts = FlattenAllPossibleOptsHelper<GetValueOptionsType<NonCircularInstances>>;
export type AllPossibleSetValueOpts = FlattenAllPossibleOptsHelper<SetValueOptionsType<NonCircularInstances>>;

export type GetStructureValuesReturnType<TStructure extends PropertiesTreeViewStructure, TGuiOpts extends AllPossibleGetValueOpts = {}> =
	TGuiOpts["stripDefaultValues"] extends true ?
		StructureToGetObject<TStructure, TGuiOpts> | undefined :
	TGuiOpts["purpose"] extends "fileStorage" ?
		StructureToGetObject<TStructure, TGuiOpts> | undefined :
	StructureToGetObject<TStructure, TGuiOpts>;

export type GetSerializableStructureEntryReturn<TStructure extends PropertiesTreeViewStructure, TKey extends keyof TStructure> =
	PropertiesTreeViewEntry<GetGuiInstanceForOpts<TStructure[TKey]>>

type GetGuiInstanceForArrayGuiOptions<T extends ArrayGuiOptions<any>> =
	GetGuiInstanceForTypeAndOpts<T["arrayType"], T["arrayGuiOpts"]>;

export type ArrayStructureToSetObject<TArrayGuiOpts extends ArrayGuiOptions<any>> =
	SetValueType<GetGuiInstanceForArrayGuiOptions<TArrayGuiOpts>>[];

export type GetArrayStructureValuesReturnType<TArrayGuiOpts extends ArrayGuiOptions<any>, TGuiOpts extends AllPossibleGetValueOpts = {}, TRecursionLimit extends RecursionLimitNumbers = DefaultRecursionLimit> =
	GetValueType<GetGuiInstanceForArrayGuiOptions<TArrayGuiOpts>, TGuiOpts, TRecursionLimit>[];

export type GetArrayValueItemType<TArrayGuiOpts extends ArrayGuiOptions<any>> =
	PropertiesTreeViewEntry<GetGuiInstanceForArrayGuiOptions<TArrayGuiOpts>>;
