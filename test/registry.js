import * as assert from 'assert';
import { createTag } from '../htmltag.js';
import { TreeBuilder } from '../extras.js';

const registry = new Map();

function register(props) {
  Object.keys(props).forEach(key => registry.set(key, props[key]));
}

class Actions extends TreeBuilder {
  createElement(tag) {
    return { tag: registry.get(tag) || tag, attributes: {}, children: [] };
  }
}

const html = createTag(new Actions());

{
  const Custom = function Custom() {};
  register({ Custom });

  let result = html`
    <Custom id='foo' className='cls' />
  `;

  assert.deepStrictEqual(result.tag, Custom);
}
