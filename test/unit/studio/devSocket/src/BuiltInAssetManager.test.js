import {assert, assertEquals, assertExists} from "std/testing/asserts.ts";
import {BuiltInAssetManager} from "../../../../../studio/devSocket/src/BuiltInAssetManager.js";
import {incrementTime, installMockTime, uninstallMockTime} from "../../../shared/mockTime.js";
import {waitForMicrotasks} from "../../../shared/waitForMicroTasks.js";

const originalDenoWatchFs = Deno.watchFs;
const originalDenoStat = Deno.stat;
const orignalDenoReadFile = Deno.readFile;
const originalDenoReadTextFile = Deno.readTextFile;
const originalDenoWriteFile = Deno.writeFile;
const originalDenoWriteTextFile = Deno.writeTextFile;
const originalDenoReadDir = Deno.readDir;

/**
 * @param {object} options
 * @param {(...args: Parameters<Deno.stat>) => Deno.FileInfo} [options.statCb]
 * @param {(...args: Parameters<Deno.readFile>) => Uint8Array} [options.readFileCb]
 * @param {(...args: Parameters<Deno.readTextFile>) => string} [options.readTextFileCb]
 * @param {(...args: Parameters<Deno.writeFile>) => void} [options.writeFileCb]
 * @param {(...args: Parameters<Deno.writeTextFile>) => void} [options.writeTextFileCb]
 * @param {(...args: Parameters<Deno.readDir>) => Deno.DirEntry[]} [options.readDirCb]
 */
function installMockDenoCalls({
	statCb,
	readFileCb,
	readTextFileCb,
	writeFileCb,
	writeTextFileCb,
	readDirCb,
} = {}) {
	/** @typedef {{value: Deno.FsEvent | undefined, done: boolean}} GeneratorNextResult */

	/** @type {((generatorResult: GeneratorNextResult) => void)?} */
	let currentlyWaitingNextCallback = null;
	/** @type {GeneratorNextResult[]} */
	const currentGeneratorQueue = [];

	/**
	 * @param {Deno.FsEvent} event
	 */
	function triggerWatchEvent(event, done = false) {
		const value = done ? undefined : event;
		const result = {value, done};
		if (currentlyWaitingNextCallback) {
			currentlyWaitingNextCallback(result);
			currentlyWaitingNextCallback = null;
		} else {
			currentGeneratorQueue.push(result);
		}
	}

	Deno.watchFs = function(path) {
		return {
			async next() {
				const queueItem = currentGeneratorQueue.shift();
				if (queueItem) return queueItem;

				/** @type {Promise<GeneratorNextResult>} */
				const eventPromise = new Promise(r => {
					currentlyWaitingNextCallback = r;
				});
				return await eventPromise;
			},
			rid: 0,
			close() {
				triggerWatchEvent({kind: "any", paths: []}, true);
			},
			[Symbol.asyncIterator]() {
				return /** @type {any} */ (this);
			},
		};
	};

	Deno.stat = async function(path) {
		if (!statCb) {
			throw new Error("Deno.stat has not been mocked");
		}
		return statCb(path);
	};

	Deno.readFile = async function(path, options) {
		if (!readFileCb) {
			throw new Error("Deno.readFile has not been mocked");
		}
		return readFileCb(path, options);
	};

	Deno.readTextFile = async function(path, options) {
		if (!readTextFileCb) {
			throw new Error("Deno.readTextFile has not been mocked");
		}
		return readTextFileCb(path, options);
	};

	Deno.writeFile = async function(path, data, options) {
		if (!writeFileCb) {
			throw new Error("Deno.writeFile has not been mocked");
		}
		return writeFileCb(path, data, options);
	};

	Deno.writeTextFile = async function(path, data, options) {
		if (!writeTextFileCb) {
			throw new Error("Deno.writeTextFile has not been mocked");
		}
		return writeTextFileCb(path, data, options);
	};

	Deno.readDir = async function *(path) {
		if (!readDirCb) {
			throw new Error("Deno.readDir has not been mocked");
		}
		for (const file of readDirCb(path)) {
			yield file;
		}
	};

	return {
		triggerWatchEvent,
	};
}

function uninstallMockDenoCalls() {
	Deno.watchFs = originalDenoWatchFs;
	Deno.stat = originalDenoStat;
	Deno.readFile = orignalDenoReadFile;
	Deno.readTextFile = originalDenoReadTextFile;
	Deno.writeFile = originalDenoWriteFile;
	Deno.writeTextFile = originalDenoWriteTextFile;
	Deno.readDir = originalDenoReadDir;
}

/**
 * @param {object} options
 * @param {unknown} [options.initialAssetSettings]
 * @param {[string, Uint8Array | string][]} [options.initialFiles]
 */
async function installMocks({
	initialAssetSettings = {assets: {}},
	initialFiles = [],
} = {}) {
	/** @type {Map<string, Uint8Array | string>} */
	const files = new Map(initialFiles);
	files.set("/assets/assetSettings.json", JSON.stringify(initialAssetSettings));
	/** @type {{path: string, text: string}[]} */
	const writeTextFileCalls = [];
	const {triggerWatchEvent} = installMockDenoCalls({
		statCb(path) {
			if (path instanceof URL) {
				path = path.href;
			}
			if (files.has(path)) {
				return /** @type {Deno.FileInfo} */ ({
					isDirectory: false,
				});
			}
			let dirPath = path;
			if (!dirPath.endsWith("/")) {
				dirPath += "/";
			}
			for (const filePath of files.keys()) {
				if (filePath.startsWith(dirPath)) {
					return /** @type {Deno.FileInfo} */ ({
						isDirectory: true,
					});
				}
			}

			throw new Error(`File ${path} not found`);
		},
		readFileCb(path) {
			if (path instanceof URL) {
				path = path.href;
			}
			const file = files.get(path);
			if (typeof file == "string") {
				throw new Error(`File ${path} is a text file.`);
			} else if (file instanceof Uint8Array) {
				return file;
			} else {
				throw new Error(`File ${path} not found`);
			}
		},
		readTextFileCb(path) {
			if (path instanceof URL) {
				path = path.href;
			}
			const file = files.get(path);
			if (typeof file == "string") {
				return file;
			} else if (file instanceof Uint8Array) {
				throw new Error(`File ${path} is not a string`);
			} else {
				throw new Error(`File ${path} not found`);
			}
		},
		writeTextFileCb(path, text) {
			if (typeof text != "string") {
				throw new Error("Only string arguments are supported in tests");
			}
			if (path instanceof URL) {
				path = path.href;
			}
			writeTextFileCalls.push({path, text});

			/** @type {Deno.FsEvent["kind"]} */
			let eventKind = "other";
			if (files.has(path)) {
				eventKind = "modify";
			} else {
				eventKind = "create";
			}
			files.set(path, text);
			triggerWatchEvent({
				kind: eventKind,
				paths: [path],
			});
		},
	});

	installMockTime();

	const manager = new BuiltInAssetManager({
		builtInAssetsPath: "/assets",
	});
	await manager.loadAssetSettings();
	manager.watch();

	return {
		manager,
		uninstall() {
			uninstallMockDenoCalls();
			uninstallMockTime();
		},
		triggerWatchEvent,
		files,
		writeTextFileCalls,
	};
}

Deno.test({
	name: "It has the correct asset paths when invoked with builtInAssetsPath set to null",
	fn() {
		const manager = new BuiltInAssetManager({
			builtInAssetsPath: null,
		});

		assert(manager.builtInAssetsPath.endsWith("studio/builtInAssets"));
		assert(manager.assetSettingsPath.endsWith("studio/builtInAssets/assetSettings.json"));
	},
});

Deno.test({
	name: "It has the correct asset paths when invoked with builtInAssetsPath set to a string",
	fn() {
		const manager = new BuiltInAssetManager({
			builtInAssetsPath: "/some/path",
		});

		assertEquals(manager.builtInAssetsPath, "/some/path");
		assertEquals(manager.assetSettingsPath, "/some/path/assetSettings.json");
	},
});

Deno.test({
	name: "Reloads asset settings when watching and assetSettings file changes",
	async fn() {
		const {triggerWatchEvent} = installMockDenoCalls();

		const manager = new BuiltInAssetManager({
			builtInAssetsPath: "/assests",
		});
		let loadAssetSettingsCallCount = 0;
		manager.loadAssetSettings = async () => {
			loadAssetSettingsCallCount++;
		};

		manager.watch();

		triggerWatchEvent({
			kind: "modify",
			paths: ["/assests/assetSettings.json"],
		});

		await waitForMicrotasks();

		assertEquals(loadAssetSettingsCallCount, 1);

		uninstallMockDenoCalls();
	},
});

Deno.test({
	name: "loadAssetSettings()",
	async fn() {
		installMockDenoCalls({
			readTextFileCb() {
				return `{
					"assets": {
						"aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee": {
							"path": ["path","to","file.dat"]
						}
					}
				}`;
			},
			readFileCb() {
				return new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
			},
		});

		const manager = new BuiltInAssetManager({
			builtInAssetsPath: "/assets",
		});
		await manager.loadAssetSettings();

		assertEquals(Array.from(manager.assetSettings), [
			[
				"aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
				{
					path: ["path", "to", "file.dat"],
				},
			],
		]);
		assertEquals(Array.from(manager.fileHashes), [
			[
				"1f825aa2f0020ef7cf91dfa30da4668d791c5d4824fc8e41354b89ec05795ab3",
				"aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
			],
		]);

		uninstallMockDenoCalls();
	},
});

Deno.test({
	name: "a created file is added to assetSettings.json",
	async fn() {
		const {manager, uninstall, triggerWatchEvent, files, writeTextFileCalls} = await installMocks();

		try {
			files.set("/assets/newFile.dat", new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]));
			triggerWatchEvent({
				kind: "create",
				paths: ["/assets/newFile.dat"],
			});

			await waitForMicrotasks();
			await manager.waitForHandleFileChangePromises();

			assertEquals(writeTextFileCalls.length, 1);
			assertEquals(writeTextFileCalls[0].path, "/assets/assetSettings.json");
			const assetSettings = JSON.parse(writeTextFileCalls[0].text);
			assertExists(assetSettings.assets);
			assertEquals(Object.entries(assetSettings.assets).length, 1);
			assertEquals(Object.values(assetSettings.assets)[0], {path: ["newFile.dat"]});
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "externally modifying assetSettings.json",
	async fn() {
		const {manager, uninstall, triggerWatchEvent, files} = await installMocks({
			initialAssetSettings: {
				assets: {
					"00000000-0000-0000-0000-000000000000": {
						path: ["existingFile.dat"],
					},
				},
			},
			initialFiles: [["/assets/existingFile.dat", new Uint8Array([0, 1, 2])]],
		});

		try {
			assertEquals(Array.from(manager.assetSettings), [
				[
					"00000000-0000-0000-0000-000000000000",
					{
						path: ["existingFile.dat"],
					},
				],
			]);
			assertEquals(Array.from(manager.fileHashes), [["ae4b3280e56e2faf83f414a6e3dabe9d5fbe18976544c05fed121accb85b53fc", "00000000-0000-0000-0000-000000000000"]]);

			files.set("/assets/assetSettings.json", JSON.stringify({
				assets: {
					"00000000-0000-0000-0000-ffffffffffff": {
						path: ["existingFile.dat"],
					},
				},
			}));
			triggerWatchEvent({
				kind: "modify",
				paths: ["/assets/assetSettings.json"],
			});

			await waitForMicrotasks();
			await manager.waitForAssetSettingsLoad();

			assertEquals(Array.from(manager.assetSettings), [
				[
					"00000000-0000-0000-0000-ffffffffffff",
					{
						path: ["existingFile.dat"],
					},
				],
			]);
			assertEquals(Array.from(manager.fileHashes), [["ae4b3280e56e2faf83f414a6e3dabe9d5fbe18976544c05fed121accb85b53fc", "00000000-0000-0000-0000-ffffffffffff"]]);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "externally modifying assetSettings.json and then adding a file",
	async fn() {
		const {manager, uninstall, triggerWatchEvent, files, writeTextFileCalls} = await installMocks({
			initialAssetSettings: {
				assets: {
					"00000000-0000-0000-0000-000000000000": {
						path: ["existingFile.dat"],
					},
				},
			},
			initialFiles: [["/assets/existingFile.dat", new Uint8Array([0, 1, 2])]],
		});

		try {
			files.set("/assets/assetSettings.json", JSON.stringify({
				assets: {
					"00000000-0000-0000-0000-ffffffffffff": {
						path: ["existingFile.dat"],
					},
				},
			}));
			triggerWatchEvent({
				kind: "modify",
				paths: ["/assets/assetSettings.json"],
			});

			await waitForMicrotasks();
			await manager.waitForAssetSettingsLoad();

			files.set("/assets/newFile.dat", new Uint8Array([0, 1, 2, 3]));
			triggerWatchEvent({
				kind: "create",
				paths: ["/assets/newFile.dat"],
			});

			await waitForMicrotasks();
			await manager.waitForHandleFileChangePromises();

			assertEquals(writeTextFileCalls.length, 1);
			assertEquals(writeTextFileCalls[0].path, "/assets/assetSettings.json");
			const assetSettings = JSON.parse(writeTextFileCalls[0].text);
			assertExists(assetSettings.assets);
			assertEquals(Object.entries(assetSettings.assets).length, 2);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "external assetSettings.json change only triggers an asset settings reload if the application didn't write to it itself.",
	async fn() {
		const {manager, uninstall, triggerWatchEvent, files} = await installMocks();

		try {
			let didReloadAssetSettings = false;
			manager.loadAssetSettings = async () => {
				didReloadAssetSettings = true;
			};

			// Two external changes should trigger two assetSettings.json writes,
			// and as a result, two watch events for assetSettings.json
			files.set("/assets/file1.dat", new Uint8Array([1, 1, 1]));
			triggerWatchEvent({
				kind: "create",
				paths: ["/assets/file1.dat"],
			});
			files.set("/assets/file2.dat", new Uint8Array([2, 2, 2]));
			triggerWatchEvent({
				kind: "create",
				paths: ["/assets/file2.dat"],
			});
			await waitForMicrotasks();
			await manager.waitForHandleFileChangePromises();

			assertEquals(didReloadAssetSettings, false);

			// externally changing asset settings after a while should trigger a reload though
			incrementTime(10_000);

			files.set("/assets/assetSettings.json", JSON.stringify({
				assets: {},
			}));
			triggerWatchEvent({
				kind: "modify",
				paths: ["/assets/assetSettings.json"],
			});
			await waitForMicrotasks();
			await manager.waitForAssetSettingsLoad();

			assertEquals(didReloadAssetSettings, true);
		} finally {
			uninstall();
		}
	},
});

/**
 * @param {string[][]} initialPaths
 * @param {string[][]} expectedPaths
 */
async function basicSortTest(initialPaths, expectedPaths, newFilePath = ["newFile"]) {
	/**
	 * @param {string[][]} paths
	 */
	function buildAssetSettingsJson(paths) {
		let uuidIndex = 0;
		/** @type {Object<string, import("../../../../../studio/src/assets/AssetSettingsDiskTypes.ts").AssetSettingsAssetDiskData>} */
		const assets = {};
		for (const path of paths) {
			uuidIndex++;
			assets["uuid" + uuidIndex] = {path};
		}
		return {assets};
	}

	/**
	 * @param {string[]} path
	 */
	function pathToString(path) {
		return "/assets/" + path.join("/");
	}

	/** @type {[string, Uint8Array][]} */
	const initialFiles = [];
	let fileIndex = 0;
	for (const path of initialPaths) {
		// Use different content in every file in order to prevent hashes from clashing
		fileIndex++;
		initialFiles.push([pathToString(path), new Uint8Array([fileIndex])]);
	}

	const {manager, uninstall, files, triggerWatchEvent, writeTextFileCalls} = await installMocks({
		initialAssetSettings: buildAssetSettingsJson(initialPaths),
		initialFiles,
	});

	try {
		const newFilePathStr = pathToString(newFilePath);
		files.set(newFilePathStr, new Uint8Array([0]));
		triggerWatchEvent({
			kind: "create",
			paths: [newFilePathStr],
		});

		await waitForMicrotasks();
		await manager.waitForAssetSettingsLoad();
		await manager.waitForHandleFileChangePromises();

		// Delete the created file again in order to remove its uuid.
		// The uuid of this file will be random so it's more difficult to assert against
		files.delete(newFilePathStr);

		triggerWatchEvent({
			kind: "remove",
			paths: [newFilePathStr],
		});

		await waitForMicrotasks();
		await manager.waitForAssetSettingsLoad();
		await manager.waitForHandleFileChangePromises();

		assertEquals(writeTextFileCalls.length, 2);
		assertEquals(writeTextFileCalls[1].path, "/assets/assetSettings.json");
		const assetSettings = JSON.parse(writeTextFileCalls[1].text);
		/** @type {string[][]} */
		const pathsOrder = [];
		for (const asset of Object.values(assetSettings.assets)) {
			pathsOrder.push(asset.path);
		}
		assertEquals(pathsOrder, expectedPaths);
	} finally {
		uninstall();
	}
}

Deno.test({
	name: "Sorts files when they're all in the wrong order",
	async fn() {
		await basicSortTest([
			["a", "b", "b"],
			["a", "b", "a"],
		], [
			["a", "b", "a"],
			["a", "b", "b"],
		]);

		await basicSortTest([
			["a", "c"],
			["a", "b", "a"],
		], [
			["a", "b", "a"],
			["a", "c"],
		]);

		await basicSortTest([
			["dirA", "fileA"],
			["dirA", "fileB"],
			["dirB", "dirC", "fileA"],
			["dirB", "dirC", "fileB"],
			["dirB", "fileA"],
			["dirB", "fileB"],
			["file"],
		], [
			["dirA", "fileA"],
			["dirA", "fileB"],
			["dirB", "dirC", "fileA"],
			["dirB", "dirC", "fileB"],
			["dirB", "fileA"],
			["dirB", "fileB"],
			["file"],
		]);

		await basicSortTest([
			["dirA", "fileB"],
			["dirB", "fileB"],
			["file"],
			["dirB", "fileA"],
			["dirB", "dirC", "fileA"],
			["dirB", "dirC", "fileB"],
			["dirA", "fileA"],
		], [
			["dirA", "fileA"],
			["dirA", "fileB"],
			["dirB", "dirC", "fileA"],
			["dirB", "dirC", "fileB"],
			["dirB", "fileA"],
			["dirB", "fileB"],
			["file"],
		]);
	},
});

Deno.test({
	name: "Directories should be sorted at the top",
	async fn() {
		// Dirs should be at the top
		await basicSortTest([
			["a"],
			["b", "file"],
		], [
			["b", "file"],
			["a"],
		]);
	},
});
