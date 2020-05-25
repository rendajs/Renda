export default class ComponentProperty{
	constructor({
		value,
		onChange = null,
	} = {}){
		this.value = value;
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
