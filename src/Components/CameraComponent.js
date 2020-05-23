import Component from "./Component.js";
import RealTimeRenderer from "../Rendering/Renderers/RealTimeRenderer.js";
import Mat4 from "../Math/Mat4.js";

export default class CameraComponent extends Component{
	constructor(opts){
		super(opts);
		opts = {...{
			autoManageRootRenderEntities: true,
		}, ...opts}
		this.autoManageRootRenderEntities = opts.autoManageRootRenderEntities;

		this.autoUpdateProjectionMatrix = true;
		this._fov = 70;
		this._clipNear = 0.01;
		this._clipFar = 1000;
		this._aspect = 1;
		this.projectionMatrix = null;
		this.updateProjectionMatrix();

		this.rootRenderEntities = [];
		this.renderer = null;
	}

	//todo: destructor

	onAttachedToEntity(){
		this.setRootRenderEntities();
	}

	onParentChanged(){
		this.setRootRenderEntities();
	}

	setRootRenderEntities(){
		if(this.autoManageRootRenderEntities){
			if(this.entity){
				this.rootRenderEntities = [this.entity.getRoot()];
			}else{
				this.rootRenderEntities = [];
			}
		}
	}

	render(){
		this.renderer.render(this);
	}

	get fov(){
		return this._fov;
	}
	set fov(value){
		this._fov = value;
		if(this.autoUpdateProjectionMatrix) this.updateProjectionMatrix();
	}

	get clipNear(){
		return this._clipNear;
	}
	set clipNear(value){
		this._clipNear = value;
		if(this.autoUpdateProjectionMatrix) this.updateProjectionMatrix();
	}

	get clipFar(){
		return this._clipFar;
	}
	set clipFar(value){
		this._clipFar = value;
		if(this.autoUpdateProjectionMatrix) this.updateProjectionMatrix();
	}

	get aspect(){
		return this._aspect;
	}
	set aspect(value){
		this._aspect = value;
		if(this.autoUpdateProjectionMatrix) this.updateProjectionMatrix();
	}

	updateProjectionMatrix(){
		this.projectionMatrix = Mat4.createDynamicAspectProjection(this._fov, this._clipNear, this._clipFar, this._aspect);
	}

	getVpMatrix(){
		return Mat4.multiplyMatrices(this.entity.worldMatrix.inverse(), this.projectionMatrix);
	}
}
