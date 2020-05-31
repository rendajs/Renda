export default class ComponentProperty{
	constructor({
		defaultValue = null,
		onChange = null,
	} = {}){
		this.value = defaultValue;
		this.onChange = onChange;
	}

	getValue(){
		return this.value;
	}

	setValue(value){
		this.value = value;
		if(this.onChange) this.onChange(value);
	}
}
