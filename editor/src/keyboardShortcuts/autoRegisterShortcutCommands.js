/** @type {import("./ShortcutCommand.js").ShortcutCommandOptions[]} */
const autoRegisterShortcutCommands = [
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
	},
	{
		command: "treeView.cancelRename",
		defaultKeys: "escape",
		conditions: "treeView.renaming",
	},
];
export {autoRegisterShortcutCommands};
