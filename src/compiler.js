'use strict';

const Scanner = require('./scanner');
const selfClosing = require('./self-closing');

function createCompiler(createElement, options = {}) {
  return function htmlCompiler(literals, ...values) {
    let scanner = new Scanner();
    for (let i = 0; i < literals.length; i++) {
      scanner.readChunk(literals[i]);
      if (i < values.length) {
        scanner.pushValue(values[i]);
      }
    }
    return compile(scanner.tokens, createElement, options);
  };
}

function trimWhitespaceNodes(nodes) {
  let a = 0;
  let b = nodes.length;
  let ws = n => typeof n === 'string' && n.trim().length === 0;

  for (; a < b && ws(nodes[a]); ++a);
  for (; a < b - 1 && ws(nodes[b - 1]); --b);

  return a === b ? nodes : nodes.slice(a, b);
}

function compile(parts, createElement, options) {
  let root = { type: null, props: {}, children: [] };
  let hasElement = false;
  let stack = [root];
  let index = 0;
  let type;

  function peek() {
    return index < parts.length ? parts[index][0] : '';
  }

  function read() {
    return index < parts.length ? parts[index++][1] : undefined;
  }

  function pop() {
    if (stack.length > 1) {
      let node = stack.pop();
      let element = createElement(node.type, node.props, node.children);
      stack[stack.length - 1].children.push(element);
      hasElement = true;
    }
  }

  while ((type = peek())) {
    let node = stack[stack.length - 1];

    if (type === 'tag-start') {
      let value = read();
      if (value[0] === '/') {
        // Closing tag
        pop();
      } else {
        // Open tag
        stack.push({ type: value, props: {}, children: [] });
      }
    } else if (type === 'attr-key') {
      let value = read();
      if (Object(value) === value) {
        Object.keys(value).forEach(key => {
          if (!node.props[key]) {
            node.props[key] = value[key];
          }
        });
      } else {
        let propKey = value;
        let propValue = '';
        let hasValue = false;
        while (peek() === 'attr-value') {
          value = read();
          propValue = hasValue ? String(propValue) + value : value;
          hasValue = true;
        }
        if (!hasValue) {
          type = peek();
          if (type === 'tag-end' || type === 'attr-key') {
            propValue = true;
          }
        }
        if (propKey) {
          node.props[propKey] = propValue;
        }
      }
    } else if (type === 'tag-end') {
      if (read() === '/' || selfClosing(node.type)) {
        pop();
      }
    } else if (type === 'text') {
      node.children.push(read());
    } else {
      throw new Error(`Unexpected token ${ type }`);
    }
  }

  let children = trimWhitespaceNodes(root.children);
  if (hasElement && children.length === 1) {
    return children[0];
  }
  if (options.createFragment) {
    return options.createFragment(children);
  }
  throw new Error('HTML template must have exactly one root element');
}

module.exports = createCompiler;
