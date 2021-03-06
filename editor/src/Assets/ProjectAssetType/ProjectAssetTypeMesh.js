import ProjectAssetType from "./ProjectAssetType.js";
import PropertiesAssetContentMesh from "../../PropertiesAssetContent/PropertiesAssetContentMesh.js";
import {Mesh, Vec3} from "../../../../src/index.js";
import BinaryComposer from "../../../../src/Util/BinaryComposer.js";

export default class ProjectAssetTypeMesh extends ProjectAssetType{

	static type = "JJ:mesh";
	static typeUuid = "f202aae6-673a-497d-806d-c2d4752bb146";
	static newFileName = "New Mesh";
	static newFileExtension = "jjmesh";
	static storeInProjectAsJson = false;
	static propertiesAssetContentConstructor = PropertiesAssetContentMesh;

	constructor(){
		super(...arguments);
	}

	async createNewLiveAssetData(){
		const mesh = new Mesh();
		mesh.setIndexData([0,1,2, 1,2,3,  4,5,6, 5,6,7,  8,9,10, 9,10,11,  12,13,14, 13,14,15,  16,17,18, 17,18,19,  20,21,22, 21,22,23]);
		mesh.setVertexData(Mesh.AttributeTypes.POSITION, [
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
		mesh.setVertexData(Mesh.AttributeTypes.NORMAL, [
			new Vec3(-1, 0, 0),
			new Vec3(-1, 0, 0),
			new Vec3(-1, 0, 0),
			new Vec3(-1, 0, 0),

			new Vec3( 1, 0, 0),
			new Vec3( 1, 0, 0),
			new Vec3( 1, 0, 0),
			new Vec3( 1, 0, 0),

			new Vec3( 0,-1, 0),
			new Vec3( 0,-1, 0),
			new Vec3( 0,-1, 0),
			new Vec3( 0,-1, 0),

			new Vec3( 0, 1, 0),
			new Vec3( 0, 1, 0),
			new Vec3( 0, 1, 0),
			new Vec3( 0, 1, 0),

			new Vec3( 0, 0,-1),
			new Vec3( 0, 0,-1),
			new Vec3( 0, 0,-1),
			new Vec3( 0, 0,-1),

			new Vec3( 0, 0, 1),
			new Vec3( 0, 0, 1),
			new Vec3( 0, 0, 1),
			new Vec3( 0, 0, 1),
		]);
		return {liveAsset: mesh};
	}

	static expectedLiveAssetConstructor = Mesh;

	async getLiveAssetData(blob){
		const arrayBuffer = await blob.arrayBuffer();
		const dataView = new DataView(arrayBuffer);
		if(dataView.getUint32(0, true) != 0x68734D6A) return null;
		const mesh = new Mesh();
		let i=4;
		const layoutUuidBuffer = arrayBuffer.slice(i, i+16);
		i+=16;
		const layoutUuid = BinaryComposer.binaryToUuid(layoutUuidBuffer);
		const layoutProjectAsset = await editor.projectManager.assetManager.getProjectAsset(layoutUuid);
		if(layoutProjectAsset){
			mesh.setVertexState(await layoutProjectAsset.getLiveAsset());
			this.listenForUsedLiveAssetChanges(layoutProjectAsset);
		}

		//todo load asset data

		mesh.setVertexCount(24);
		mesh.setIndexData([0,1,2, 1,2,3,  4,5,6, 5,6,7,  8,9,10, 9,10,11,  12,13,14, 13,14,15,  16,17,18, 17,18,19,  20,21,22, 21,22,23]);
		mesh.setVertexData(Mesh.AttributeTypes.POSITION, [
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
		], {unusedFormat: "float32", unusedComponentCount: 3});
		mesh.setVertexData(Mesh.AttributeTypes.NORMAL, [
			new Vec3(-1, 0, 0),
			new Vec3(-1, 0, 0),
			new Vec3(-1, 0, 0),
			new Vec3(-1, 0, 0),

			new Vec3( 1, 0, 0),
			new Vec3( 1, 0, 0),
			new Vec3( 1, 0, 0),
			new Vec3( 1, 0, 0),

			new Vec3( 0,-1, 0),
			new Vec3( 0,-1, 0),
			new Vec3( 0,-1, 0),
			new Vec3( 0,-1, 0),

			new Vec3( 0, 1, 0),
			new Vec3( 0, 1, 0),
			new Vec3( 0, 1, 0),
			new Vec3( 0, 1, 0),

			new Vec3( 0, 0,-1),
			new Vec3( 0, 0,-1),
			new Vec3( 0, 0,-1),
			new Vec3( 0, 0,-1),

			new Vec3( 0, 0, 1),
			new Vec3( 0, 0, 1),
			new Vec3( 0, 0, 1),
			new Vec3( 0, 0, 1),
		], {unusedFormat: "float32", unusedComponentCount: 3});
		return {liveAsset: mesh};
	}

	async saveLiveAssetData(liveAsset, editorData){
		const composer = new BinaryComposer();
		composer.appendUint32(0x68734D6A); //magic header: jMsh
		let vertexStateUuid = null;
		if(liveAsset.vertexState){
			vertexStateUuid = editor.projectManager.assetManager.getAssetUuidFromLiveAsset(liveAsset.vertexState);
		}
		composer.appendUuid(vertexStateUuid);
		for(const buffer of liveAsset.getBuffers()){
			composer.appendUint16(buffer.attributeType);
			composer.appendUint8(buffer.componentCount);
			composer.appendUint8(buffer.componentType);
			composer.appendUint32(buffer.arrayBuffer.byteLength);
			composer.appendBuffer(buffer.arrayBuffer);
		}
		return composer.getFullBuffer();
	}
}
