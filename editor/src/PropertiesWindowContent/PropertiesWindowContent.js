export default class PropertiesWindowContent{
	constructor(){

	}

	destructor(){

	}

	//override this with a array of types that this window content should be used for
	static get useForTypes(){
		return null;
	}
}
