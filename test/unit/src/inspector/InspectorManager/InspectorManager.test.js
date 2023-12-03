import {Importer} from "fake-imports";
import {AssertionError, assert, assertEquals, assertInstanceOf, assertStrictEquals} from "std/testing/asserts.ts";
import {FakeTime} from "std/testing/time.ts";
import {assertSpyCalls, spy, stub} from "std/testing/mock.ts";
import {assertLastDiscoveryManager, clearCreatedDiscoveryManagers} from "../../../studio/src/network/studioConnections/shared/MockDiscoveryManager.js";
import {assertPromiseResolved} from "../../../shared/asserts.js";
import {ExtendedDiscoveryMethod} from "../../network/studioConnections/discoveryMethods/shared/ExtendedDiscoveryMethod.js";

const importer = new Importer(import.meta.url);
importer.makeReal("../../../studio/src/network/studioConnections/shared/MockDiscoveryManager.js");
importer.fakeModule("../../../../../src/network/studioConnections/ParentStudioCommunicator.js", `
export class ParentStudioCommunicator {
	requestDesiredParentStudioConnection(discoveryManager) {}
}
`);
importer.redirectModule("../../../../../src/network/studioConnections/DiscoveryManager.js", "../../../studio/src/network/studioConnections/shared/MockDiscoveryManager.js");

/** @type {import("../../../../../src/inspector/InspectorManager.js")} */
const InspectorManagerMod = await importer.import("../../../../../src/inspector/InspectorManager.js");
const {InspectorManager} = InspectorManagerMod;

/** @type {import("../../../../../src/network/studioConnections/ParentStudioCommunicator.js")} */
const ParentStudioCommunicatorMod = await importer.import("../../../../../src/network/studioConnections/ParentStudioCommunicator.js");
const {ParentStudioCommunicator} = ParentStudioCommunicatorMod;

/**
 * @typedef InspectorManagerTestContext
 * @property {FakeTime} fakeTime
 * @property {import("std/testing/mock.ts").Spy<any, [discoveryManager: import("../../../../../src/network/studioConnections/DiscoveryManager.js").DiscoveryManager, any[]]>} requestConnectionSpy
 */

/**
 * @param {object} options
 * @param {(ctx: InspectorManagerTestContext) => Promise<void>} options.fn
 */
async function basicTest({fn}) {
	const fakeTime = new FakeTime();
	const requestConnectionSpy = spy(ParentStudioCommunicator.prototype, "requestDesiredParentStudioConnection");
	try {
		await fn({
			fakeTime,
			requestConnectionSpy,
		});
	} finally {
		fakeTime.restore();
		requestConnectionSpy.restore();
		clearCreatedDiscoveryManagers();
	}
}

/**
 * @param {object} options
 * @param {import("../../../../../src/mod.js").UuidString} [options.connectionId]
 * @param {import("../../../../../src/network/studioConnections/DiscoveryManager.js").ClientType} [options.clientType]
 */
function createConnection({
	connectionId = "uuid",
	clientType = "studio-host",
} = {}) {
	const discoveryManager = assertLastDiscoveryManager();
	const method = discoveryManager.addDiscoveryMethod(ExtendedDiscoveryMethod);
	method.addOne({
		clientType,
		id: connectionId,
		projectMetadata: null,
	});
	method.addActive(connectionId, true, 42, "");
}

Deno.test({
	name: "Requests a connection from the parent studio when created",
	async fn() {
		await basicTest({
			async fn({requestConnectionSpy}) {
				new InspectorManager();
				assertSpyCalls(requestConnectionSpy, 1);
				const discoveryManager = assertLastDiscoveryManager();
				assertStrictEquals(requestConnectionSpy.calls[0].args[0], discoveryManager);
			},
		});
	},
});

Deno.test({
	name: "Fails when another inspector tries to connect",
	async fn() {
		await basicTest({
			async fn({fakeTime}) {
				new InspectorManager();

				const consoleErrorSpy = stub(console, "error", () => {});

				try {
					createConnection({clientType: "inspector"});

					assertSpyCalls(consoleErrorSpy, 1);
					const error = consoleErrorSpy.calls[0].args[0];
					assertInstanceOf(error, Error);
					assert(error.message.includes("An inspector is not able to connect to another inspector."), "Expected error message to be correct.");
				} finally {
					consoleErrorSpy.restore();
				}
			},
		});
	},
});

Deno.test({
	name: "Fails when an unknown client type tries to connect",
	async fn() {
		await basicTest({
			async fn({fakeTime}) {
				new InspectorManager();

				const consoleErrorSpy = stub(console, "error", () => {});

				try {
					createConnection({
						clientType: /** @type {any} */ ("unknown type"),
					});

					assertSpyCalls(consoleErrorSpy, 1);
					const error = consoleErrorSpy.calls[0].args[0];
					assertInstanceOf(error, Error);
					assert(error.message.includes('Unexpected client type: "unknown type".'), "Expected error message to be correct.");
				} finally {
					consoleErrorSpy.restore();
				}
			},
		});
	},
});

Deno.test({
	name: "raceAllConnections() returns the default when there is no connection after a while",
	async fn() {
		await basicTest({
			async fn({fakeTime}) {
				const manager = new InspectorManager();
				const promise = manager.raceAllConnections({
					defaultReturnValue: "default",
					async cb() {
						return "not the default";
					},
				});
				const assertResolvedPromise1 = assertPromiseResolved(promise, false);
				await fakeTime.nextAsync();
				await assertResolvedPromise1;

				await fakeTime.nextAsync();

				const assertResolvedPromise2 = assertPromiseResolved(promise, true);
				await fakeTime.nextAsync();
				await assertResolvedPromise2;

				assertEquals(await promise, "default");
			},
		});
	},
});

Deno.test({
	name: "Requests are passed to a connection once it connects",
	async fn() {
		await basicTest({
			async fn({fakeTime}) {
				const manager = new InspectorManager();
				const promise = manager.raceAllConnections({
					defaultReturnValue: "default",
					async cb() {
						return "not the default";
					},
				});
				const assertResolvedPromise1 = assertPromiseResolved(promise, false);
				await fakeTime.nextAsync();
				await assertResolvedPromise1;

				createConnection();

				const assertResolvedPromise2 = assertPromiseResolved(promise, true);
				await fakeTime.nextAsync();
				await assertResolvedPromise2;

				assertEquals(await promise, "not the default");
			},
		});
	},
});

Deno.test({
	name: "raceAllConnections() ommits results that are undefined",
	async fn() {
		await basicTest({
			async fn() {
				const manager = new InspectorManager();

				createConnection({connectionId: "1"});
				createConnection({connectionId: "2"});
				createConnection({connectionId: "3"});

				let callId = 0;
				const result = await manager.raceAllConnections({
					defaultReturnValue: "default",
					async cb() {
						callId++;
						if (callId == 2) return "call 2";
						if (callId == 3) return "call 3";
						return undefined;
					},
				});

				assertEquals(result, "call 2");
			},
		});
	},
});

Deno.test({
	name: "raceAllConnections() returns the result that finishes firs",
	async fn() {
		await basicTest({
			async fn({fakeTime}) {
				const manager = new InspectorManager();

				createConnection({connectionId: "1"});
				createConnection({connectionId: "2"});
				createConnection({connectionId: "3"});

				/** @type {(value: string) => void} */
				let resolvecCall2 = () => {};
				/** @type {(value: string) => void} */
				let resolvecCall3 = () => {};

				let callId = 0;
				const promise = manager.raceAllConnections({
					defaultReturnValue: "default",
					cb() {
						callId++;
						if (callId == 1) {
							// Never resolves
							return new Promise(() => {});
						}
						if (callId == 2) {
							const promise = new Promise(resolve => {
								resolvecCall2 = resolve;
							});
							return promise;
						}
						if (callId == 3) {
							const promise = new Promise(resolve => {
								resolvecCall3 = resolve;
							});
							return promise;
						}
						throw new AssertionError("callback was fired too many times");
					},
				});
				await fakeTime.nextAsync();
				resolvecCall3("call 3");
				resolvecCall2("call 2");

				assertEquals(await promise, "call 3");
			},
		});
	},
});
