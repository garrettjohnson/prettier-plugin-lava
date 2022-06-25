import { expect } from 'chai';
import { lavaHtmlGrammar } from '~/parser/grammar';

describe('Unit: lavaHtmlGrammar', () => {
  it('should succeed at parsing valid HTML+Lava', () => {
    expectMatchSucceeded('<h6 data-src="hello world">').to.be.true;
    expectMatchSucceeded('<a src="https://product"></a>').to.be.true;
    expectMatchSucceeded('<a src="https://google.com"></b>').to.be.true;
    expectMatchSucceeded(`<img src="hello" loading='lazy' enabled=true disabled>`).to.be.true;
    expectMatchSucceeded(`<img src="hello" loading='lazy' enabled=true disabled />`).to.be.true;
    expectMatchSucceeded(`{{ product.feature }}`).to.be.true;
    expectMatchSucceeded(`{{product.feature}}`).to.be.true;
    expectMatchSucceeded(`{%- if A -%}`).to.be.true;
    expectMatchSucceeded(`{%-if A-%}`).to.be.true;
    expectMatchSucceeded(`
      <html>
        <head>
          {{ 'foo' | script_tag }}
        </head>
        <body>
          {% if true %}
            <div>
              hello world
            </div>
          {% else %}
            nope
          {% endif %}
        </body>
      </html>
    `).to.be.true;
    expectMatchSucceeded('<img {% if aboveFold %} loading="lazy"{% endif %} />').to.be.true;
    expectMatchSucceeded('<svg><use></svg>').to.be.true;
  });

  it('should fail at parsing invalid HTML+Lava', () => {
    // Not valid HTML tag
    expectMatchSucceeded('<6h>').to.be.false;
  });

  function expectMatchSucceeded(text: string) {
    return expect(lavaHtmlGrammar.match(text).succeeded());
  }
});
