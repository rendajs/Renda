import { Importer } from "fake-imports";
import { assertEquals, assertRejects } from "std/testing/asserts.ts";
import { assertSpyCall, assertSpyCalls, returnsNext, spy, stub } from "std/testing/mock.ts";

const importer = new Importer(import.meta.url);
importer.redirectModule("../../../../../src/util/IndexedDbUtil.js", "../../shared/MockIndexedDbUtil.js");

/** @type {import("../../../../../studio/src/windowManagement/WorkspaceManager.js")} */
const WorkspaceManagerMod = await importer.import("../../../../../studio/src/windowManagement/WorkspaceManager.js");
const { WorkspaceManager } = WorkspaceManagerMod;

/** @type {import("../../shared/MockIndexedDbUtil.js")} */
const MockIndexedDbUtilMod = await importer.import("../../../../../src/util/IndexedDbUtil.js");
const { deleteAllDbs } = MockIndexedDbUtilMod;

Deno.test({
	name: "getWorkspacesList()",
	async fn() {
		try {
			const manager1 = new WorkspaceManager();
			assertEquals(await manager1.getWorkspacesList(), ["Default"]);
			await manager1.addNewWorkspace("new workspace");
			assertEquals(await manager1.getWorkspacesList(), ["Default", "new workspace"]);

			const manager2 = new WorkspaceManager();
			assertEquals(await manager2.getWorkspacesList(), ["Default", "new workspace"]);
		} finally {
			deleteAllDbs();
		}
	},
});

Deno.test({
	name: "current workspace id",
	async fn() {
		try {
			const manager1 = new WorkspaceManager();
			assertEquals(await manager1.getCurrentWorkspaceId(), "Default");

			await manager1.addNewWorkspace("workspace 2");
			assertEquals(await manager1.getCurrentWorkspaceId(), "workspace 2");

			await manager1.setActiveWorkspaceData({
				type: "tabs",
				tabTypes: ["type1"],
				tabUuids: ["uuid1"],
			}, {
				workspace: {},
				windows: [],
			});

			await manager1.setCurrentWorkspaceId("Default");
			assertEquals(await manager1.getCurrentWorkspaceId(), "Default");
			assertEquals(await manager1.getActiveWorkspaceData(), manager1.getDefaultWorkspace());

			await manager1.setCurrentWorkspaceId("workspace 2");
			assertEquals(await manager1.getActiveWorkspaceData(), {
				rootWindow: {
					type: "tabs",
					tabTypes: ["type1"],
					tabUuids: ["uuid1"],
				},
			});

			const manager2 = new WorkspaceManager();
			assertEquals(await manager2.getCurrentWorkspaceId(), "workspace 2");
			assertEquals(await manager1.getActiveWorkspaceData(), {
				rootWindow: {
					type: "tabs",
					tabTypes: ["type1"],
					tabUuids: ["uuid1"],
				},
			});

			const onChangeSpyFn = spy();
			manager2.onActiveWorkspaceDataChange(onChangeSpyFn);
			await manager2.setCurrentWorkspaceId("Default");
			assertSpyCalls(onChangeSpyFn, 1);
		} finally {
			deleteAllDbs();
		}
	},
});

Deno.test({
	name: "active workspace data",
	async fn() {
		try {
			const manager1 = new WorkspaceManager();
			assertEquals(await manager1.getActiveWorkspaceData(), manager1.getDefaultWorkspace());
			await manager1.setActiveWorkspaceData({
				type: "tabs",
				tabTypes: ["type"],
				tabUuids: ["uuid"],
			}, {
				workspace: {},
				windows: [],
			});
			assertEquals(await manager1.getActiveWorkspaceData(), {
				rootWindow: {
					type: "tabs",
					tabTypes: ["type"],
					tabUuids: ["uuid"],
				},
			});

			const manager2 = new WorkspaceManager();
			assertEquals(await manager2.getActiveWorkspaceData(), {
				rootWindow: {
					type: "tabs",
					tabTypes: ["type"],
					tabUuids: ["uuid"],
				},
			});
		} finally {
			deleteAllDbs();
		}
	},
});

Deno.test({
	name: "autoSave value",
	async fn() {
		try {
			const manager1 = new WorkspaceManager();
			assertEquals(await manager1.getCurrentWorkspaceAutoSaveValue(), true);
			await manager1.setCurrentWorkspaceAutoSaveValue(false);
			assertEquals(await manager1.getCurrentWorkspaceAutoSaveValue(), false);

			const manager2 = new WorkspaceManager();
			assertEquals(await manager2.getCurrentWorkspaceAutoSaveValue(), false);

			await manager2.addNewWorkspace("new");
			assertEquals(await manager2.getCurrentWorkspaceAutoSaveValue(), true);
		} finally {
			deleteAllDbs();
		}
	},
});

Deno.test({
	name: "setActiveWorkspaceData autosaves when autosave is enabled",
	async fn() {
		try {
			const manager1 = new WorkspaceManager();
			assertEquals(await manager1.getActiveWorkspaceData(), manager1.getDefaultWorkspace());
			await manager1.setActiveWorkspaceData({
				type: "tabs",
				tabTypes: ["type"],
				tabUuids: ["uuid"],
			}, {
				workspace: {},
				windows: [],
			});
			await manager1.addNewWorkspace("new");

			const manager2 = new WorkspaceManager();
			await manager2.setCurrentWorkspaceId("Default");
			assertEquals(await manager2.getActiveWorkspaceData(), {
				rootWindow: {
					type: "tabs",
					tabTypes: ["type"],
					tabUuids: ["uuid"],
				},
			});
		} finally {
			deleteAllDbs();
		}
	},
});

Deno.test({
	name: "setActiveWorkspaceData saves preferences data unless it is empty",
	async fn() {
		try {
			// Create a manager with preferences data
			const manager1 = new WorkspaceManager();
			assertEquals(await manager1.getActiveWorkspaceData(), manager1.getDefaultWorkspace());
			await manager1.setActiveWorkspaceData({
				type: "tabs",
				tabTypes: ["type"],
				tabUuids: ["uuid"],
			}, {
				workspace: {
					pref1: "foo",
				},
				windows: [
					{
						uuid: "uuid",
						preferences: {
							pref2: "bar",
						},
					},
				],
			});
			await manager1.addNewWorkspace("new1");

			// Create another one and check if the data is saved
			const manager2 = new WorkspaceManager();
			await manager2.setCurrentWorkspaceId("Default");
			assertEquals(await manager2.getActiveWorkspaceData(), {
				rootWindow: {
					type: "tabs",
					tabTypes: ["type"],
					tabUuids: ["uuid"],
				},
				preferences: {
					workspace: {
						pref1: "foo",
					},
					windows: [
						{
							uuid: "uuid",
							preferences: {
								pref2: "bar",
							},
						},
					],
				},
			});

			// Clear preferences data
			await manager2.setActiveWorkspaceData({
				type: "tabs",
				tabTypes: ["type"],
				tabUuids: ["uuid"],
			}, {
				workspace: {},
				windows: [],
			});
			await manager2.addNewWorkspace("new2");

			// Create a third one and check if data is empty
			const manager3 = new WorkspaceManager();
			await manager3.setCurrentWorkspaceId("Default");
			assertEquals(await manager3.getActiveWorkspaceData(), {
				rootWindow: {
					type: "tabs",
					tabTypes: ["type"],
					tabUuids: ["uuid"],
				},
			});
		} finally {
			deleteAllDbs();
		}
	},
});

Deno.test({
	name: "addNewWorkspace",
	async fn() {
		try {
			const manager1 = new WorkspaceManager();
			assertEquals(await manager1.getActiveWorkspaceData(), manager1.getDefaultWorkspace());
			await manager1.setActiveWorkspaceData({
				type: "tabs",
				tabTypes: ["type"],
				tabUuids: ["uuid"],
			}, {
				workspace: {},
				windows: [],
			});
			assertEquals(await manager1.getActiveWorkspaceData(), {
				rootWindow: {
					type: "tabs",
					tabTypes: ["type"],
					tabUuids: ["uuid"],
				},
			});
			await manager1.addNewWorkspace("new");
			assertEquals(await manager1.getWorkspacesList(), ["Default", "new"]);
			assertEquals(await manager1.getActiveWorkspaceData(), manager1.getDefaultWorkspace());

			const manager2 = new WorkspaceManager();
			assertEquals(await manager2.getActiveWorkspaceData(), manager2.getDefaultWorkspace());

			const onChangeSpyFn = spy();
			manager2.onActiveWorkspaceDataChange(onChangeSpyFn);
			await manager2.addNewWorkspace("onChangeTest");
			assertSpyCalls(onChangeSpyFn, 1);
		} finally {
			deleteAllDbs();
		}
	},
});

Deno.test({
	name: "addNewWorkspace with an already existing name",
	async fn() {
		try {
			const manager1 = new WorkspaceManager();
			await assertRejects(async () => {
				await manager1.addNewWorkspace("Default");
			}, Error, 'A workspace with the name "Default" already exists.');

			await manager1.addNewWorkspace("new");
			await assertRejects(async () => {
				await manager1.addNewWorkspace("new");
			}, Error, 'A workspace with the name "new" already exists.');
		} finally {
			deleteAllDbs();
		}
	},
});

Deno.test({
	name: "cloneWorkspace",
	async fn() {
		const promptSpy = stub(globalThis, "prompt", returnsNext(["new1", "new2", "alreadyexists"]));
		try {
			const manager1 = new WorkspaceManager();

			await manager1.cloneWorkspace("Default");
			assertSpyCalls(promptSpy, 1);
			assertSpyCall(promptSpy, 0, {
				args: ["Enter Workspace Name", "Copy of Default"],
			});
			assertEquals(await manager1.getCurrentWorkspaceId(), "new1");
			assertEquals(await manager1.getActiveWorkspaceData(), manager1.getDefaultWorkspace());

			const manager2 = new WorkspaceManager();
			assertEquals(await manager2.getCurrentWorkspaceId(), "new1");
			assertEquals(await manager2.getActiveWorkspaceData(), manager2.getDefaultWorkspace());

			await manager2.addNewWorkspace("empty");
			await manager2.setActiveWorkspaceData({
				type: "tabs",
				tabTypes: ["type1"],
				tabUuids: ["uuid1"],
			}, {
				workspace: {},
				windows: [],
			});
			await manager2.setCurrentWorkspaceId("Default");

			const onChangeSpyFn = spy();
			manager2.onActiveWorkspaceDataChange(onChangeSpyFn);
			await manager2.cloneWorkspace("empty");
			assertSpyCalls(onChangeSpyFn, 1);
			assertSpyCalls(promptSpy, 2);
			assertSpyCall(promptSpy, 1, {
				args: ["Enter Workspace Name", "Copy of empty"],
			});
			assertEquals(await manager2.getCurrentWorkspaceId(), "new2");
			assertEquals(await manager2.getActiveWorkspaceData(), {
				rootWindow: {
					type: "tabs",
					tabTypes: ["type1"],
					tabUuids: ["uuid1"],
				},
			});

			const manager3 = new WorkspaceManager();
			await manager3.addNewWorkspace("alreadyexists");
			await assertRejects(async () => {
				await manager3.cloneWorkspace("empty");
			}, Error, 'A workspace with the name "alreadyexists" already exists.');
		} finally {
			deleteAllDbs();
			promptSpy.restore();
		}
	},
});

Deno.test({
	name: "deleteWorkspace",
	async fn() {
		try {
			const manager1 = new WorkspaceManager();

			await assertRejects(async () => {
				await manager1.deleteWorkspace("Default");
			}, Error, "Cannot delete workspace when it's the only one.");

			await manager1.addNewWorkspace("new");
			await manager1.setActiveWorkspaceData({
				type: "tabs",
				tabTypes: ["type1"],
				tabUuids: ["uuid1"],
			}, {
				workspace: {},
				windows: [],
			});
			const onChangepyFn1 = spy();
			manager1.onActiveWorkspaceDataChange(onChangepyFn1);
			await manager1.deleteWorkspace("new");
			assertSpyCalls(onChangepyFn1, 1);
			assertEquals(await manager1.getWorkspacesList(), ["Default"]);
			assertEquals(await manager1.getActiveWorkspaceData(), manager1.getDefaultWorkspace());

			const manager2 = new WorkspaceManager();
			assertEquals(await manager2.getWorkspacesList(), ["Default"]);
			assertEquals(await manager2.getActiveWorkspaceData(), manager2.getDefaultWorkspace());

			await manager2.addNewWorkspace("new2");
			await manager2.setActiveWorkspaceData({
				type: "tabs",
				tabTypes: ["type2"],
				tabUuids: ["uuid2"],
			}, {
				workspace: {},
				windows: [],
			});
			const onChangepyFn2 = spy();
			manager2.onActiveWorkspaceDataChange(onChangepyFn2);
			await manager2.deleteWorkspace("Default");
			assertSpyCalls(onChangepyFn2, 0);
			assertEquals(await manager2.getWorkspacesList(), ["new2"]);
			assertEquals(await manager2.getActiveWorkspaceData(), {
				rootWindow: {
					type: "tabs",
					tabTypes: ["type2"],
					tabUuids: ["uuid2"],
				},
			});
		} finally {
			deleteAllDbs();
		}
	},
});
