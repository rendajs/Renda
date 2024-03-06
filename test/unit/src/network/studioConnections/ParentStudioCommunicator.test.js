import { FakeTime } from "std/testing/time.ts";
import { assertSpyCall, assertSpyCalls, mockSessionAsync, spy, stub } from "std/testing/mock.ts";
import { TypedMessenger } from "../../../../../src/mod.js";
import { ParentStudioCommunicator } from "../../../../../src/network/studioConnections/ParentStudioCommunicator.js";
import { assertEquals, assertRejects, assertStrictEquals } from "std/testing/asserts.ts";

/**
 * Creates a mocked parent window that simulates a studio instance.
 * @param {object} options
 * @param {() => Promise<void>} options.fn The test function to run
 * @param {boolean} [options.emulateStudioParent] Emulates a parent window.
 * @param {boolean} [options.emulateParentResponse] When `emulateStudioParent` is true, also emulates "requestInternalDiscoveryUrl" messages.
 */
async function basicSetup({
	fn,
	emulateStudioParent = true,
	emulateParentResponse = true,
}) {
	const previousParent = window.parent;
	const originalAddEventListener = window.addEventListener.bind(window);

	/** @type {Set<MessagePort>} */
	const createdMessagePorts = new Set();

	try {
		/** @typedef {(e: MessageEvent) => void} MessageEventListener */
		/** @type {Set<MessageEventListener>} */
		const parentMessageEventListeners = new Set();

		if (emulateStudioParent) {
			/** @type {TypedMessenger<import("../../../../../studio/src/windowManagement/contentWindows/ContentWindowBuildView/ContentWindowBuildView.js").BuildViewIframeResponseHandlers, {}>} */
			const parentTypedMessenger = new TypedMessenger();
			parentTypedMessenger.setResponseHandlers({
				async requestDesiredStudioConnectionMethod() {
					return {
						type: "renda:internal",
						clientUuid: "studio uuid",
						discoveryUrl: "discoveryUrl",
						internalConnectionToken: "token",
					};
				},
			});
			parentTypedMessenger.setSendHandler((data) => {
				parentMessageEventListeners.forEach((listener) => {
					const event = /** @type {MessageEvent} */ ({
						data: data.sendData,
						source: window.parent,
					});
					listener(event);
				});
			});

			window.parent = /** @type {Window} */ ({
				postMessage(message) {
					if (emulateParentResponse) {
						parentTypedMessenger.handleReceivedMessage(message);
					}
				},
			});
		} else {
			window.parent = window;
		}

		await mockSessionAsync(async () => {
			stub(window, "addEventListener", (...args) => {
				const [type, listener] = args;
				const castType = /** @type {string} */ (type);
				if (type == "message") {
					parentMessageEventListeners.add(listener);
				} else if (castType == "unload") {
					// The Deno test runner fires the unload event after the test is done
					// ideally we'd write a test for this case but instead I'll just ignore this for now.
				} else {
					originalAddEventListener(...args);
				}
			});

			await fn();
		})();
	} finally {
		window.parent = previousParent;

		createdMessagePorts.forEach((p) => p.close());
	}
}

function createMockDiscoveryManager() {
	class MockDiscoveryManager {
		addDiscoveryMethod() {}
		requestConnection() {}
		waitForConnection() {
			return {
				id: "connection id",
			};
		}
	}

	const mockDiscoveryManager = new MockDiscoveryManager();
	const discoveryManager = /** @type {import("../../../../../src/network/studioConnections/DiscoveryManager.js").DiscoveryManager} */ (/** @type {unknown} */ (mockDiscoveryManager));

	class MockDiscoveryMethod {
		static type = "renda:internal";
	}
	const InternalDiscoveryMethod = /** @type {typeof import("../../../../../src/network/studioConnections/discoveryMethods/InternalDiscoveryMethod.js").InternalDiscoveryMethod} */ (/** @type {unknown} */ (MockDiscoveryMethod));

	const addDiscoveryMethodSpy = spy(discoveryManager, "addDiscoveryMethod");
	const waitForConnectionSpy = spy(discoveryManager, "waitForConnection");
	const requestConnectionSpy = spy(discoveryManager, "requestConnection");
	return { mockDiscoveryManager, discoveryManager, addDiscoveryMethodSpy, waitForConnectionSpy, requestConnectionSpy, MockDiscoveryMethod, InternalDiscoveryMethod };
}

Deno.test({
	name: "not inside an iframe",
	async fn() {
		await basicSetup({
			emulateStudioParent: false,
			async fn() {
				const communicator = new ParentStudioCommunicator();
				const { discoveryManager } = createMockDiscoveryManager();

				await assertRejects(async () => {
					await communicator.requestDesiredParentStudioConnection(discoveryManager, []);
				}, Error, "Failed to get parent client data. requestDesiredParentStudioConnection() only works when called on a page that was created by Renda Studio. If this is not the case, use requestConnection() to connect to the specific client you wish to connect to.");
			},
		});
	},
});

Deno.test({
	name: "parent doesn't respond in time",
	async fn() {
		await basicSetup({
			emulateStudioParent: true,
			emulateParentResponse: false,
			async fn() {
				const communicator = new ParentStudioCommunicator();
				const { discoveryManager } = createMockDiscoveryManager();
				const time = new FakeTime();

				try {
					const assertionPromise = assertRejects(async () => {
						await communicator.requestDesiredParentStudioConnection(discoveryManager, []);
					}, Error, "Failed to get parent client data. The parent didn't respond with client data in a timely manner. requestDesiredParentStudioConnection() only works when called on a page that was created by Renda Studio. If this is not the case, use requestConnection() to connect to the specific client you wish to connect to.");
					await time.nextAsync();
					await assertionPromise;
				} finally {
					time.restore();
				}
			},
		});
	},
});

Deno.test({
	name: "parent responds with internal connection data",
	async fn() {
		await basicSetup({
			async fn() {
				const communicator = new ParentStudioCommunicator();
				const { discoveryManager, InternalDiscoveryMethod, addDiscoveryMethodSpy, waitForConnectionSpy, requestConnectionSpy } = createMockDiscoveryManager();

				await communicator.requestDesiredParentStudioConnection(discoveryManager, [InternalDiscoveryMethod]);

				assertSpyCalls(addDiscoveryMethodSpy, 1);
				assertStrictEquals(addDiscoveryMethodSpy.calls[0].args[0], InternalDiscoveryMethod);
				assertEquals(addDiscoveryMethodSpy.calls[0].args[1], "discoveryUrl");
				assertSpyCalls(waitForConnectionSpy, 1);
				assertSpyCall(waitForConnectionSpy, 0, {
					args: [
						{
							clientUuid: "studio uuid",
						},
					],
				});
				assertSpyCalls(requestConnectionSpy, 1);
				assertSpyCall(requestConnectionSpy, 0, {
					args: [
						"connection id",
						{ token: "token" },
					],
				});
			},
		});
	},
});

Deno.test({
	name: "Throws when the correct discovery method is not provided",
	async fn() {
		await basicSetup({
			async fn() {
				const communicator = new ParentStudioCommunicator();
				const { discoveryManager } = createMockDiscoveryManager();

				await assertRejects(async () => {
					await communicator.requestDesiredParentStudioConnection(discoveryManager, []);
				}, Error, 'The parent requested a discovery method of type "renda:internal", but no constructor with this type was provided.');
			},
		});
	},
});
