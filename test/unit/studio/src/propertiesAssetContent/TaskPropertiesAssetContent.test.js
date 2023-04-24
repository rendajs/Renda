import "../../shared/initializeStudio.js";
import {installFakeDocument, uninstallFakeDocument} from "fake-dom/FakeDocument.js";
import {PropertiesAssetContentTask, environmentVariablesStructure} from "../../../../../studio/src/propertiesAssetContent/PropertiesAssetContentTask.js";
import {createMockProjectAsset} from "../../shared/createMockProjectAsset.js";
import {createTreeViewStructure} from "../../../../../studio/src/ui/propertiesTreeView/createStructureHelpers.js";
import {Task} from "../../../../../studio/src/tasks/task/Task.js";
import {assertEquals, assertInstanceOf} from "std/testing/asserts.ts";
import {PropertiesTreeViewEntry} from "../../../../../studio/src/ui/propertiesTreeView/PropertiesTreeViewEntry.js";
import {TextGui} from "../../../../../studio/src/ui/TextGui.js";
import {assertSpyCall, assertSpyCalls, spy} from "std/testing/mock.ts";

/**
 * @param {object} options
 * @param {(typeof Task)[]} [options.extraTaskTypes]
 * @param {Object<string, string>?} [options.environmentVariablesAssetData] The environment variable data stored in the asset on disk.
 * @param {boolean} [options.useBasicEnvironmentVariables] If true, `environmentVariablesAssetData` gets replaced with basic data.
 * @param {Object<string, string>?} [options.taskConfigAssetData] The task config data stored in the asset on disk.
 * @param {boolean} [options.useBasicTaskConfig] If true, `taskConfigAssetData` gets replaced with basic data.
 */
function basicSetup({
	extraTaskTypes = [],
	environmentVariablesAssetData = null,
	useBasicEnvironmentVariables = false,
	taskConfigAssetData = null,
	useBasicTaskConfig = false,
} = {}) {
	const BASIC_TASK_TYPE = "namespace:tasktype";
	class BasicTask extends Task {
		static type = BASIC_TASK_TYPE;
		static configStructure = createTreeViewStructure({
			foo: {
				type: "string",
			},
		});
	}
	/** @type {Map<string, typeof Task>} */
	const taskTypes = new Map();
	taskTypes.set(BASIC_TASK_TYPE, BasicTask);
	for (const task of extraTaskTypes) {
		taskTypes.set(task.type, task);
	}

	const studio = /** @type {import("../../../../../studio/src/Studio.js").Studio} */ ({
		taskManager: {
			getTaskType(type) {
				const task = taskTypes.get(type);
				return task;
			},
			transformAssetToUiData(taskType, config) {
				return config;
			},
			transformUiToAssetData(taskType, config) {
				return config;
			},
		},
	});
	const assetContent = new PropertiesAssetContentTask(studio);

	/** @type {import("../../../../../studio/src/assets/projectAssetType/ProjectAssetTypeTask.js").TaskProjectAssetDiskData} */
	const readAssetDataReturnValue = {
		taskType: "namespace:tasktype",
	};
	if (useBasicEnvironmentVariables) {
		readAssetDataReturnValue.environmentVariables = {
			foo: "bar",
		};
	} else if (environmentVariablesAssetData) {
		readAssetDataReturnValue.environmentVariables = environmentVariablesAssetData;
	}
	if (useBasicTaskConfig) {
		readAssetDataReturnValue.taskConfig = {
			foo: "bar",
		};
	} else if (taskConfigAssetData) {
		readAssetDataReturnValue.taskConfig = taskConfigAssetData;
	}

	const {projectAsset: mockProjectAsset} = createMockProjectAsset({
		readAssetDataReturnValue,
	});

	return {
		assetContent,
		mockProjectAsset,
		BASIC_TASK_TYPE,
	};
}

Deno.test({
	name: "Loads environment variables from disk",
	async fn() {
		installFakeDocument();

		try {
			const {assetContent, mockProjectAsset} = basicSetup({
				useBasicEnvironmentVariables: true,
			});

			await assetContent.selectionUpdated([mockProjectAsset]);

			assertEquals(assetContent.environmentVariablesTree.getSerializableStructureValues(environmentVariablesStructure), {
				environmentVariables: [
					{
						key: "foo",
						value: "bar",
					},
				],
			});
		} finally {
			uninstallFakeDocument();
		}
	},
});

Deno.test({
	name: "Loads environment variables with partial data from disk",
	async fn() {
		installFakeDocument();

		try {
			const {assetContent, mockProjectAsset} = basicSetup({
				environmentVariablesAssetData: {
					foo: "",
				},
			});

			await assetContent.selectionUpdated([mockProjectAsset]);

			assertEquals(assetContent.environmentVariablesTree.getSerializableStructureValues(environmentVariablesStructure), {
				environmentVariables: [
					{
						key: "foo",
						value: "",
					},
				],
			});
		} finally {
			uninstallFakeDocument();
		}
	},
});

Deno.test({
	name: "Loads the task config from disk",
	async fn() {
		installFakeDocument();

		try {
			const {assetContent, mockProjectAsset} = basicSetup({
				useBasicTaskConfig: true,
			});

			await assetContent.selectionUpdated([mockProjectAsset]);

			assertEquals(assetContent.taskConfigTree.children.length, 1);
			const fooNode = assetContent.taskConfigTree.children[0];
			assertInstanceOf(fooNode, PropertiesTreeViewEntry);
			assertEquals(fooNode.getValue(), "bar");
		} finally {
			uninstallFakeDocument();
		}
	},
});

Deno.test({
	name: "Loads missing task config from disk",
	async fn() {
		installFakeDocument();

		try {
			const {assetContent, mockProjectAsset} = basicSetup();

			await assetContent.selectionUpdated([mockProjectAsset]);

			assertEquals(assetContent.taskConfigTree.children.length, 1);
			const fooNode = assetContent.taskConfigTree.children[0];
			assertInstanceOf(fooNode, PropertiesTreeViewEntry);
			assertEquals(fooNode.getValue(), "");
		} finally {
			uninstallFakeDocument();
		}
	},
});

Deno.test({
	name: "Clears config ui when selecting a task with no config",
	async fn() {
		installFakeDocument();

		try {
			class NoConfigTask extends Task {
				static type = "namespace:noconfigtasktype";
			}
			const {assetContent, mockProjectAsset} = basicSetup({
				useBasicTaskConfig: true,
				extraTaskTypes: [NoConfigTask],
			});

			await assetContent.selectionUpdated([mockProjectAsset]);

			const {projectAsset: mockProjectAsset2} = createMockProjectAsset({
				readAssetDataReturnValue: {
					taskType: NoConfigTask.type,
				},
			});

			await assetContent.selectionUpdated([mockProjectAsset2]);

			assertEquals(assetContent.taskConfigTree.children.length, 0);
		} finally {
			uninstallFakeDocument();
		}
	},
});

/**
 * @param {TextGui} textGui
 * @param {string} value
 */
function setTextGuiValue(textGui, value) {
	textGui.el.value = value;
	textGui.el.dispatchEvent(new Event("change"));
}

Deno.test({
	name: "Environment variables ui changes are saved to disk",
	async fn() {
		installFakeDocument();

		try {
			const {assetContent, mockProjectAsset} = basicSetup({
				useBasicEnvironmentVariables: true,
			});

			await assetContent.selectionUpdated([mockProjectAsset]);
			const writeAssetDataSpy = spy(mockProjectAsset, "writeAssetData");

			const variablesTreeView = assetContent.environmentVariablesTree.getSerializableStructureEntry("environmentVariables");
			const firstArrayItemGui = variablesTreeView.gui.valueItems[0].gui;
			const valueGui = firstArrayItemGui.treeView.getSerializableStructureEntry("value").gui;

			// change value to trigger a save
			setTextGuiValue(valueGui, "baz");

			assertSpyCalls(writeAssetDataSpy, 1);
			assertSpyCall(writeAssetDataSpy, 0, {
				args: [
					{
						taskType: "namespace:tasktype",
						environmentVariables: {
							foo: "baz",
						},
					},
				],
			});
		} finally {
			uninstallFakeDocument();
		}
	},
});

Deno.test({
	name: "Empty environment variables ui changes are not saved to disk",
	async fn() {
		installFakeDocument();

		try {
			const {assetContent, mockProjectAsset} = basicSetup({
				useBasicEnvironmentVariables: true,
			});

			await assetContent.selectionUpdated([mockProjectAsset]);
			const writeAssetDataSpy = spy(mockProjectAsset, "writeAssetData");

			const variablesTreeView = assetContent.environmentVariablesTree.getSerializableStructureEntry("environmentVariables");
			const firstArrayItemGui = variablesTreeView.gui.valueItems[0].gui;
			const keyGui = firstArrayItemGui.treeView.getSerializableStructureEntry("key").gui;
			const valueGui = firstArrayItemGui.treeView.getSerializableStructureEntry("value").gui;

			// Empty value
			setTextGuiValue(valueGui, "");
			assertSpyCalls(writeAssetDataSpy, 1);
			assertSpyCall(writeAssetDataSpy, 0, {
				args: [
					{
						taskType: "namespace:tasktype",
						environmentVariables: {
							foo: "",
						},
					},
				],
			});

			// Empty key
			setTextGuiValue(keyGui, "");
			setTextGuiValue(valueGui, "value");
			assertSpyCalls(writeAssetDataSpy, 3);
			assertSpyCall(writeAssetDataSpy, 1, {
				args: [
					{
						taskType: "namespace:tasktype",
					},
				],
			});
			assertSpyCall(writeAssetDataSpy, 2, {
				args: [
					{
						taskType: "namespace:tasktype",
					},
				],
			});

			// Empty key and empty value
			setTextGuiValue(valueGui, "");
			assertSpyCalls(writeAssetDataSpy, 4);
			assertSpyCall(writeAssetDataSpy, 3, {
				args: [
					{
						taskType: "namespace:tasktype",
					},
				],
			});
		} finally {
			uninstallFakeDocument();
		}
	},
});

Deno.test({
	name: "Config ui changes are saved to disk",
	async fn() {
		installFakeDocument();

		try {
			const {assetContent, mockProjectAsset} = basicSetup({
				useBasicTaskConfig: true,
			});

			await assetContent.selectionUpdated([mockProjectAsset]);
			const writeAssetDataSpy = spy(mockProjectAsset, "writeAssetData");

			const fooNode = assetContent.taskConfigTree.children[0];
			assertInstanceOf(fooNode, PropertiesTreeViewEntry);
			const fooGui = fooNode.gui;
			assertInstanceOf(fooGui, TextGui);
			setTextGuiValue(fooGui, "baz");

			assertSpyCalls(writeAssetDataSpy, 1);
			assertEquals(writeAssetDataSpy.calls[0].args[0], {
				taskType: "namespace:tasktype",
				taskConfig: {
					foo: "baz",
				},
			});
		} finally {
			uninstallFakeDocument();
		}
	},
});

Deno.test({
	name: "Config with only default values is not saved to disk",
	async fn() {
		installFakeDocument();

		try {
			const {assetContent, mockProjectAsset} = basicSetup({
				useBasicTaskConfig: true,
			});

			await assetContent.selectionUpdated([mockProjectAsset]);
			const writeAssetDataSpy = spy(mockProjectAsset, "writeAssetData");

			const fooNode = assetContent.taskConfigTree.children[0];
			assertInstanceOf(fooNode, PropertiesTreeViewEntry);
			const fooGui = fooNode.gui;
			assertInstanceOf(fooGui, TextGui);
			setTextGuiValue(fooGui, "");

			assertSpyCalls(writeAssetDataSpy, 1);
			assertEquals(writeAssetDataSpy.calls[0].args[0], {
				taskType: "namespace:tasktype",
			});
		} finally {
			uninstallFakeDocument();
		}
	},
});
