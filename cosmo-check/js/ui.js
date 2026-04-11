(function() {
  "use strict";

  function clearNode(node) {
    if (!node) {
      return;
    }
    while (node.firstChild) {
      node.removeChild(node.firstChild);
    }
  }

  function appendChildren(node, children) {
    if (!node || !Array.isArray(children)) {
      return;
    }

    children.forEach((child) => {
      if (child === null || child === undefined || child === false) {
        return;
      }
      if (child instanceof Node) {
        node.appendChild(child);
        return;
      }
      node.appendChild(document.createTextNode(String(child)));
    });
  }

  function createElement(tagName, options) {
    const config = options && typeof options === "object" ? options : {};
    const element = document.createElement(tagName);

    if (config.className) {
      element.className = config.className;
    }
    if (config.text !== undefined) {
      element.textContent = String(config.text);
    }
    if (config.type && "type" in element) {
      element.type = config.type;
    }
    if (config.hidden !== undefined) {
      element.hidden = Boolean(config.hidden);
    }
    if (config.attrs && typeof config.attrs === "object") {
      Object.entries(config.attrs).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          element.setAttribute(key, String(value));
        }
      });
    }
    if (config.dataset && typeof config.dataset === "object") {
      Object.entries(config.dataset).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          element.dataset[key] = String(value);
        }
      });
    }
    if (config.children) {
      appendChildren(element, config.children);
    }

    return element;
  }

  function createTextBlock(tagName, className, text) {
    return createElement(tagName, {
      className,
      text
    });
  }

  function showLoading(text) {
    const overlay = document.getElementById("progressOverlay");
    const copyNode = document.getElementById("progressCopy");
    const titleNode = document.getElementById("progressTitle");

    if (copyNode) {
      const normalized = typeof text === "string" ? text.trim() : "";
      if (!copyNode.dataset.defaultText) {
        copyNode.dataset.defaultText = copyNode.textContent || "";
      }
      copyNode.textContent = normalized || copyNode.dataset.defaultText;
    }

    if (overlay) {
      overlay.hidden = false;
      overlay.setAttribute("aria-busy", "true");
    }
    if (titleNode) {
      titleNode.setAttribute("aria-live", "polite");
    }
  }

  function hideLoading() {
    const overlay = document.getElementById("progressOverlay");
    if (overlay) {
      overlay.hidden = true;
      overlay.removeAttribute("aria-busy");
    }
  }

  window.CosmoUI = {
    clearNode,
    appendChildren,
    createElement,
    createTextBlock,
    showLoading,
    hideLoading
  };
})();
