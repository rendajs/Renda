import ProjectAssetType from "./ProjectAssetType.js";
import PropertiesAssetContentMesh from "../../PropertiesAssetContent/PropertiesAssetContentMesh.js";
import {Mesh, Vec3, BinaryComposer, BinaryDecomposer} from "../../../../src/index.js";

export default class ProjectAssetTypeMesh extends ProjectAssetType{

	static type = "JJ:mesh";
	static typeUuid = "f202aae6-673a-497d-806d-c2d4752bb146";
	static newFileName = "New Mesh";
	static newFileExtension = "jjmesh";
	static storeInProjectAsJson = false;
	static propertiesAssetContentConstructor = PropertiesAssetContentMesh;

	constructor(){
		super(...arguments);

		this.magicHeader = 0x68734D6A;
	}

	async createNewLiveAssetData(){
		const mesh = new Mesh();
		mesh.setVertexCount(24);
		mesh.setIndexData([0,1,2, 1,2,3,  4,5,6, 5,6,7,  8,9,10, 9,10,11,  12,13,14, 13,14,15,  16,17,18, 17,18,19,  20,21,22, 21,22,23]);
		mesh.setVertexData(Mesh.AttributeType.POSITION, [
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
		], {unusedFormat: Mesh.AttributeFormat.FLOAT32, unusedComponentCount: 3});
		mesh.setVertexData(Mesh.AttributeType.NORMAL, [
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
		], {unusedFormat: Mesh.AttributeFormat.FLOAT32, unusedComponentCount: 3});
		return {liveAsset: mesh};
	}

	static expectedLiveAssetConstructor = Mesh;

	async getLiveAssetData(blob){
		const arrayBuffer = await blob.arrayBuffer();
		const decomposer = new BinaryDecomposer(arrayBuffer);
		if(decomposer.getUint32() != this.magicHeader) return null;
		if(decomposer.getUint16() != 1){
			throw new Error("mesh version is too new");
		}
		const mesh = new Mesh();

		const layoutUuid = decomposer.getUuid();
		const layoutProjectAsset = await editor.projectManager.assetManager.getProjectAsset(layoutUuid);
		if(layoutProjectAsset){
			mesh.setVertexState(await layoutProjectAsset.getLiveAsset());
			this.listenForUsedLiveAssetChanges(layoutProjectAsset);
		}

		const indexFormat = decomposer.getUint8();
		if(indexFormat != Mesh.IndexFormat.NONE){
			let indexBufferLength = decomposer.getUint32();
			if(indexFormat == Mesh.IndexFormat.UINT_16){
				indexBufferLength *= 2;
			}else if(indexFormat == Mesh.IndexFormat.UINT_32){
				indexBufferLength *= 4;
			}
			const indexBuffer = decomposer.getBuffer(indexBufferLength);
			mesh.setIndexData(indexBuffer);
		}

		mesh.setVertexCount(decomposer.getUint32());
		const bufferCount = decomposer.getUint16();
		for(let i=0; i<bufferCount; i++){
			const attributes = [];
			const attributeCount = decomposer.getUint16();
			for(let j=0; j<attributeCount; j++){
				const attributeType = decomposer.getUint16();
				const format = decomposer.getUint8();
				const componentCount = decomposer.getUint8();
				const offset = decomposer.getUint32();
				attributes.push({offset, format, componentCount, attributeType});
			}
			const bufferLength = decomposer.getUint32();
			const buffer = decomposer.getBuffer(bufferLength);
			mesh.setBufferData({
				arrayBuffer: buffer,
				attributes,
			});
		}

		return {liveAsset: mesh};
	}

	async saveLiveAssetData(liveAsset, editorData){
		const composer = new BinaryComposer();
		composer.appendUint32(this.magicHeader); //magic header: jMsh
		composer.appendUint16(1); //version

		let vertexStateUuid = null;
		if(liveAsset.vertexState){
			vertexStateUuid = editor.projectManager.assetManager.getAssetUuidFromLiveAsset(liveAsset.vertexState);
		}
		composer.appendUuid(vertexStateUuid);

		if(!liveAsset.indexBuffer){
			composer.appendUint8(Mesh.IndexFormat.NONE);
		}else{
			composer.appendUint8(liveAsset.indexFormat);
			let vertexCount = liveAsset.indexBuffer.byteLength;
			if(liveAsset.indexFormat == Mesh.IndexFormat.UINT_16){
				vertexCount /= 2;
			}else if(liveAsset.indexFormat == Mesh.IndexFormat.UINT_32){
				vertexCount /= 4;
			}
			composer.appendUint32(vertexCount);
			composer.appendBuffer(liveAsset.indexBuffer);
		}

		composer.appendUint32(liveAsset.vertexCount);
		const buffers = Array.from(liveAsset.getBuffers());
		composer.appendUint16(buffers.length);
		for(const buffer of buffers){
			const attributes = buffer.attributes;
			composer.appendUint16(attributes.length);
			for(const attribute of attributes){
				composer.appendUint16(attribute.attributeType);
				composer.appendUint8(attribute.format);
				composer.appendUint8(attribute.componentCount);
				composer.appendUint32(attribute.offset);
			}
			composer.appendUint32(buffer.buffer.byteLength);
			composer.appendBuffer(buffer.buffer);
		}
		return composer.getFullBuffer();
	}
}
