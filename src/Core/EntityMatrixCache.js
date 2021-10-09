export default class EntityMatrixCache {
	constructor() {
		this.localMatrixDirty = false;
		this.worldMatrixDirty = true;
		this.worldMatrix = null;
		this.localMatrix = null;
	}
}
