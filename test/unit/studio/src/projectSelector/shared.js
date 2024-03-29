import { Importer } from "fake-imports";
import { installFakeDocument, uninstallFakeDocument } from "fake-dom/FakeDocument.js";
import { spy, stub } from "std/testing/mock.ts";

const importer = new Importer(import.meta.url);
importer.redirectModule("../../../../../src/util/IndexedDbUtil.js", "../../shared/MockIndexedDbUtil.js");
importer.makeReal("../../../../../src/util/mod.js");

/** @type {import("../../../../../studio/src/projectSelector/ProjectSelector.js")} */
const ProjectSelectorMod = await importer.import("../../../../../studio/src/projectSelector/ProjectSelector.js");
const { ProjectSelector } = ProjectSelectorMod;

const { forcePendingOperations: forcePendingOperationsImported, IndexedDbUtil } = await importer.import("../../../../../src/util/IndexedDbUtil.js");
const forcePendingOperations = /** @type {typeof import("../../shared/MockIndexedDbUtil.js").forcePendingOperations} */ (forcePendingOperationsImported);

export { forcePendingOperations, ProjectSelector };

/**
 * @param {object} [options]
 * @param {() => Promise<IDBDatabaseInfo[]>} [options.databasesImpl]
 * @param {(indexedDb: import("../../../../../src/util/IndexedDbUtil.js").IndexedDbUtil) => void} [options.initializeIndexedDbHook]
 */
export function basicSetup({
	databasesImpl = async () => [],
	initializeIndexedDbHook = () => {},
} = {}) {
	installFakeDocument();
	globalThis.indexedDB = /** @type {any} */ ({});
	const databasesStub = stub(globalThis.indexedDB, "databases", databasesImpl);

	const indexedDb = new IndexedDbUtil("projectSelector");
	initializeIndexedDbHook(indexedDb);

	const projectSelector = new ProjectSelector();

	/** @type {import("../../../../../studio/src/misc/ServiceWorkerManager.js").ServiceWorkerInstallingState} */
	let installingState = "idle";
	/** @type {Set<() => void>} */
	const installingStateChangeCbs = new Set();

	let openTabCount = 1;

	const mockStudio = /** @type {import("../../../../../studio/src/Studio.js").Studio} */ ({
		projectManager: {
			onProjectOpenEntryChange(cb) {},
		},
		serviceWorkerManager: {
			get installingState() {
				return installingState;
			},
			onInstallingStateChange(cb) {
				installingStateChangeCbs.add(cb);
			},
			restartClients() {},
			get openTabCount() {
				return openTabCount;
			},
		},
		windowManager: {
			focusOrCreateContentWindow(contentWindowConstructorOrId) {

			},
		},
	});

	const openNewDbProjectSpy = stub(mockStudio.projectManager, "openNewDbProject", async (fromUserGesture) => {});
	const openProjectFromLocalDirectorySpy = stub(mockStudio.projectManager, "openProjectFromLocalDirectory", async () => {});
	const restartClientsSpy = spy(mockStudio.serviceWorkerManager, "restartClients");

	const newProjectButton = projectSelector.actionsListEl.children[0].children[0];
	const openProjectButton = projectSelector.actionsListEl.children[1].children[0];

	function triggerStudioLoad() {
		projectSelector.setStudioLoaded(mockStudio);
	}

	/**
	 * @param {import("../../../../../studio/src/misc/ServiceWorkerManager.js").ServiceWorkerInstallingState} newState
	 */
	function setInstallingState(newState) {
		installingState = newState;
		installingStateChangeCbs.forEach((cb) => cb());
	}

	/**
	 * @param {number} newCount
	 */
	function setOpenTabCount(newCount) {
		openTabCount = newCount;
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
		restartClientsSpy,
		newProjectButton,
		openProjectButton,
		triggerStudioLoad,
		setInstallingState,
		setOpenTabCount,
		uninstall,
	};
}
