import { $, $$ } from '../../../../lib/dom.js';

export function getNode(selector, root = document) {
  return root === document ? $(selector) : root.querySelector(selector);
}

export function getNodes(selector, root = document) {
  return root === document ? $$(selector) : Array.from(root.querySelectorAll(selector));
}
