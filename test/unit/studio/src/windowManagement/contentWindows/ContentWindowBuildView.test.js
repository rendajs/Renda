import {getMockArgs} from "./shared.js";
import {ContentWindowBuildView} from "../../../../../../studio/src/windowManagement/contentWindows/ContentWindowBuildView/ContentWindowBuildView.js";
import {runWithDom} from "../../../shared/runWithDom.js";
import {GestureInProgressManager} from "../../../../../../studio/src/misc/GestureInProgressManager.js";
import {TypedMessenger} from "../../../../../../src/util/TypedMessenger.js";
import {assertEquals} from "std/testing/asserts.ts";

Deno.test({
	name: "requestInternalDiscoveryUrl()",
	async fn() {
		await runWithDom(async () => {
			const oldLocation = window.location;
			window.location = /** @type {Location} */ ({
				href: "https://example.com",
			});

			try {
				const {args, mockStudioInstance} = getMockArgs();
				mockStudioInstance.gestureInProgressManager = new GestureInProgressManager();

				/**
				 * @type {TypedMessenger<import("../../../../../../studio/src/windowManagement/contentWindows/ContentWindowBuildView/ContentWindowBuildView.js").BuildViewIframeResponseHandlers, {}>}
				 */
				const iframeWindowMessenger = new TypedMessenger();

				const iframeContentWindow = /** @type {Window} */ ({
					postMessage(data) {
						iframeWindowMessenger.handleReceivedMessage(data);
					},
				});

				const contentWindow = new ContentWindowBuildView(...args);
				const iframeEl = contentWindow.iframeEl;
				// @ts-ignore
				iframeEl.contentWindow = iframeContentWindow;

				iframeWindowMessenger.setSendHandler(data => {
					const event = /** @type {MessageEvent} */ ({
						data: data.sendData,
						source: iframeContentWindow,
					});
					// dispatchEvent() doesn't work because of https://github.com/denoland/deno/issues/17321
					// window.dispatchEvent(event);
					contentWindow.onIframeMessage(event);
				});

				const result = await iframeWindowMessenger.send.requestInternalDiscoveryUrl();
				assertEquals(result, "https://example.com/internalDiscovery");
			} finally {
				window.location = oldLocation;
			}
		});
	},
});
