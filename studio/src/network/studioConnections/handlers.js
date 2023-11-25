import {createFileSystemHandlers} from "./responseHandlers/fileSystem.js";

/**
 * @param {import("../../util/fileSystems/StudioFileSystem.js").StudioFileSystem} fileSystem
 */
export function createStudioHostHandlers(fileSystem) {
	return createFileSystemHandlers(fileSystem);
}
