import {getMockArgs} from "../shared.js";
import {ContentWindowBuildView} from "../../../../../../../studio/src/windowManagement/contentWindows/ContentWindowBuildView/ContentWindowBuildView.js";
import {runWithDomAsync} from "../../../../shared/runWithDom.js";
import {GestureInProgressManager} from "../../../../../../../studio/src/misc/GestureInProgressManager.js";
import {TypedMessenger} from "../../../../../../../src/util/TypedMessenger.js";
import {assertEquals} from "std/testing/asserts.ts";

/**
 * @param {ContentWindowBuildView} buildview
 */
function installIframeContentWindow(buildview) {
	const iframeEl = buildview.iframeEl;

	/**
	 * @type {TypedMessenger<{}, import("../../../../../../../studio/src/windowManagement/contentWindows/ContentWindowBuildView/ContentWindowBuildView.js").BuildViewIframeResponseHandlers>}
	 */
	const iframeWindowMessenger = new TypedMessenger();

	const iframeContentWindow = /** @type {Window} */ ({
		postMessage(data) {
			iframeWindowMessenger.handleReceivedMessage(data);
		},
	});

	// @ts-ignore
	iframeEl.contentWindow = iframeContentWindow;

	iframeWindowMessenger.setSendHandler(data => {
		const event = /** @type {MessageEvent} */ ({
			data: data.sendData,
			source: iframeContentWindow,
		});
		// dispatchEvent() doesn't work because of https://github.com/denoland/deno/issues/17321
		// window.dispatchEvent(event);
		buildview.onIframeMessage(event);
	});

	return {iframeWindowMessenger};
}

Deno.test({
	name: "requestDesiredStudioConnectionMethod()",
	async fn() {
		await runWithDomAsync(async () => {
			const oldLocation = window.location;
			window.location = /** @type {Location} */ ({
				href: "https://example.com",
			});

			try {
				const {args, mockStudioInstance} = getMockArgs();
				mockStudioInstance.gestureInProgressManager = new GestureInProgressManager();
				mockStudioInstance.studioConnectionsManager = /** @type {import("../../../../../../../studio/src/network/studioConnections/StudioConnectionsManager.js").StudioConnectionsManager} */ ({
					getInternalClientId() {
						return Promise.resolve("the_client_id");
					},
					createInternalConnectionToken() {
						return "the_token";
					},
				});

				const contentWindow = new ContentWindowBuildView(...args);
				const {iframeWindowMessenger} = installIframeContentWindow(contentWindow);

				const result = await iframeWindowMessenger.send.requestDesiredStudioConnectionMethod();
				assertEquals(result, {
					type: "renda:internal",
					discoveryUrl: "https://example.com/internalDiscovery",
					clientId: "the_client_id",
					internalConnectionToken: "the_token",
				});
			} finally {
				window.location = oldLocation;
			}
		});
	},
});
