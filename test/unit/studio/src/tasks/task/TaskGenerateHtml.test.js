import { assertEquals, assertRejects } from "std/testing/asserts.ts";
import { TaskGenerateHtml } from "../../../../../../studio/src/tasks/task/TaskGenerateHtml.js";
import { MemoryStudioFileSystem } from "../../../../../../studio/src/util/fileSystems/MemoryStudioFileSystem.js";
import { createMockProjectAsset } from "../../../shared/createMockProjectAsset.js";
import { getBasicRunTaskReadAssetOptions } from "./shared.js";

const BASIC_ASSET_UUID = "BASIC_ASSET_UUID";

function basicSetup({
	assetExists = true,
} = {}) {
	const fileSystem = /** @type {import("../../../../../../studio/src/util/fileSystems/StudioFileSystem.js").StudioFileSystem} */ (new MemoryStudioFileSystem());

	const { projectAsset: mockProjectAsset } = createMockProjectAsset({
		readAssetDataReturnValue: "abc$VAR1def$VAR1ghi$VAR2jkl",
	});

	const mockStudio = /** @type {import("../../../../../../studio/src/Studio.js").Studio} */ ({
		projectManager: {
			assetManager: {
				async getProjectAssetFromUuid(uuid, opts) {
					if (assetExists && uuid == BASIC_ASSET_UUID) {
						return mockProjectAsset;
					}
					return null;
				},
			},
			currentProjectFileSystem: fileSystem,
		},
	});

	const task = new TaskGenerateHtml(mockStudio);

	return {
		mockStudio,
		mockProjectAsset,
		fileSystem,
		task,
	};
}

/** @type {import("../../../../../../studio/src/tasks/task/Task.js").RunTaskOptions<import("../../../../../../studio/src/tasks/task/TaskGenerateHtml.js").TaskGenerateHtmlConfig>} */
const basicRunTaskOptions = {
	config: {
		template: BASIC_ASSET_UUID,
		outputLocation: ["out.html"],
		replacements: [],
	},
	allowDiskWrites: false,
	...getBasicRunTaskReadAssetOptions(),
};

/**
 * @param {import("../../../../../../studio/src/tasks/task/Task.js").RunTaskReturn} runTaskReturn
 * @param {string} htmlContent
 */
function assertResult(runTaskReturn, htmlContent) {
	assertEquals(runTaskReturn, {
		writeAssets: [
			{
				fileData: htmlContent,
				path: ["out.html"],
				assetType: "renda:html",
			},
		],
	});
}

Deno.test({
	name: "Basic task",
	async fn() {
		const { task } = basicSetup();

		const result = await task.runTask(basicRunTaskOptions);
		assertResult(result, "abc$VAR1def$VAR1ghi$VAR2jkl");
	},
});

Deno.test({
	name: "Some replacements",
	async fn() {
		const { task } = basicSetup();

		const result = await task.runTask({
			...basicRunTaskOptions,
			config: {
				template: BASIC_ASSET_UUID,
				outputLocation: ["out.html"],
				replacements: [
					{
						find: "VAR1",
						replace: "1",
					},
					{
						find: "VAR2",
						replace: "2",
					},
				],
			},
		});
		assertResult(result, "abc1def1ghi2jkl");
	},
});

Deno.test({
	name: "Missing find value",
	async fn() {
		const { task } = basicSetup();

		const result = await task.runTask({
			...basicRunTaskOptions,
			config: {
				template: BASIC_ASSET_UUID,
				outputLocation: ["out.html"],
				replacements: [
					{
						replace: "1",
					},
				],
			},
		});
		assertResult(result, "abc$VAR1def$VAR1ghi$VAR2jkl");
	},
});

Deno.test({
	name: "Missing replacement value",
	async fn() {
		const { task } = basicSetup();

		const result = await task.runTask({
			...basicRunTaskOptions,
			config: {
				template: BASIC_ASSET_UUID,
				outputLocation: ["out.html"],
				replacements: [
					{
						find: "VAR1",
					},
				],
			},
		});
		assertResult(result, "abcdefghi$VAR2jkl");
	},
});

Deno.test({
	name: "Missing template uuid",
	async fn() {
		const { task } = basicSetup();

		await assertRejects(async () => {
			await task.runTask({
				...basicRunTaskOptions,
				config: {
					template: null,
					outputLocation: ["out.html"],
					replacements: [],
				},
			});
		}, Error, "Failed to run task, no template provided");
	},
});

Deno.test({
	name: "Missing template asset",
	async fn() {
		const { task } = basicSetup({
			assetExists: false,
		});

		await assertRejects(async () => {
			await task.runTask({
				...basicRunTaskOptions,
				config: {
					template: BASIC_ASSET_UUID,
					outputLocation: ["out.html"],
					replacements: [],
				},
			});
		}, Error, "Failed to run task, template asset not found");
	},
});
