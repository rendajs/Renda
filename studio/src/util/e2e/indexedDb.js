import {IndexedDbStudioFileSystem} from "../fileSystems/IndexedDbStudioFileSystem.js";

/**
 * @deprecated Use the function in `test/e2e/studio/shared/indexedDb.js` instead.
 *
 * Waits for all operations to finish on the indexedDb of the current project.
 * Once that is done it forcefully closes the db connection.
 *
 * You should only use this right before reloading the page! Otherwise future file operations will fail.
 */
export async function flushProjectIndexedDb() {
	const studio = globalThis.studio;
	if (!studio) throw new Error("Studio instance is not initialized");
	const fs = studio.projectManager.currentProjectFileSystem;
	if (!fs) throw new Error("No project file system is currently available");
	if (!(fs instanceof IndexedDbStudioFileSystem)) {
		throw new Error("The current project file system is not an IndexedDbStudioFileSystem");
	}
	await fs.waitForWritesFinish();
	if (!fs.db) {
		throw new Error("The database has been deleted.");
	}
	await fs.db.closeConnection();
}
