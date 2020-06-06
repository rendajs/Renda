export default class ComponentProperty{
	constructor({
		defaultValue = null,
		onChange = null,
	} = {}){
		this.value = defaultValue;
		this.onChange = onChange;
	}

	//inherited classes should override this and return the type to
	//be used by GuiTreeViewEntry.js in the editor
	static getTypeStr(){
		return "";
	}

	getValue(){
		return this.value;
	}

	setValue(value){
		this.value = value;
		if(this.onChange) this.onChange(value);
	}
}
