export default class ShortcutCommand{
	constructor({
		name = null,
		command = null,
		defaultKeys = null,
		conditions = "",

		//single - only fire command once
		//hold - activate when the key is down, and deactivate when it is up
		//toggle - activate when the key is down, and deactivate when it is down a second time
		//smart - same as "hold" but uses "toggle" when the key is pressed only briefly
		holdType = "single",
	}){
		this.name = name;
		this.command = command;
		this.defaultKeys = defaultKeys;
		this.conditions = conditions;
		this.holdType = holdType;

		this.holdStateActive = false;
		this.holdStateActiveStartTime = -Infinity;
		this.parsedSequence = null;
		this.parseSequence();
	}

	parseSequence(){
		this.parsedSequence = this.defaultKeys.split(" ").map(bit => bit.split("+"));
	}

	testAllowSmartHoldDeactivate(){
		if(this.holdType != "smart") return true;

		if(performance.now() - this.holdStateActiveStartTime < 500) return false;

		return true;
	}

	setHoldStateActive(active){
		if(this.holdType == "single") return false;
		if(this.holdStateActive == active) return false;

		this.holdStateActive = active;
		if(active){
			this.holdStateActiveStartTime = performance.now();
		}
		return true;
	}
}
