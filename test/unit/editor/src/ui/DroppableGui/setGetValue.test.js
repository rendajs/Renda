import {assertEquals, assertStrictEquals} from "asserts";
import {installFakeDocument, uninstallFakeDocument} from "fake-dom/FakeDocument.js";
import {BASIC_ASSET_UUID, DEFAULTASSETLINK_LINK_UUID, createBasicGui} from "./shared.js";

Deno.test({
	name: "setValue() to null",
	fn() {
		installFakeDocument();
		const {gui} = createBasicGui();

		gui.setValue(null);

		assertEquals(gui.projectAssetValue, null);
		assertEquals(gui.defaultAssetLink, null);
		assertEquals(gui.defaultAssetLinkUuid, null);

		uninstallFakeDocument();
	},
});

Deno.test({
	name: "setValue() with an uuid",
	fn() {
		installFakeDocument();
		const {gui, mockProjectAsset} = createBasicGui();

		gui.setValue(BASIC_ASSET_UUID);

		assertStrictEquals(gui.projectAssetValue, mockProjectAsset);
		assertEquals(gui.defaultAssetLink, null);
		assertEquals(gui.defaultAssetLinkUuid, null);

		uninstallFakeDocument();
	},
});

Deno.test({
	name: "setValue() with an assetlink uuid",
	fn() {
		installFakeDocument();
		const {gui, mockProjectAsset, mockDefaultAssetLink} = createBasicGui();

		gui.setValue(DEFAULTASSETLINK_LINK_UUID);

		assertStrictEquals(gui.projectAssetValue, mockProjectAsset);
		assertStrictEquals(gui.defaultAssetLink, mockDefaultAssetLink);
		assertEquals(gui.defaultAssetLinkUuid, DEFAULTASSETLINK_LINK_UUID);

		uninstallFakeDocument();
	},
});

Deno.test({
	name: "setValue() using a ProjectAsset",
	fn() {
		installFakeDocument();
		const {gui, mockProjectAsset} = createBasicGui();

		gui.setValue(mockProjectAsset);

		assertStrictEquals(gui.projectAssetValue, mockProjectAsset);
		assertEquals(gui.defaultAssetLink, null);
		assertEquals(gui.defaultAssetLinkUuid, null);

		uninstallFakeDocument();
	},
});

Deno.test({
	name: "setValue() using a live asset",
	fn() {
		installFakeDocument();
		const {gui, mockLiveAsset, mockProjectAsset} = createBasicGui();

		gui.setValue(mockLiveAsset);

		assertStrictEquals(gui.projectAssetValue, mockProjectAsset);
		assertEquals(gui.defaultAssetLink, null);
		assertEquals(gui.defaultAssetLinkUuid, null);

		uninstallFakeDocument();
	},
});

Deno.test({
	name: "getValue() without parameters",
	fn() {
		installFakeDocument();
		const {gui} = createBasicGui();

		const result = gui.getValue();

		assertEquals(result, BASIC_ASSET_UUID);

		uninstallFakeDocument();
	},
});

Deno.test({
	name: "getValue() without parameters and no value set",
	fn() {
		installFakeDocument();
		const {gui} = createBasicGui({valueType: "none"});

		const result = gui.getValue();

		assertEquals(result, null);

		uninstallFakeDocument();
	},
});

Deno.test({
	name: "getValue() without parameters and asset link",
	fn() {
		installFakeDocument();
		const {gui} = createBasicGui({valueType: "defaultAssetLink"});

		const result = gui.getValue();

		assertEquals(result, DEFAULTASSETLINK_LINK_UUID);

		uninstallFakeDocument();
	},
});

Deno.test({
	name: "getValue() with asset link and resolveDefaultAssetLinks = true",
	fn() {
		installFakeDocument();
		const {gui} = createBasicGui({valueType: "defaultAssetLink"});

		const result = gui.getValue({resolveDefaultAssetLinks: true});

		assertEquals(result, BASIC_ASSET_UUID);

		uninstallFakeDocument();
	},
});

Deno.test({
	name: "getValue() with returnLiveAsset = true",
	fn() {
		installFakeDocument();
		const {gui, mockLiveAsset} = createBasicGui({
			needsLiveAssetPreload: false,
		});

		const result = gui.getValue({returnLiveAsset: true});

		assertStrictEquals(result, mockLiveAsset);

		uninstallFakeDocument();
	},
});

Deno.test({
	name: "getValue() with returnLiveAsset = true and no value set",
	fn() {
		installFakeDocument();
		const {gui} = createBasicGui({valueType: "none"});

		const result = gui.getValue({returnLiveAsset: true});

		assertEquals(result, null);

		uninstallFakeDocument();
	},
});

Deno.test({
	name: "getValue() with purpose 'fileStorage'",
	fn() {
		installFakeDocument();
		const {gui} = createBasicGui();

		const result = gui.getValue({purpose: "fileStorage"});

		assertEquals(result, BASIC_ASSET_UUID);

		uninstallFakeDocument();
	},
});

Deno.test({
	name: "getValue() with purpose 'binaryComposer'",
	fn() {
		installFakeDocument();
		const {gui} = createBasicGui();

		const result = gui.getValue({purpose: "binaryComposer"});

		assertEquals(result, BASIC_ASSET_UUID);

		uninstallFakeDocument();
	},
});

Deno.test({
	name: "getValue() with purpose 'script'",
	fn() {
		installFakeDocument();
		const {gui, mockLiveAsset} = createBasicGui({
			needsLiveAssetPreload: false,
		});

		const result = gui.getValue({purpose: "script"});

		assertStrictEquals(result, mockLiveAsset);

		uninstallFakeDocument();
	},
});

Deno.test({
	name: "getValue() with no parameters and an embedded asset",
	fn() {
		installFakeDocument();
		const {gui} = createBasicGui({
			valueType: "embedded",
		});

		const result = gui.getValue();

		assertEquals(result, {
			num: 42,
			str: "foo",
		});

		uninstallFakeDocument();
	},
});
