//converts "my.file.txt" into {name:"my.file", extension:"txt"}
//and "myfile" into {name:"my.file", extension: null}
export function getNameAndExtension(fileName){
	const dotIndex = fileName.lastIndexOf(".");
	if(dotIndex < 0){
		return {name: fileName, extension: null};
	}
	const name = fileName.substr(0, dotIndex);
	const extension = fileName.substr(dotIndex + 1);
	return {name, extension}
}
