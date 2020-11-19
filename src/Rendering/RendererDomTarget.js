export default class RendererDomTarget{
	constructor(renderer){
		this.renderer = renderer;
	}

	destructor(){}

	getElement(){
		return null;
	}

	resize(w,h){}

	render(camera){
		this.renderer.render(this, camera);
	}
}
