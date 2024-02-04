// @ts-ignore
import mainSheet from "./studio.css" assert {type: "css"};
// @ts-ignore
import zIndex from "./zIndex.css" assert {type: "css"};
// @ts-ignore
import windowManagement from "../windowManagement/windowManagement.css" assert {type: "css"};
// @ts-ignore
import contentWindowAbout from "../windowManagement/contentWindows/ContentWindowAbout.css" assert {type: "css"};
// @ts-ignore
import popoverMenus from "../ui/popoverMenus/popoverMenus.css" assert {type: "css"};
// @ts-ignore
import guis from "../ui/guis.css" assert {type: "css"};
// @ts-ignore
import spinner from "../ui/spinner.css" assert {type: "css"};
// @ts-ignore
import treeView from "../ui/treeView.css" assert {type: "css"};

document.adoptedStyleSheets = [
	...document.adoptedStyleSheets,
	mainSheet,
	zIndex,
	windowManagement,
	contentWindowAbout,
	popoverMenus,
	guis,
	spinner,
	treeView,
];
