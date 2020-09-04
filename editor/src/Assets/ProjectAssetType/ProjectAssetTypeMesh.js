import ProjectAssetType from "./ProjectAssetType.js";
import {Mesh, Vec3} from "../../../../src/index.js";

export default class ProjectAssetTypeMesh extends ProjectAssetType{

	static type = "mesh";
	static newFileName = "New Mesh";
	static newFileExtension = "jjmesh";
	static storeInProjectAsJson = false;

	constructor(){
		super(...arguments);
	}

	static createNewFile(){
		const cubeMesh = new Mesh();
		cubeMesh.setBuffer(Mesh.AttributeTypes.INDEX, [0,1,2, 1,2,3,  4,5,6, 5,6,7,  8,9,10, 9,10,11,  12,13,14, 13,14,15,  16,17,18, 17,18,19,  20,21,22, 21,22,23]);
		cubeMesh.setBuffer(Mesh.AttributeTypes.POSITION, [
			new Vec3(-1,-1,-1),
			new Vec3(-1,-1, 1),
			new Vec3(-1, 1,-1),
			new Vec3(-1, 1, 1),

			new Vec3( 1,-1,-1),
			new Vec3( 1,-1, 1),
			new Vec3( 1, 1,-1),
			new Vec3( 1, 1, 1),

			new Vec3(-1,-1,-1),
			new Vec3(-1,-1, 1),
			new Vec3( 1,-1,-1),
			new Vec3( 1,-1, 1),

			new Vec3(-1, 1,-1),
			new Vec3(-1, 1, 1),
			new Vec3( 1, 1,-1),
			new Vec3( 1, 1, 1),

			new Vec3(-1,-1,-1),
			new Vec3(-1, 1,-1),
			new Vec3( 1,-1,-1),
			new Vec3( 1, 1,-1),

			new Vec3(-1,-1, 1),
			new Vec3(-1, 1, 1),
			new Vec3( 1,-1, 1),
			new Vec3( 1, 1, 1),
		]);
		const blob = cubeMesh.toBlob();
		const file = new File([blob], "mesh.jjmesh");
		return file;
	}

	async getLiveAsset(blob){
		return Mesh.fromBlob(blob);
	}
}
