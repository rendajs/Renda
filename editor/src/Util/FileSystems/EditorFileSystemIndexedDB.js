import EditorFileSystem from "./EditorFileSystem.js";
import IndexedDbUtil from "../IndexedDbUtil.js";
import md5 from "../../../libs/md5.js";

export default class EditorFileSystemIndexedDB extends EditorFileSystem{
	constructor(name){
		super();

		this.name = name;
		this.db = new IndexedDbUtil("fileSystem_"+this.name, ["objects","system"]);

		//create root directory
		this.rootCreated = false;
		this.onRootCreateCbs = [];
		this.createRoot();
	}

	async createRoot(){
		let currentRootPointer = await this.getRootPointer(false);
		if(!currentRootPointer){
			let rootPointer = await this.createObject({
				isDir: true,
				files: [],
				fileName: "",
			});
			await this.setRootPointer(rootPointer);
		}
		this.rootCreated = true;
		for(const cb of this.onRootCreateCbs){
			cb();
		}
		this.onRootCreateCbs = [];
	}

	async waitForRootCreate(){
		if(this.rootCreated) return;
		await new Promise(r => this.onRootCreateCbs.push(r));
	}

	async getRootPointer(waitForRootCreate = true){
		if(waitForRootCreate) await this.waitForRootCreate();
		return await this.db.get("rootPointer", "system");
	}

	async setRootPointer(value){
		await this.db.set("rootPointer", value, "system");
	}

	async getObject(pointer){
		if(!pointer) throw new Error("pointer not specified");
		return await this.db.get(pointer);
	}

	async getObjectFromPath(path = []){
		let pointer = await this.getRootPointer();
		let obj = await this.getObject(pointer);
		for(const dir of path){
			if(!obj.isDir) throw new Error(dir+" is not a directory");
			let foundAny = false;
			for(const filePointer of obj.files){
				let fileObj = await this.getObject(filePointer);
				if(fileObj.fileName == dir){
					pointer = filePointer;
					obj = fileObj;
					foundAny = true;
					break;
				}
			}
			if(!foundAny){
				throw new Error(dir+" does not exist");
			}
		}
		return {pointer, obj};
	}

	async createObject(obj){
		let textEncoder = new TextEncoder();
		let totalBufferLength = 0;

		let fileNameBuffer = textEncoder.encode(obj.fileName);
		totalBufferLength += fileNameBuffer.byteLength;

		let isDirBit = 0;
		if(obj.isDir){
			isDirBit = 1;
		}else if(obj.isFile){
			isDirBit = 2;
		}
		let isDirBuffer = new Uint8Array([isDirBit]);
		totalBufferLength += isDirBuffer.byteLength;

		let contentBuffer = null;
		if(obj.isDir){
			let contentBuffers = [];
			let contentBufferLength = 0;
			for(const filePointer of obj.files){
				let pointerBuffer = textEncoder.encode(filePointer);
				contentBuffers.push(pointerBuffer);
				contentBufferLength += pointerBuffer.byteLength;
			}
			contentBuffer = new Uint8Array(contentBufferLength);
			let parsedBytes = 0;
			for(const buffer of contentBuffers){
				contentBuffer.set(buffer, parsedBytes);
				parsedBytes += buffer.byteLength;
			}
		}else if(obj.isFile){
			contentBuffer = await obj.file.arrayBuffer();
		}
		totalBufferLength += contentBuffer.byteLength;

		let randBuffer = new Uint8Array(32);
		for(let i=0; i<randBuffer.byteLength; i++){
			randBuffer[i] = Math.round(Math.random()*255);
		}
		totalBufferLength += randBuffer.byteLength;

		let allBuffers = [fileNameBuffer, isDirBuffer, contentBuffer, randBuffer];
		let finalBuffer = new Uint8Array(totalBufferLength);
		let parsedBytes = 0;
		for(const buffer of allBuffers){
			finalBuffer.set(buffer, parsedBytes);
			parsedBytes += buffer.byteLength;
		}
		let pointer = md5(finalBuffer);
		await this.db.set(pointer, obj);
		return pointer;
	}

	async createDir(path = []){
		let travelledData = await this.findDeepestExisting(path);
		let recursionDepth = travelledData.length - 1;
		if(recursionDepth == path.length) return travelledData;
		let createDirs = path.slice(recursionDepth);
		createDirs.reverse();
		let lastCreatedPointer = null;
		let extraTravelledData = [];
		for(const dir of createDirs){
			let createdObject = {
				isDir: true,
				files: [],
				fileName: dir,
			}
			if(lastCreatedPointer){
				createdObject.files.push(lastCreatedPointer);
			}
			lastCreatedPointer = await this.createObject(createdObject);
			extraTravelledData.push({
				obj: createdObject,
				pointer: lastCreatedPointer,
			})
		}
		let lastFoundObject = travelledData[travelledData.length -1].obj;
		lastFoundObject.files.push(lastCreatedPointer);
		await this.updateObjectRecursiveUp(travelledData, lastFoundObject);
		return [...travelledData, ...extraTravelledData];
	}

	async findDeepestExisting(path = []){
		let currentPointer = await this.getRootPointer();
		let currentObj = await this.getObject(currentPointer);
		let travelledData = [{
			obj: currentObj,
			pointer: currentPointer,
		}];
		let i=0;
		for(const dirName of path){
			i++;
			if(currentObj.isFile){
				if(i < path.length){
					throw new Error(dirName+" is a file");
				}
			}else if(currentObj.isDir){
				let foundChild = false;
				for(const filePointer of currentObj.files){
					let childObj = await this.getObject(filePointer);
					if(!childObj) continue;
					if(childObj.fileName == dirName){
						currentObj = childObj;
						currentPointer = filePointer;
						travelledData.push({
							obj: childObj,
							pointer: filePointer,
						});
						foundChild = true;
						break;
					}
				}
				if(!foundChild){
					break;
				}
			}
		}
		return travelledData;
	}

	async updateObjectRecursiveUp(travelledData, newObject){
		for(let i=travelledData.length -1; i>=0; i--){
			let item = travelledData[i];
			let newPointer = await this.updateObject(item.pointer, newObject);
			if(i > 0){
				let parentItem = travelledData[i -1];
				newObject = parentItem.obj;

				//remove old pointer from parent dir
				let oldPointerIndex = newObject.files.indexOf(item.pointer);
				newObject.files.splice(oldPointerIndex, 1);

				//add new pointer to parent dir
				newObject.files.push(newPointer);
			}else{
				await this.setRootPointer(newPointer);
			}
		}
	}

	async updateObject(oldPointer, newObject){
		await this.db.delete(oldPointer);
		return await this.createObject(newObject);
	}

	async readDir(path = []){
		let {obj} = await this.getObjectFromPath(path);
		let files = [];
		let directories = [];
		for(const filePointer of obj.files){
			let fileObj = await this.getObject(filePointer);
			if(fileObj.isDir){
				directories.push(fileObj.fileName);
			}else if(fileObj.isFile){
				files.push(fileObj.fileName);
			}
		}
		return {files, directories};
	}

	async move(fromPath = [], toPath = []){
		let travelledData = await this.findDeepestExisting(fromPath);
		let oldObject = travelledData[travelledData.length -1];
		let parentObjPath = fromPath.slice(0, fromPath.length -1);
		let parentObjTravelledData = travelledData.slice(0, travelledData.length -1);

		let parentObj = await this.getObjectFromPath(parentObjPath);

		//remove old pointer
		let oldPointerIndex = parentObj.obj.files.indexOf(oldObject.pointer);
		parentObj.obj.files.splice(oldPointerIndex, 1);
		await this.updateObjectRecursiveUp(parentObjTravelledData, parentObj.obj);

		//rename
		let oldName = fromPath[fromPath.length -1];
		let newName = toPath[toPath.length -1];
		let newPointer = oldObject.pointer;
		if(oldName != newName){
			oldObject.obj.fileName = newName;
			newPointer = await this.updateObject(oldObject.pointer, oldObject.obj);
		}

		//add new pointer to new parent
		let newParentPath = toPath.slice(0, toPath.length -1);
		let newParentTravelledData = await this.createDir(newParentPath);
		let newParentObj = newParentTravelledData[newParentTravelledData.length -1];
		newParentObj.obj.files.push(newPointer);
		await this.updateObjectRecursiveUp(newParentTravelledData, newParentObj.obj);
	}

	async writeFile(path = [], file = null){
		if(!file) file = new Blob();
		let fileName = path[path.length -1];
		let type = "";
		let lastModified = Date.now();
		if(file instanceof File){
			type = file.type;
			lastModified = file.lastModified;
		}
		file = new File([file], fileName, {type, lastModified});
		let newParentPath = path.slice(0, path.length -1);
		let newParentTravelledData = await this.createDir(newParentPath);
		let newPointer = await this.createObject({
			isFile: true,
			file,
			fileName: path[path.length -1],
		});
		let newParentObj = newParentTravelledData[newParentTravelledData.length -1];
		newParentObj.obj.files.push(newPointer);
		await this.updateObjectRecursiveUp(newParentTravelledData, newParentObj.obj);
	}

	async readFile(path = []){
		let obj = await this.getObjectFromPath(path);
		if(!obj.obj.isFile){
			throw new Error(obj.fileName+" is not a file");
		}
		return obj.obj.file;
	}
}
