
import type { Root, Element as HastElement, Text as HastText } from "hast";
import type { Plugin as UnifiedPlugin } from "unified";

import { replace } from "../../../../support/unist/unist-util-replace.js";

/**
 * UnifiedPlugin to add PlantUML Confluence macro
 */
const rehypeAddPlantumlMacro: UnifiedPlugin<[], Root> =
  function rehypeAddPlantumlMacro() {
    return function transformer(tree) {
        replace(tree, { type: "element", tagName: "pre" }, (node) => {
        const umlElement = node.children.find(
          (child) =>
            child.type === "element" &&
            (child as HastElement).tagName === "code" &&
            extractLanguage(child)?.includes("plantuml")
        ) as HastElement | undefined;

        if (!umlElement) {
            // If there's no uml, return the pre element unchanged
            return node;
        }

        // Extract the uml content from the code element
        const umlContent = extractTextContent(umlElement);

        // Build the Confluence code macro
        const macroChildren: HastElement[] = [];

        // Add the uml content
        // Note: We use a text node with the raw CDATA markup
        // The rehypeStringify with allowDangerousHtml will preserve it
        macroChildren.push({
            type: "element" as const,
            tagName: "ac:parameter",
            properties: {
                "ac:name": "atlassian-macro-output-type"
            },
            children: [
            {
                type: "text" as const,
                value: `INLINE`,
            },
            ],
        });
        macroChildren.push({
            type: "element" as const,
            tagName: "ac:plain-text-body",
            properties: {},
            children: [
            {
                type: "raw" as const,
                value: `<![CDATA[${umlContent}]]>`,
            },
            ],
        });

        return {
            type: "element" as const,
            tagName: "ac:structured-macro",
            properties: {
            "ac:name": "plantuml",
            },
            children: macroChildren,
        };
        });    
    };
  };

function extractTextContent(element: HastElement): string {
  let text = "";

  for (const child of element.children) {
    if (child.type === "text") {
      text += (child as HastText).value;
    } else if (child.type === "element") {
      text += extractTextContent(child as HastElement);
    }
  }

  return text;
}

function extractLanguage(codeElement: HastElement): string | undefined {
  const className = codeElement.properties?.className;

  if (!className) {
    return undefined;
  }

  // className is always an array of strings, but we check it for safety
  // istanbul ignore next
  const classNames = Array.isArray(className) ? className : [className];

  // Look for a class that starts with "language-"
  for (const cls of classNames) {
    if (typeof cls === "string" && cls.startsWith("language-")) {
      return cls.substring(9); // Remove "language-" prefix
    }
  }

  return undefined;
}

export default rehypeAddPlantumlMacro;
