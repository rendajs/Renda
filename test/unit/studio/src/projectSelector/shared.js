import {Importer} from "fake-imports";
import {installFakeDocument, uninstallFakeDocument} from "fake-dom/FakeDocument.js";
import {stub} from "std/testing/mock.ts";

const importer = new Importer(import.meta.url);
importer.redirectModule("../../../../../src/util/IndexedDbUtil.js", "../../shared/FakeIndexedDbUtil.js");

/** @type {import("../../../../../studio/src/projectSelector/ProjectSelector.js")} */
const ProjectSelectorMod = await importer.import("../../../../../studio/src/projectSelector/ProjectSelector.js");
const {ProjectSelector} = ProjectSelectorMod;

const {forcePendingOperations: forcePendingOperationsImported} = await importer.import("../../../../../src/util/IndexedDbUtil.js");
const forcePendingOperations = /** @type {typeof import("../../shared/FakeIndexedDbUtil.js").forcePendingOperations} */ (forcePendingOperationsImported);

export {forcePendingOperations, ProjectSelector};

export function basicSetup() {
	installFakeDocument();
	globalThis.indexedDB = /** @type {any} */ ({});
	const databasesStub = stub(globalThis.indexedDB, "databases", async () => {
		return [];
	});

	const projectSelector = new ProjectSelector();

	const mockStudio = /** @type {import("../../../../../studio/src/Studio.js").Studio} */ ({
		projectManager: {
			onProjectOpenEntryChange(cb) {},
		},
	});

	const openNewDbProjectSpy = stub(mockStudio.projectManager, "openNewDbProject", async fromUserGesture => {});
	const openProjectFromLocalDirectorySpy = stub(mockStudio.projectManager, "openProjectFromLocalDirectory", async () => {});

	const newProjectButton = projectSelector.actionsListEl.children[0];
	const openProjectButton = projectSelector.actionsListEl.children[1];

	function triggerStudioLoad() {
		projectSelector.setStudioLoaded(mockStudio);
	}

	async function uninstall() {
		await projectSelector.getRecentsWaiter.wait();
		uninstallFakeDocument();
		databasesStub.restore();
	}
	return {
		projectSelector,
		mockStudio,
		openNewDbProjectSpy,
		openProjectFromLocalDirectorySpy,
		newProjectButton,
		openProjectButton,
		triggerStudioLoad,
		uninstall,
	};
}
