import { expect } from 'chai';
import { deepGet } from '~/utils';
import { NodeTypes } from '~/types';
import { toLavaHtmlAST } from '~/parser';
import { preprocess } from '~/printer/print-preprocess';
import { DocumentNode, LavaHtmlNode, LavaParserOptions } from '~/types';

describe('Module: augmentWithWhitespaceHelpers', () => {
  let ast: DocumentNode;

  describe('Unit: isLeadingWhitespaceSensitive', () => {
    it('should return true when this node and the prev imply an inline formatting context', () => {
      const nodes = ['<span>hello</span>', '{{ drop }}', '{% if true %}hello{% endif %}'];

      for (const left of nodes) {
        for (const right of nodes) {
          ast = toAugmentedAst(`<p>${left} ${right}</p>`);
          expectPath(ast, 'children.0.children.1.isLeadingWhitespaceSensitive', `${left} ${right}`)
            .to.be.true;
        }
      }
    });

    it('should return false when this node is whitespace stripping to the left', () => {
      const firstChilds = ['hello', '{{ drop }}', '{% if true %}hello{% endif %}'];
      const secondChilds = ['{{- drop }}', '{%- echo "world" %}', '{%- if true %}hello{% endif %}'];
      for (const left of firstChilds) {
        for (const right of secondChilds) {
          ast = toAugmentedAst(`<p>${left} ${right}</p>`);
          expectPath(ast, 'children.0.children.1.isLeadingWhitespaceSensitive').to.be.false;
        }
      }
    });

    it('should return false when the previous node is whitespace stripping to the right', () => {
      const firstChilds = ['{{ drop -}}', '{% echo "world" -%}', '{% if true %}hello{% endif -%}'];
      const secondChilds = ['hello', '{{ drop }}', '{% if true %}hello{% endif %}'];
      for (const left of firstChilds) {
        for (const right of secondChilds) {
          ast = toAugmentedAst(`<p>${left} ${right}</p>`);
          expectPath(ast, 'children.0.children.1.isLeadingWhitespaceSensitive', `${left} ${right}`)
            .to.be.false;
        }
      }
    });

    it('should return false for the document node', () => {
      ast = toAugmentedAst('');
      expectPath(ast, 'isLeadingWhitespaceSensitive').to.be.false;
    });

    it('should return false for display none elements', () => {
      ast = toAugmentedAst('<datalist><option value="hello world" /></datalist>');
      expectPath(ast, 'children.0.isLeadingWhitespaceSensitive').to.be.false;
    });

    describe('When: the node is the first child', () => {
      it('should return false when its parent is the DocumentNode', () => {
        ast = toAugmentedAst('<p></p>');
        expectPath(ast, 'children.0.isLeadingWhitespaceSensitive').to.be.false;
      });

      it('should return false when it is pre-like', () => {
        ast = toAugmentedAst('<span> <pre></pre></span>');
        expectPath(ast, 'children.0.children.0.isLeadingWhitespaceSensitive').to.be.false;
      });

      it('should return false if the parent strips whitespace from both ends', () => {
        const nodes = [
          'hello',
          '<span>hello</span>',
          '{{ drop }}',
          '{% if true %}hello{% endif %}',
        ];
        for (const node of nodes) {
          ast = toAugmentedAst(`<p> ${node} </p>`);
          expectPath(ast, 'children.0.children.0.isLeadingWhitespaceSensitive').to.be.false;
        }
      });

      it('should return false if the parent is whitespace stripping to the inner right', () => {
        const nodes = [
          'hello',
          '<span>hello</span>',
          '{{ drop }}',
          '{% if true %}hello{% endif %}',
        ];
        for (const node of nodes) {
          ast = toAugmentedAst(`{% form -%} ${node} {% endform %}`);
          expectPath(ast, 'children.0.children.0.isLeadingWhitespaceSensitive').to.be.false;

          ast = toAugmentedAst(`{% if A -%} ${node} {% endif %}`);
          expectPath(ast, 'children.0.children.0.type').to.eql(NodeTypes.LavaBranch);
          expectPath(ast, 'children.0.children.0.isLeadingWhitespaceSensitive').to.be.false;
          expectPath(ast, 'children.0.children.0.children.0.isLeadingWhitespaceSensitive').to.be
            .false;

          ast = toAugmentedAst(`{% if A %}hello{% else -%} ${node}{% endif %}`);
          expectPath(ast, 'children.0.children.1.type').to.eql(NodeTypes.LavaBranch);
          expectPath(ast, 'children.0.children.1.isLeadingWhitespaceSensitive').to.be.true;
          expectPath(ast, 'children.0.children.1.children.0.isLeadingWhitespaceSensitive').to.be
            .false;

          ast = toAugmentedAst(`{% if A %} hello {%- else -%} ${node} {% endif %}`);
          expectPath(ast, 'children.0.children.1.type').to.eql(NodeTypes.LavaBranch);
          expectPath(ast, 'children.0.children.1.isLeadingWhitespaceSensitive').to.be.false;
        }
      });

      it('should return true for a LavaBranch that is not stripped', () => {
        ast = toAugmentedAst(`{% if A %} hello {% else %} world {% endif %}`);
        expectPath(ast, 'children.0.children.0.isLeadingWhitespaceSensitive').to.be.true;
        expectPath(ast, 'children.0.children.1.isLeadingWhitespaceSensitive').to.be.true;
      });
    });

    it('should return false if the previous node creates a block rendering context that makes the following whitespace irrelevant', () => {
      ast = toAugmentedAst('<p><div>hello</div> this</p>');
      expectPath(ast, 'children.0.children.1.isLeadingWhitespaceSensitive').to.be.false;
    });

    it('should return false if the node itself creates a block rendering context', () => {
      ast = toAugmentedAst('<p>this <div>hello</div></p>');
      expectPath(ast, 'children.0.children.1.isLeadingWhitespaceSensitive').to.be.false;
    });

    it('should return true to the left of a outer leading whitespace sensitive dangling marker open', () => {
      ast = toAugmentedAst('{% if cond %}<a>{% endif %}');
      expectPath(ast, 'children.0.children.0.type').to.eql('LavaBranch');
      expectPath(ast, 'children.0.children.0.children.0.type').to.eql('HtmlDanglingMarkerOpen');
      expectPath(ast, 'children.0.children.0.children.0.name.0.value').to.eql('a');
      expectPath(ast, 'children.0.children.0.children.0.isLeadingWhitespaceSensitive').to.be.true;

      // second "a" tag is sensitive in this given context
      ast = toAugmentedAst('{% if cond %}<a><a>{% endif %}');
      expectPath(ast, 'children.0.children.0.children.1.type').to.eql('HtmlDanglingMarkerOpen');
      expectPath(ast, 'children.0.children.0.children.1.name.0.value').to.eql('a');
      expectPath(ast, 'children.0.children.0.children.1.isLeadingWhitespaceSensitive').to.be.true;
    });

    it('should return false to the left of a outer leading whitespace insensitive dangling marker open', () => {
      ast = toAugmentedAst('{% if cond %}<p>{% endif %}');
      expectPath(ast, 'children.0.children.0.isLeadingWhitespaceSensitive').to.be.false;
      expectPath(ast, 'children.0.children.0.children.0.type').to.eql('HtmlDanglingMarkerOpen');
      expectPath(ast, 'children.0.children.0.children.0.isLeadingWhitespaceSensitive').to.be.false;

      // "a" tag becomes insensitive because of the 'p' tag open
      ast = toAugmentedAst('{% if cond %}<p><a>{% endif %}');
      expectPath(ast, 'children.0.children.0.children.1.type').to.eql('HtmlDanglingMarkerOpen');
      expectPath(ast, 'children.0.children.0.children.1.name.0.value').to.eql('a');
      expectPath(ast, 'children.0.children.0.children.1.isLeadingWhitespaceSensitive').to.be.false;
    });

    it('should return true to the left of a inner trailing whitespace sensitive dangling marker close', () => {
      ast = toAugmentedAst('{% if cond %}</a>{% endif %}');
      expectPath(ast, 'children.0.children.0.type').to.eql('LavaBranch');
      expectPath(ast, 'children.0.children.0.children.0.type').to.eql('HtmlDanglingMarkerClose');
      expectPath(ast, 'children.0.children.0.children.0.isLeadingWhitespaceSensitive').to.be.true;

      // "a" tag would be sensitive
      ast = toAugmentedAst('{% if cond %}</a></a>{% endif %}');
      expectPath(ast, 'children.0.children.0.children.1.type').to.eql('HtmlDanglingMarkerClose');
      expectPath(ast, 'children.0.children.0.children.1.name.0.value').to.eql('a');
      expectPath(ast, 'children.0.children.0.children.1.isLeadingWhitespaceSensitive').to.be.true;
    });

    it('should return false to the left of a inner trailing whitespace insensitive dangling marker close', () => {
      ast = toAugmentedAst('{% if cond %}</p>{% endif %}');
      expectPath(ast, 'children.0.children.0.type').to.eql('LavaBranch');
      expectPath(ast, 'children.0.children.0.children.0.type').to.eql('HtmlDanglingMarkerClose');
      expectPath(ast, 'children.0.children.0.children.0.isLeadingWhitespaceSensitive').to.be.false;

      // "a" tag becomes insensitive because of the 'p' tag close
      ast = toAugmentedAst('{% if cond %}</p></a>{% endif %}');
      expectPath(ast, 'children.0.children.0.children.1.type').to.eql('HtmlDanglingMarkerClose');
      expectPath(ast, 'children.0.children.0.children.1.name.0.value').to.eql('a');
      expectPath(ast, 'children.0.children.0.children.1.isLeadingWhitespaceSensitive').to.be.false;
    });

    describe('Case: LavaBranch', () => {
      describe('Case: default branch', () => {
        it('should return the leadingWhitespaceSensitivity of its first child', () => {
          ast = toAugmentedAst('{% if cond %}<a>{% endif %}');
          expectPath(ast, 'children.0.children.0.type').to.eql('LavaBranch');
          expectPath(ast, 'children.0.children.0.isLeadingWhitespaceSensitive').to.be.true;
          expectPath(ast, 'children.0.children.0.children.0.type').to.eql('HtmlDanglingMarkerOpen');
          expectPath(ast, 'children.0.children.0.children.0.isLeadingWhitespaceSensitive').to.be
            .true;

          ast = toAugmentedAst('{% if cond %}<p>{% endif %}');
          expectPath(ast, 'children.0.children.0.type').to.eql('LavaBranch');
          expectPath(ast, 'children.0.children.0.isLeadingWhitespaceSensitive').to.be.false;
          expectPath(ast, 'children.0.children.0.children.0.type').to.eql('HtmlDanglingMarkerOpen');
          expectPath(ast, 'children.0.children.0.children.0.isLeadingWhitespaceSensitive').to.be
            .false;
        });
      });

      describe('Case: other branches', () => {
        it('should return the trailingWhitespaceSensitivity of the default branch', () => {
          ast = toAugmentedAst('{% if cond %}{% else %}<a>{% endif %}');
          expectPath(ast, 'children.0.children.0.type').to.eql('LavaBranch');
          expectPath(ast, 'children.0.children.0.isTrailingWhitespaceSensitive').to.be.true;
          expectPath(ast, 'children.0.children.1.type').to.eql('LavaBranch');
          expectPath(ast, 'children.0.children.1.isLeadingWhitespaceSensitive').to.be.true;
          expectPath(ast, 'children.0.children.1.children.0.type').to.eql('HtmlDanglingMarkerOpen');
          expectPath(ast, 'children.0.children.1.children.0.isLeadingWhitespaceSensitive').to.be
            .true;

          ast = toAugmentedAst('{% if cond %}<a>{% else %}<p>{% endif %}');
          expectPath(ast, 'children.0.children.0.type').to.eql('LavaBranch');
          expectPath(ast, 'children.0.children.0.isTrailingWhitespaceSensitive').to.be.true;
          expectPath(ast, 'children.0.children.1.type').to.eql('LavaBranch');
          expectPath(ast, 'children.0.children.1.isLeadingWhitespaceSensitive').to.be.true;
          expectPath(ast, 'children.0.children.1.children.0.type').to.eql('HtmlDanglingMarkerOpen');
          expectPath(ast, 'children.0.children.1.children.0.isLeadingWhitespaceSensitive').to.be
            .false;

          ast = toAugmentedAst('{% if cond %}<p>{% else %}<a>{% endif %}');
          expectPath(ast, 'children.0.children.0.type').to.eql('LavaBranch');
          expectPath(ast, 'children.0.children.0.isTrailingWhitespaceSensitive').to.be.false;
          expectPath(ast, 'children.0.children.1.type').to.eql('LavaBranch');
          expectPath(ast, 'children.0.children.1.isLeadingWhitespaceSensitive').to.be.false;
          expectPath(ast, 'children.0.children.1.children.0.type').to.eql('HtmlDanglingMarkerOpen');
          expectPath(ast, 'children.0.children.1.children.0.isLeadingWhitespaceSensitive').to.be
            .true;
        });
      });
    });
  });

  describe('Unit: isTrailingWhitespaceSensitive', () => {
    it('should return false when the next node is whitespace stripping to the left', () => {
      const firstChilds = [
        'hello',
        '{{ drop }}',
        '{% if true %}hello{% endif %}',
        '{% echo "hello" %}',
      ];
      const secondChilds = [
        '{{- drop }}',
        '{%- if true %}world{% endif %}',
        '{%- assign x = true %}',
      ];
      for (const left of firstChilds) {
        for (const right of secondChilds) {
          ast = toAugmentedAst(`<p>${left} ${right}</p>`);
          expectPath(ast, 'children.0.type').to.eql(NodeTypes.HtmlElement);
          expectPath(ast, 'children.0.children.0.isTrailingWhitespaceSensitive').to.be.false;
        }
      }
    });

    it('should return false when the node is whitespace stripping to the right', () => {
      const firstChilds = [
        '{{ drop -}}',
        '{% if true %}world{% endif -%}',
        '{% form "cart" %}...{% endform -%}',
        '{% assign x = true -%}',
      ];
      const secondChilds = [
        'hello',
        '{{ drop }}',
        '{% if true %}hello{% endif %}',
        '{% assign x = true %}',
      ];
      for (const left of firstChilds) {
        for (const right of secondChilds) {
          ast = toAugmentedAst(`<p>${left} ${right}</p>`);
          expectPath(ast, 'children.0.children.0.isTrailingWhitespaceSensitive').to.be.false;
        }
      }
    });

    it('should return true when an inline formatting context is implied because the next node is a text node', () => {
      ast = toAugmentedAst('<p>hello {{ drop }}</p>');
      expectPath(ast, 'children.0.children.0.isTrailingWhitespaceSensitive').to.be.true;

      ast = toAugmentedAst('<p>{{ drop }}hello</p>');
      expectPath(ast, 'children.0.children.0.isTrailingWhitespaceSensitive').to.be.true;
    });

    it('should return false when a block formatting context is implied because of the current node', () => {
      ast = toAugmentedAst('<p><div>hello</div> {{ drop }}</p>');
      expectPath(ast, 'children.0.children.0.isTrailingWhitespaceSensitive').to.be.false;
    });

    it('should return false for the document node', () => {
      ast = toAugmentedAst('');
      expectPath(ast, 'isTrailingWhitespaceSensitive').to.be.false;
    });

    it('should return false for display none elements', () => {
      ast = toAugmentedAst('<datalist><option value="hello world" /></datalist>');
      expectPath(ast, 'children.0.isTrailingWhitespaceSensitive').to.be.false;
    });

    it('should return true for child nodes of pre-like nodes', () => {
      const wrappers = [
        ['<pre>', '</pre>'],
        ['<textarea>', '</textarea>'],
        ['<plaintext>', '</plaintext>'],
      ];
      const nodes = [
        'hello world',
        '{{ drop }}',
        '{% if true %}world{% endif %}',
        '{% form "cart" %}...{% endform %}',
        '{% assign x = true %}',
      ];

      for (const [wrapStart, wrapEnd] of wrappers) {
        for (const node of nodes) {
          ast = toAugmentedAst(`${wrapStart}${node} ${wrapEnd}`);
          expectPath(
            ast,
            'children.0.children.0.isTrailingWhitespaceSensitive',
            `${wrapStart}${node} ${wrapEnd}`,
          ).to.be.true;
        }
      }
    });

    describe('When: the node is the last children of its parent', () => {
      it('should return false for direct children of the document', () => {
        ast = toAugmentedAst('{{ drop1 }} {{ drop }}');
        expectPath(ast, 'children.1.isTrailingWhitespaceSensitive').to.be.false;
      });

      it('should return false for pre-like nodes', () => {
        ast = toAugmentedAst('{% form %}hello <pre> ... </pre> {% endform %}');
        expectPath(ast, 'children.0.children.1.isTrailingWhitespaceSensitive').to.be.false;
      });

      it('should return false for last child of block ', () => {
        ast = toAugmentedAst('<p>hello <span>world</span> </p>');
        expectPath(ast, 'children.0.children.1.isTrailingWhitespaceSensitive').to.be.false;
      });

      it('should return false if the parent is trimming to the inner right', () => {
        ast = toAugmentedAst('{% if true %}branch a{%- else %}branch b{% endif %}');
        expectPath(ast, 'children.0.children.0.type').to.eql(NodeTypes.LavaBranch);
        expectPath(ast, 'children.0.children.0.name').to.eql(null);
        expectPath(ast, 'children.0.children.0.children.0.isTrailingWhitespaceSensitive').to.be
          .false;

        ast = toAugmentedAst('{% if true %}branch a{% else %}branch b{%- endif %}');
        expectPath(ast, 'children.0.children.1.type').to.eql(NodeTypes.LavaBranch);
        expectPath(ast, 'children.0.children.1.name').to.eql('else');
        expectPath(ast, 'children.0.children.1.children.0.isTrailingWhitespaceSensitive').to.be
          .false;

        ast = toAugmentedAst('{% form %}branch a{%- endform %}');
        expectPath(ast, 'children.0.children.0.isTrailingWhitespaceSensitive').to.be.false;
      });
    });

    it('should return false if the next child is not whitespace sensitive to the outer left', () => {
      const blocks = ['<div> world </div>', '{% form %} hello {% endform %}'];
      for (const block of blocks) {
        ast = toAugmentedAst(`<p>Hello ${block}</p>`);
        expectPath(ast, 'children.0.children.0.type').to.eql(NodeTypes.TextNode);
        expectPath(ast, 'children.0.children.0.isTrailingWhitespaceSensitive').to.be.false;
      }
    });

    it('should return true to the right of a inner leading whitespace sensitive dangling marker open', () => {
      ast = toAugmentedAst('{% if cond %}<a>{% endif %}');
      expectPath(ast, 'children.0.children.0.type').to.eql('LavaBranch');
      expectPath(ast, 'children.0.children.0.children.0.type').to.eql('HtmlDanglingMarkerOpen');
      expectPath(ast, 'children.0.children.0.children.0.name.0.value').to.eql('a');
      expectPath(ast, 'children.0.children.0.children.0.isTrailingWhitespaceSensitive').to.be.true;

      // first "a" tag is sensitive in this given context
      ast = toAugmentedAst('{% if cond %}<a><a>{% endif %}');
      expectPath(ast, 'children.0.children.0.type').to.eql('LavaBranch');
      expectPath(ast, 'children.0.children.0.children.0.type').to.eql('HtmlDanglingMarkerOpen');
      expectPath(ast, 'children.0.children.0.children.0.name.0.value').to.eql('a');
      expectPath(ast, 'children.0.children.0.children.0.isTrailingWhitespaceSensitive').to.be.true;

      ast = toAugmentedAst('{% if cond %}{% else %}<a>{% endif %}');
      expectPath(ast, 'children.0.children.1.type').to.eql('LavaBranch');
      expectPath(ast, 'children.0.children.1.isTrailingWhitespaceSensitive').to.be.true;
      expectPath(ast, 'children.0.children.1.children.0.type').to.eql('HtmlDanglingMarkerOpen');
      expectPath(ast, 'children.0.children.1.children.0.name.0.value').to.eql('a');
      expectPath(ast, 'children.0.children.1.children.0.isTrailingWhitespaceSensitive').to.be.true;
    });

    it('should return false to the right of a inner leading whitespace insensitive dangling marker open', () => {
      ast = toAugmentedAst('{% if cond %}<p>{% endif %}');
      expectPath(ast, 'children.0.children.0.type').to.eql('LavaBranch');
      expectPath(ast, 'children.0.children.0.children.0.type').to.eql('HtmlDanglingMarkerOpen');
      expectPath(ast, 'children.0.children.0.children.0.isTrailingWhitespaceSensitive').to.be.false;

      // "a" tag becomes insensitive because of the 'p' tag open
      ast = toAugmentedAst('{% if cond %}<a><p>{% endif %}');
      expectPath(ast, 'children.0.children.0.type').to.eql('LavaBranch');
      expectPath(ast, 'children.0.children.0.children.0.type').to.eql('HtmlDanglingMarkerOpen');
      expectPath(ast, 'children.0.children.0.children.0.name.0.value').to.eql('a');
      expectPath(ast, 'children.0.children.0.children.0.isTrailingWhitespaceSensitive').to.be.false;

      ast = toAugmentedAst('{% if cond %}{% else %}<p>{% endif %}');
      expectPath(ast, 'children.0.children.1.type').to.eql('LavaBranch');
      expectPath(ast, 'children.0.children.1.isTrailingWhitespaceSensitive').to.be.false;
      expectPath(ast, 'children.0.children.1.children.0.type').to.eql('HtmlDanglingMarkerOpen');
      expectPath(ast, 'children.0.children.1.children.0.isTrailingWhitespaceSensitive').to.be.false;
    });

    it('should return true to the right of a outer trailing whitespace sensitive dangling marker close', () => {
      ast = toAugmentedAst('{% if cond %}</a>{% endif %}');
      expectPath(ast, 'children.0.children.0.type').to.eql('LavaBranch');
      expectPath(ast, 'children.0.children.0.children.0.type').to.eql('HtmlDanglingMarkerClose');
      expectPath(ast, 'children.0.children.0.children.0.isTrailingWhitespaceSensitive').to.be.true;

      // "a" tag would be sensitive
      ast = toAugmentedAst('{% if cond %}</a></a>{% endif %}');
      expectPath(ast, 'children.0.children.0.type').to.eql('LavaBranch');
      expectPath(ast, 'children.0.children.0.children.1.type').to.eql('HtmlDanglingMarkerClose');
      expectPath(ast, 'children.0.children.0.children.1.name.0.value').to.eql('a');
      expectPath(ast, 'children.0.children.0.children.1.isTrailingWhitespaceSensitive').to.be.true;

      ast = toAugmentedAst('{% if cond %}{% else %}</a>{% endif %}');
      expectPath(ast, 'children.0.children.1.type').to.eql('LavaBranch');
      expectPath(ast, 'children.0.children.1.isTrailingWhitespaceSensitive').to.be.true;
      expectPath(ast, 'children.0.children.1.children.0.type').to.eql('HtmlDanglingMarkerClose');
      expectPath(ast, 'children.0.children.1.children.0.isTrailingWhitespaceSensitive').to.be.true;
    });

    it('should return false to the right of a outer trailing whitespace insensitive dangling marker close', () => {
      ast = toAugmentedAst('{% if cond %}</p>{% endif %}');
      expectPath(ast, 'children.0.children.0.type').to.eql('LavaBranch');
      expectPath(ast, 'children.0.children.0.children.0.type').to.eql('HtmlDanglingMarkerClose');
      expectPath(ast, 'children.0.children.0.children.0.isTrailingWhitespaceSensitive').to.be.false;

      // "a" tag becomes insensitive because of the 'p' tag close
      ast = toAugmentedAst('{% if cond %}</a></p>{% endif %}');
      expectPath(ast, 'children.0.children.0.type').to.eql('LavaBranch');
      expectPath(ast, 'children.0.children.0.children.0.type').to.eql('HtmlDanglingMarkerClose');
      expectPath(ast, 'children.0.children.0.children.0.name.0.value').to.eql('a');
      expectPath(ast, 'children.0.children.0.children.0.isTrailingWhitespaceSensitive').to.be.false;

      ast = toAugmentedAst('{% if cond %}{% else %}</p>{% endif %}');
      expectPath(ast, 'children.0.children.1.type').to.eql('LavaBranch');
      expectPath(ast, 'children.0.children.1.isTrailingWhitespaceSensitive').to.be.false;
      expectPath(ast, 'children.0.children.1.children.0.type').to.eql('HtmlDanglingMarkerClose');
      expectPath(ast, 'children.0.children.1.children.0.isTrailingWhitespaceSensitive').to.be.false;
    });

    describe('Case: LavaBranch', () => {
      describe('Case: default branch', () => {
        it('should return the trailingWhitespaceSensitivty of its last child', () => {
          ast = toAugmentedAst('{% if cond %}<p><a>{% endif %}');
          expectPath(ast, 'children.0.children.0.type').to.eql('LavaBranch');
          expectPath(ast, 'children.0.children.0.isTrailingWhitespaceSensitive').to.be.true;
          expectPath(ast, 'children.0.children.0.children.1.type').to.eql('HtmlDanglingMarkerOpen');
          expectPath(ast, 'children.0.children.0.children.1.isTrailingWhitespaceSensitive').to.be
            .true;

          ast = toAugmentedAst('{% if cond %}<a><p>{% endif %}');
          expectPath(ast, 'children.0.children.0.type').to.eql('LavaBranch');
          expectPath(ast, 'children.0.children.0.isTrailingWhitespaceSensitive').to.be.false;
          expectPath(ast, 'children.0.children.0.children.1.type').to.eql('HtmlDanglingMarkerOpen');
          expectPath(ast, 'children.0.children.0.children.1.isTrailingWhitespaceSensitive').to.be
            .false;
        });
      });

      describe('Case: other branches', () => {
        it('should return the trailingWhitespaceSensitivity of its last child', () => {
          ast = toAugmentedAst('{% if cond %}{% else %}<p><a>{% endif %}');
          expectPath(ast, 'children.0.children.1.type').to.eql('LavaBranch');
          expectPath(ast, 'children.0.children.1.isTrailingWhitespaceSensitive').to.be.true;
          expectPath(ast, 'children.0.children.1.children.1.type').to.eql('HtmlDanglingMarkerOpen');
          expectPath(ast, 'children.0.children.1.children.1.isTrailingWhitespaceSensitive').to.be
            .true;

          ast = toAugmentedAst('{% if cond %}{% else %}<a><p>{% endif %}');
          expectPath(ast, 'children.0.children.1.type').to.eql('LavaBranch');
          expectPath(ast, 'children.0.children.1.isTrailingWhitespaceSensitive').to.be.false;
          expectPath(ast, 'children.0.children.1.children.1.type').to.eql('HtmlDanglingMarkerOpen');
          expectPath(ast, 'children.0.children.1.children.1.isTrailingWhitespaceSensitive').to.be
            .false;
        });
      });
    });
  });

  describe('Unit: hasDanglingWhitespace', () => {
    it('should handle LavaBranch tags properly', () => {
      ast = toAugmentedAst('{% if true %} {% endif %}');
      // The if tag itself is dangling if it only has one branch and it's empty
      expectPath(ast, 'children.0.hasDanglingWhitespace').to.be.true;

      // The default branch has dangling whitespace
      expectPath(ast, 'children.0.children.0.type').to.eql(NodeTypes.LavaBranch);
      expectPath(ast, 'children.0.children.0.hasDanglingWhitespace').to.be.true;

      // same goes for else tags
      ast = toAugmentedAst('{% if true %} {% else %} {% endif %}');
      expectPath(ast, 'children.0.hasDanglingWhitespace').to.be.false;
      expectPath(ast, 'children.0.children.0.type').to.eql(NodeTypes.LavaBranch);
      expectPath(ast, 'children.0.children.0.hasDanglingWhitespace').to.be.true;
      expectPath(ast, 'children.0.children.1.type').to.eql(NodeTypes.LavaBranch);
      expectPath(ast, 'children.0.children.1.hasDanglingWhitespace').to.be.true;

      // reports false when branch is empty
      ast = toAugmentedAst('{% if true %}{% else %}{% endif %}');
      expectPath(ast, 'children.0.hasDanglingWhitespace').to.be.false;
      expectPath(ast, 'children.0.children.0.type').to.eql(NodeTypes.LavaBranch);
      expectPath(ast, 'children.0.children.0.hasDanglingWhitespace').to.be.false;
      expectPath(ast, 'children.0.children.1.type').to.eql(NodeTypes.LavaBranch);
      expectPath(ast, 'children.0.children.1.hasDanglingWhitespace').to.be.false;
    });

    it('should work for LavaTags', () => {
      ast = toAugmentedAst('{% form %} {% endform %}');
      expectPath(ast, 'children.0.hasDanglingWhitespace').to.be.true;

      ast = toAugmentedAst('{% form %}{% endform %}');
      expectPath(ast, 'children.0.hasDanglingWhitespace').to.be.false;
    });

    it('should work for HtmlElements', () => {
      ast = toAugmentedAst('<p> </p>');
      expectPath(ast, 'children.0.hasDanglingWhitespace').to.be.true;

      ast = toAugmentedAst('<p></p>');
      expectPath(ast, 'children.0.hasDanglingWhitespace').to.be.false;
    });
  });

  describe('Unit: isDanglingWhitespaceSensitive', () => {
    it('should return true for inline elements', () => {
      ast = toAugmentedAst('<span> </span>');
      expectPath(ast, 'children.0.isDanglingWhitespaceSensitive').to.be.true;
    });

    it('should return false for block elements', () => {
      ast = toAugmentedAst('<p> </p>');
      expectPath(ast, 'children.0.isDanglingWhitespaceSensitive').to.be.false;
    });

    it('should return true for LavaBranch tags', () => {
      ast = toAugmentedAst('{% if A %} {% endif %}');
      expectPath(ast, 'children.0.children.0.isDanglingWhitespaceSensitive').to.be.true;
    });

    it('should return false for LavaBranch tags that are whitespace stripped', () => {
      ast = toAugmentedAst('{% if A -%} {% endif %}');
      expectPath(ast, 'children.0.children.0.isDanglingWhitespaceSensitive').to.be.false;
      ast = toAugmentedAst('{% if A %} {%- endif %}');
      expectPath(ast, 'children.0.children.0.isDanglingWhitespaceSensitive').to.be.false;
    });

    it('should return false for script-like tags', () => {
      const tags = ['script', 'style'];
      for (const tag of tags) {
        ast = toAugmentedAst(`<${tag}> </${tag}>`);
        expectPath(ast, 'children.0.isDanglingWhitespaceSensitive').to.be.false;
      }
    });
  });

  describe('Unit: hasLeadingWhitespace', () => {
    it('should return true for branched LavaTag', () => {
      ast = toAugmentedAst('{% if A %} hello {% endif %}');
      expectPath(ast, 'children.0.type').to.be.eql(NodeTypes.LavaTag);
      expectPath(ast, 'children.0.hasLeadingWhitespace').to.be.false;
      expectPath(ast, 'children.0.children.0.type').to.be.eql(NodeTypes.LavaBranch);
      expectPath(ast, 'children.0.children.0.hasLeadingWhitespace').to.be.true;
    });

    it('should return the correct value for LavaBranches', () => {
      ast = toAugmentedAst('{% if A %} hello{% else %} ok{% endif %}');
      expectPath(ast, 'children.0.children.0.type').to.be.eql(NodeTypes.LavaBranch);
      expectPath(ast, 'children.0.children.0.hasLeadingWhitespace').to.be.true;
      expectPath(ast, 'children.0.children.1.hasLeadingWhitespace').to.be.false;

      ast = toAugmentedAst('{% if A %} {% else %}ok{% endif %}');
      expectPath(ast, 'children.0.children.0.type').to.be.eql(NodeTypes.LavaBranch);
      expectPath(ast, 'children.0.children.0.hasLeadingWhitespace').to.be.true;
      expectPath(ast, 'children.0.children.1.hasLeadingWhitespace').to.be.true;
    });
  });

  describe('Unit: hasTrailingWhitespace', () => {
    it('should return true for branched LavaTag', () => {
      ast = toAugmentedAst('{% if A %} hello {% endif %}');
      expectPath(ast, 'children.0.type').to.be.eql(NodeTypes.LavaTag);
      expectPath(ast, 'children.0.hasTrailingWhitespace').to.be.false;
      expectPath(ast, 'children.0.children.0.type').to.be.eql(NodeTypes.LavaBranch);
      expectPath(ast, 'children.0.children.0.hasTrailingWhitespace').to.be.true;
    });

    it('should return the correct value for LavaBranches', () => {
      ast = toAugmentedAst('{% if A %} hello{% else %}ok {% endif %}');
      expectPath(ast, 'children.0.children.0.type').to.be.eql(NodeTypes.LavaBranch);
      expectPath(ast, 'children.0.children.0.hasTrailingWhitespace').to.be.false;
      expectPath(ast, 'children.0.children.1.hasTrailingWhitespace').to.be.true;

      ast = toAugmentedAst('{% if A %} {% else %}ok{% endif %}');
      expectPath(ast, 'children.0.children.0.type').to.be.eql(NodeTypes.LavaBranch);
      expectPath(ast, 'children.0.children.0.hasTrailingWhitespace').to.be.true;
      expectPath(ast, 'children.0.children.1.hasTrailingWhitespace').to.be.false;
    });
  });

  function toAugmentedAst(code: string, options: Partial<LavaParserOptions> = {}) {
    const ast = toLavaHtmlAST(code);
    options.originalText = ast.source;
    options.locStart = (node: LavaHtmlNode) => node.position.start;
    options.locEnd = (node: LavaHtmlNode) => node.position.end;
    return preprocess(ast, options as LavaParserOptions);
  }

  function expectPath(ast: LavaHtmlNode, path: string, message?: string) {
    return expect(deepGet(path.split('.'), ast), message);
  }
});
