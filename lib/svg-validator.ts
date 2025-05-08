import { DOMParser } from "@xmldom/xmldom"

/**
 * Result of SVG validation
 */
interface SVGValidationResult {
  isValid: boolean
  sanitized?: string
  error?: string
}

/**
 * SVG validation options
 */
interface SVGValidationOptions {
  maxSize?: number // in bytes
  allowExternalResources?: boolean
  allowScripts?: boolean // generally should be false
}

/**
 * Default validation options
 */
const DEFAULT_OPTIONS: SVGValidationOptions = {
  maxSize: 5 * 1024 * 1024, // 5MB
  allowExternalResources: false,
  allowScripts: false,
}

/**
 * List of potentially dangerous elements
 */
const DANGEROUS_ELEMENTS = ["script", "iframe", "object", "embed", "foreignObject"]

/**
 * List of potentially dangerous attributes
 */
const DANGEROUS_ATTRIBUTES = [
  "onload",
  "onerror",
  "onmouseover",
  "onmouseout",
  "onmousemove",
  "onclick",
  "onmousedown",
  "onmouseup",
  "onkeydown",
  "onkeypress",
  "onkeyup",
  "eval",
  "javascript",
]

/**
 * Check if an SVG is well-formed and safe for use
 * @param svgContent SVG content as string
 * @param options Validation options
 * @returns Validation result with sanitized SVG if valid
 */
export function validateAndSanitizeSVG(
  svgContent: string,
  options: SVGValidationOptions = DEFAULT_OPTIONS,
): SVGValidationResult {
  // Check file size
  const byteSize = new Blob([svgContent]).size
  if (options.maxSize && byteSize > options.maxSize) {
    return {
      isValid: false,
      error: `SVG file is too large (${formatFileSize(byteSize)}). Maximum size is ${formatFileSize(options.maxSize)}.`,
    }
  }

  try {
    // Parse SVG as XML
    const parser = new DOMParser()
    const doc = parser.parseFromString(svgContent, "image/svg+xml")

    // Check for parsing errors
    const parseError = doc.getElementsByTagName("parsererror")
    if (parseError.length > 0) {
      return {
        isValid: false,
        error: "SVG is not well-formed XML. Please check the file format.",
      }
    }

    // Check if root element is SVG
    const rootElement = doc.documentElement
    if (rootElement.tagName.toLowerCase() !== "svg") {
      return {
        isValid: false,
        error: "The file does not have an SVG root element.",
      }
    }

    // Check for dangerous elements
    for (const element of DANGEROUS_ELEMENTS) {
      const elements = doc.getElementsByTagName(element)
      if (elements.length > 0 && (!options.allowScripts || element !== "script")) {
        return {
          isValid: false,
          error: `SVG contains potentially dangerous <${element}> elements. These are not allowed for security reasons.`,
        }
      }
    }

    // Check for dangerous attributes (event handlers, etc.)
    const allElements = getAllElements(doc)
    const dangerousAttributes: string[] = []

    for (const element of allElements) {
      if (element.attributes) {
        for (let i = 0; i < element.attributes.length; i++) {
          const attr = element.attributes[i]
          const attrName = attr.name.toLowerCase()
          const attrValue = attr.value.toLowerCase()

          // Check for event handlers (on*)
          if (
            attrName.startsWith("on") ||
            DANGEROUS_ATTRIBUTES.some((dangAttr) => attrName.includes(dangAttr)) ||
            DANGEROUS_ATTRIBUTES.some((dangAttr) => attrValue.includes(dangAttr))
          ) {
            dangerousAttributes.push(attrName)
          }

          // Check for external resources if not allowed
          if (
            !options.allowExternalResources &&
            (attrName === "href" || attrName === "xlink:href" || attrName === "src") &&
            (attrValue.startsWith("http:") ||
              attrValue.startsWith("https:") ||
              attrValue.startsWith("//") ||
              attrValue.startsWith("data:"))
          ) {
            return {
              isValid: false,
              error: `SVG contains external resources (${attrName}="${attr.value}"). External resources are not allowed for security reasons.`,
            }
          }
        }
      }
    }

    if (dangerousAttributes.length > 0) {
      return {
        isValid: false,
        error: `SVG contains potentially dangerous attributes: ${dangerousAttributes.join(
          ", ",
        )}. These are not allowed for security reasons.`,
      }
    }

    // If we get here, the SVG is valid according to our criteria
    // For additional security, we could sanitize the SVG here if needed
    // For now, we'll return the original as it passed all our checks
    return {
      isValid: true,
      sanitized: svgContent,
    }
  } catch (error) {
    console.error("Error validating SVG:", error)
    return {
      isValid: false,
      error: error instanceof Error ? error.message : "Unknown error validating SVG",
    }
  }
}

/**
 * Gets all elements in a document
 */
function getAllElements(doc: Document): Element[] {
  const elements: Element[] = []
  const traverse = (node: Node) => {
    if (node.nodeType === 1) {
      // Element node
      elements.push(node as Element)
    }
    if (node.childNodes) {
      for (let i = 0; i < node.childNodes.length; i++) {
        traverse(node.childNodes[i])
      }
    }
  }
  traverse(doc.documentElement)
  return elements
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B"
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
  return (bytes / (1024 * 1024)).toFixed(1) + " MB"
}
