// @ts-ignore
import mainSheet from "./studio.css" with {type: "css"};
// @ts-ignore
import zIndex from "./zIndex.css" with {type: "css"};
// @ts-ignore
import windowManagement from "../windowManagement/windowManagement.css" with {type: "css"};
// @ts-ignore
import contentWindowAbout from "../windowManagement/contentWindows/ContentWindowAbout.css" with {type: "css"};
// @ts-ignore
import popoverMenus from "../ui/popoverMenus/popoverMenus.css" with {type: "css"};
// @ts-ignore
import guis from "../ui/guis.css" with {type: "css"};
// @ts-ignore
import spinner from "../ui/spinner.css" with {type: "css"};
// @ts-ignore
import treeView from "../ui/treeView.css" with {type: "css"};

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
