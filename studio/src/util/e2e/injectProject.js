import { generateUuid } from "../../../../src/mod.js";
import { IndexedDbStudioFileSystem } from "../fileSystems/IndexedDbStudioFileSystem.js";

/**
 * @deprecated Use `loadE2eProject()` in /test/e2e/studio/shared/project.js instead.
 * @param {string} projectName
 * @param {string[]} filePaths
 */
export async function injectProject(projectName, filePaths) {
	const studio = globalThis.studio;
	if (!studio) throw new Error("Studio instance is not initialized");

	const uuid = generateUuid();
	const fileSystem = new IndexedDbStudioFileSystem(uuid);
	await fileSystem.setRootName(projectName);

	const promises = [];
	for (const filePath of filePaths) {
		promises.push((async () => {
			const path = filePath.split("/");
			const response = await fetch(`/test/e2e/studio/projects/${projectName}/${filePath}`);
			const buffer = await response.arrayBuffer();
			const type = response.headers.get("Content-Type") || "";
			const file = new File([buffer], "filename", { type });
			fileSystem.writeFile(path, file);
		})());
	}

	await Promise.all(promises);

	await studio.projectManager.openProject(fileSystem, {
		fileSystemType: "db",
		projectUuid: uuid,
		name: projectName,
		isWorthSaving: false,
	}, true);

	const projectSelector = globalThis.projectSelector;
	if (!projectSelector) throw new Error("ProjectSelector instance is not initialized");
	projectSelector.setVisibility(false);
}
