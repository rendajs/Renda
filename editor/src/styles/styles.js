// @ts-ignore
import mainSheet from "./styles.css" assert {type: "css"};
// @ts-ignore
import variables from "./variables.css" assert {type: "css"};
// @ts-ignore
import zIndex from "./zIndex.css" assert {type: "css"};

document.adoptedStyleSheets = [
	mainSheet, variables, zIndex,
];
