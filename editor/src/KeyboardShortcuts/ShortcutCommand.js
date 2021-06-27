export default class ShortcutCommand{
	constructor({
		name = null,
		command = null,
		defaultKeys = null,
		conditions = "",
	}){
		this.name = name;
		this.command = command;
		this.defaultKeys = defaultKeys;
		this.conditions = conditions;
	}

	get configuredKeySequence(){
		return this.defaultKeys;
	}
}
