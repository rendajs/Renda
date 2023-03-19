/** @type {import("./ShortcutCommand.js").ShortcutCommandOptions[]} */
const autoRegisterShortcutCommands = [
	{
		command: "history.undo",
		defaultKeys: ["ctrl+z", "z"],
	},
	{
		command: "history.redo",
		defaultKeys: ["ctrl+y", "ctrl+shift+z", "shift+z"],
	},
	{
		command: "treeView.selection.up",
		defaultKeys: "up",
		conditions: "treeView.focusSelected",
	},
	{
		command: "treeView.selection.down",
		defaultKeys: "down",
		conditions: "treeView.focusSelected",
	},
	{
		command: "treeView.expandSelected",
		defaultKeys: "right",
		conditions: "treeView.focusSelected",
	},
	{
		command: "treeView.collapseSelected",
		defaultKeys: "left",
		conditions: "treeView.focusSelected",
	},
	{
		command: "treeView.toggleRename",
		defaultKeys: ["enter", "f2"],
		conditions: "treeView.focusSelected",
		captureInsideTextFields: true,
	},
	{
		command: "treeView.cancelRename",
		defaultKeys: "escape",
		conditions: "treeView.renaming",
		captureInsideTextFields: true,
	},
	{
		command: "numericGui.incrementSelection",
		defaultKeys: "up",
		conditions: "numericGui.hasFocus",
		captureInsideTextFields: true,
	},
	{
		command: "numericGui.decrementSelection",
		defaultKeys: "down",
		conditions: "numericGui.hasFocus",
		captureInsideTextFields: true,
	},
	{
		command: "droppableGui.unlink",
		defaultKeys: ["backspace", "delete"],
		conditions: "droppableGui.focusSelected",
	},
	{
		command: "droppableGui.pasteUuid",
		defaultKeys: ["v"],
		conditions: "droppableGui.focusSelected",
	},
	{
		command: "entityEditor.transform.translate",
		defaultKeys: ["g"],
		holdType: "smart",
	},
	{
		command: "entityEditor.transform.rotate",
		defaultKeys: ["r"],
		holdType: "smart",
	},
];
export {autoRegisterShortcutCommands};
