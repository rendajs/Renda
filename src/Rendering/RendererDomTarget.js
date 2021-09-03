export default class RendererDomTarget{
	constructor(renderer, ...args){
		this.renderer = renderer;
		this.width = 0;
		this.height = 0;
	}

	destructor(){}

	getElement(){
		return null;
	}

	resize(w,h){
		this.width = w;
		this.height = h;
	}

	render(camera){
		this.renderer.render(this, camera);
	}
}
