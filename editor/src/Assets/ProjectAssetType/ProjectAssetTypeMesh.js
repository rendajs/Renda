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

	async createNewLiveAsset(){
		const mesh = new Mesh();
		mesh.setIndexBuffer([0,1,2, 1,2,3,  4,5,6, 5,6,7,  8,9,10, 9,10,11,  12,13,14, 13,14,15,  16,17,18, 17,18,19,  20,21,22, 21,22,23]);
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
		return mesh;
	}

	static expectedLiveAssetConstructor = Mesh;

	async getLiveAsset(blob){
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
		while(i < dataView.byteLength){
			const attributeType = dataView.getUint16(i, true);
			i += 2;
			const componentCount = dataView.getUint8(i, true);
			i++;
			const componentType = dataView.getUint8(i, true);
			i++;
			const length = dataView.getUint32(i, true);
			i += 4;
			const data = dataView.buffer.slice(i, i + length);
			mesh.setVertexData(attributeType, data, {componentCount, componentType});
			i += length;
		}
		return mesh;
	}

	async saveLiveAsset(liveAsset){
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
