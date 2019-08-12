import Component from "./Component.js";
import RealTimeRenderer from "../rendering/renderers/RealTimeRenderer.js";

export default class CameraComponent extends Component{
	constructor(opts){
		super(opts);
		opts = {...{
			autoManageRootRenderObjects: true,
		}, ...opts}
		this.autoManageRootRenderObjects = opts.autoManageRootRenderObjects;

		this.rootRenderObjects = [];
		this.renderer = new RealTimeRenderer();
		this.renderer.init();
	}

	onAttachedToObject(){
		this.setRootRenderObjects();
	}

	onParentChanged(){
		this.setRootRenderObjects();
	}

	setRootRenderObjects(){
		if(this.autoManageRootRenderObjects){
			let lastParent = this.attachedObject;
			if(lastParent){
				while(true){
					if(lastParent.parent){
						lastParent = lastParent.parent;
					}else{
						break;
					}
				}
			}
			if(lastParent){
				this.rootRenderObjects = [lastParent];
			}else{
				this.rootRenderObjects = [];
			}
		}
	}

	render(){
		this.renderer.render(this);
	}
}
