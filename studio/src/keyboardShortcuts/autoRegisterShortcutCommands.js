/**
 * Takes a shortcut config type and returns it as const.
 * This only exists to make autocompletions work.
 * @template {import("./ShortcutCommand.js").ShortcutCommandOptions} T
 * @param {T} preference
 */
function shortcut(preference) {
	return preference;
}

const autoRegisterShortcutCommands = /** @type {const} */ ({
	"history.undo": shortcut({
		defaultKeys: ["ctrl+z", "z"],
	}),
	"history.redo": shortcut({
		defaultKeys: ["ctrl+y", "ctrl+shift+z", "shift+z"],
	}),
	"treeView.selection.up": shortcut({
		defaultKeys: "up",
		conditions: "treeView.focusSelected",
	}),
	"treeView.selection.down": shortcut({
		defaultKeys: "down",
		conditions: "treeView.focusSelected",
	}),
	"treeView.expandSelected": shortcut({
		defaultKeys: "right",
		conditions: "treeView.focusSelected",
	}),
	"treeView.collapseSelected": shortcut({
		defaultKeys: "left",
		conditions: "treeView.focusSelected",
	}),
	"treeView.toggleRename": shortcut({
		defaultKeys: ["enter", "f2"],
		conditions: "treeView.focusSelected",
		captureInsideTextFields: true,
	}),
	"treeView.cancelRename": shortcut({
		defaultKeys: "escape",
		conditions: "treeView.renaming",
		captureInsideTextFields: true,
	}),
	"numericGui.incrementAtCaret": shortcut({
		defaultKeys: "up",
		conditions: "numericGui.hasFocus",
		captureInsideTextFields: true,
	}),
	"numericGui.decrementAtCaret": shortcut({
		defaultKeys: "down",
		conditions: "numericGui.hasFocus",
		captureInsideTextFields: true,
	}),
	"droppableGui.unlink": shortcut({
		defaultKeys: ["backspace", "delete"],
		conditions: "droppableGui.focusSelected",
	}),
	"droppableGui.pasteUuid": shortcut({
		defaultKeys: ["v"],
		conditions: "droppableGui.focusSelected",
	}),
	"entityEditor.transform.translate": shortcut({
		defaultKeys: ["g"],
		holdType: "smart",
	}),
	"entityEditor.transform.rotate": shortcut({
		defaultKeys: ["r"],
		holdType: "smart",
	}),
});

/** @typedef {keyof autoRegisterShortcutCommands} AutoRegisterShortcutCommands */
export {autoRegisterShortcutCommands};
