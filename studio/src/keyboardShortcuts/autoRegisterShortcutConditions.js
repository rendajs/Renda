const autoRegisterShortcutConditions = /** @type {const} */ ({
	"treeView.focusSelected": {
		type: "boolean",
	},
	"treeView.renaming": {
		type: "boolean",
	},
	"numericGui.hasFocus": {
		type: "boolean",
	},
	"droppableGui.focusSelected": {
		type: "boolean",
	},
	"windowManager.lastClickedContentWindowTypeId": {
		type: "string",
	},
	"windowManager.lastFocusedContentWindowTypeId": {
		type: "string",
	},
});

/**
 * @template {keyof autoRegisterShortcutConditions} T
 * @typedef {(typeof autoRegisterShortcutConditions)[T]["type"] extends infer Type ?
 * 	Type extends "string" ?
 * 		import("./ShortcutCondition.js").ShortcutCondition<string[]> :
 * 	Type extends "boolean" ?
 * 		import("./ShortcutCondition.js").ShortcutCondition<boolean> :
 * 	never :
 * never} GetShortcutConditionType
 */

export {autoRegisterShortcutConditions};
