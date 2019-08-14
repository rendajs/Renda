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
			if(this.gameObject){
				this.rootRenderObjects = [this.gameObject.getRoot()];
			}else{
				this.rootRenderObjects = [];
			}
		}
	}

	render(){
		this.renderer.render(this);
	}
}
