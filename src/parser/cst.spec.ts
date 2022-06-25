import { expect } from 'chai';
import { LavaHtmlCST, toLavaHtmlCST } from '~/parser/cst';
import { BLOCKS, VOID_ELEMENTS } from '~/parser/grammar';
import { LavaHTMLCSTParsingError } from '~/parser/errors';
import { deepGet } from '~/utils';

describe('Unit: toLavaHtmlCST(text)', () => {
  let cst;
  describe('Case: HtmlComment', () => {
    it('should basically parse html comments', () => {
      ['<!-- hello world -->'].forEach((text) => {
        cst = toLavaHtmlCST(text);
        expectPath(cst, '0.type').to.equal('HtmlComment');
        expectPath(cst, '0.body').to.equal('hello world');
        expectLocation(cst, [0]);
      });
    });
  });

  describe('Case: HtmlNode', () => {
    it('should basically parse open and close tags', () => {
      ['<div></div>', '<div ></div >'].forEach((text) => {
        cst = toLavaHtmlCST(text);
        expectPath(cst, '0.type').to.equal('HtmlTagOpen');
        expectPath(cst, '0.name').to.equal('div');
        expectPath(cst, '1.type').to.equal('HtmlTagClose');
        expectPath(cst, '1.name').to.equal('div');
        expectLocation(cst, [0]);
        expectLocation(cst, [1]);
      });
    });

    it('should parse lava drop tag names', () => {
      cst = toLavaHtmlCST('<{{ node_type }}></{{ node_type }}>');
      expectPath(cst, '0.type').to.equal('HtmlTagOpen');
      expectPath(cst, '0.name.type').to.equal('LavaDrop');
      expectPath(cst, '0.name.markup').to.equal('node_type');
      expectPath(cst, '1.type').to.equal('HtmlTagClose');
      expectPath(cst, '1.name.type').to.equal('LavaDrop');
      expectPath(cst, '1.name.markup').to.equal('node_type');
      expectLocation(cst, [0]);
      expectLocation(cst, [0, 'name']);
      expectLocation(cst, [1]);
      expectLocation(cst, [1, 'name']);
    });

    it('should parse script and style tags as a dump', () => {
      cst = toLavaHtmlCST(
        '<script>\nconst a = {{ product | json }}\n</script><style>\n#id {}\n</style>',
      );
      expectPath(cst, '0.type').to.eql('HtmlRawTag');
      expectPath(cst, '0.name').to.eql('script');
      expectPath(cst, '0.body').to.eql('\nconst a = {{ product | json }}\n');
      expectPath(cst, '1.type').to.eql('HtmlRawTag');
      expectPath(cst, '1.name').to.eql('style');
      expectPath(cst, '1.body').to.eql('\n#id {}\n');
      expectLocation(cst, [0]);
    });

    it('should properly return block{Start,End}Loc{Start,End} locations of raw tags', () => {
      const source = '<script>const a = {{ product | json }}</script>';
      cst = toLavaHtmlCST(source);
      expectPath(cst, '0.type').to.equal('HtmlRawTag');
      expectPath(cst, '0.blockStartLocStart').to.equal(0);
      expectPath(cst, '0.blockStartLocEnd').to.equal(source.indexOf('const'));
      expectPath(cst, '0.blockEndLocStart').to.equal(source.indexOf('</script>'));
      expectPath(cst, '0.blockEndLocEnd').to.equal(source.length);
      expectLocation(cst, [0]);
    });

    it('should parse void elements', () => {
      VOID_ELEMENTS.forEach((voidElementName) => {
        cst = toLavaHtmlCST(`<${voidElementName} disabled>`);
        expectPath(cst, '0.type').to.equal('HtmlVoidElement');
        expectPath(cst, '0.name').to.equal(voidElementName);
        expectLocation(cst, [0]);
      });
    });

    it('should parse empty attributes', () => {
      ['<div empty>', '<div empty >', '<div\nempty\n>'].forEach((text) => {
        cst = toLavaHtmlCST(text);
        expectPath(cst, '0.attrList.0.type').to.equal('AttrEmpty');
        expectPath(cst, '0.attrList.0.name').to.equal('empty');
        expectPath(cst, '0.name.attrList.0.value').to.be.undefined;
        expectLocation(cst, [0]);
        expectLocation(cst, [0, 'attrList', 0]);
      });
    });

    [
      { type: 'AttrSingleQuoted', name: 'single', quote: "'" },
      { type: 'AttrDoubleQuoted', name: 'double', quote: '"' },
      { type: 'AttrUnquoted', name: 'unquoted', quote: '' },
    ].forEach((testConfig) => {
      it(`should parse ${testConfig.type} attributes`, () => {
        [
          `<div ${testConfig.name}=${testConfig.quote}${testConfig.name}${testConfig.quote}>`,
          `<div ${testConfig.name}=${testConfig.quote}${testConfig.name}${testConfig.quote} >`,
          `<div\n${testConfig.name}=${testConfig.quote}${testConfig.name}${testConfig.quote}\n>`,
        ].forEach((text) => {
          cst = toLavaHtmlCST(text);
          expectPath(cst, '0.attrList.0.type').to.equal(testConfig.type);
          expectPath(cst, '0.attrList.0.name').to.equal(testConfig.name);
          expectPath(cst, '0.attrList.0.value.0.type').to.eql('TextNode');
          expectPath(cst, '0.attrList.0.value.0.value').to.eql(testConfig.name);
          expectLocation(cst, [0]);
          expectLocation(cst, [0, 'attrList', 0]);
        });
      });

      if (testConfig.name != 'unquoted') {
        it(`should accept lava nodes inside ${testConfig.type}`, () => {
          [
            `<div ${testConfig.name}=${testConfig.quote}https://{{ name }}${testConfig.quote}>`,
            `<div ${testConfig.name}=${testConfig.quote}https://{{ name }}${testConfig.quote} >`,
            `<div\n${testConfig.name}=${testConfig.quote}https://{{ name }}${testConfig.quote}\n>`,
          ].forEach((text) => {
            cst = toLavaHtmlCST(text);
            expectPath(cst, '0.attrList.0.value.1.type').to.eql('LavaDrop', text);
            expectLocation(cst, [0]);
            expectLocation(cst, [0, 'attrList', 0]);
          });
        });
      }

      it(`should accept top level lava nodes that contain ${testConfig.type}`, () => {
        [
          `<div {% if A %}${testConfig.name}=${testConfig.quote}https://name${testConfig.quote}{% endif %}>`,
          `<div {% if A %} ${testConfig.name}=${testConfig.quote}https://name${testConfig.quote} {% endif %}>`,
          `<div\n{% if A %}\n${testConfig.name}=${testConfig.quote}https://name${testConfig.quote}\n{% endif %}>`,
        ].forEach((text) => {
          cst = toLavaHtmlCST(text);
          expectPath(cst, '0.attrList.0.type').to.eql('LavaTagOpen', text);
          expectPath(cst, '0.attrList.1.type').to.eql(testConfig.type, text);
          expectPath(cst, '0.attrList.1.value.0.value').to.eql('https://name');
          expectPath(cst, '0.attrList.2.type').to.eql('LavaTagClose', text);
          expectLocation(cst, [0]);
          expectLocation(cst, [0, 'attrList', 0]);
        });
      });
    });
  });

  describe('Case: LavaNode', () => {
    it('should basically parse lava drops', () => {
      cst = toLavaHtmlCST('{{ name }}{{- names -}}');
      expectPath(cst, '0.type').to.equal('LavaDrop');
      expectPath(cst, '0.markup').to.equal('name');
      expectPath(cst, '0.whitespaceStart').to.equal(null);
      expectPath(cst, '0.whitespaceEnd').to.equal(null);
      expectPath(cst, '1.type').to.equal('LavaDrop');
      expectPath(cst, '1.markup').to.equal('names');
      expectPath(cst, '1.whitespaceStart').to.equal('-');
      expectPath(cst, '1.whitespaceEnd').to.equal('-');
      expectLocation(cst, [0]);
    });

    it('should parse raw tags', () => {
      ['style', 'raw'].forEach((raw) => {
        cst = toLavaHtmlCST(`{% ${raw} -%}<div>{%- end${raw} %}`);
        expectPath(cst, '0.type').to.equal('LavaRawTag');
        expectPath(cst, '0.body').to.equal('<div>');
        expectPath(cst, '0.whitespaceStart').to.equal(null);
        expectPath(cst, '0.whitespaceEnd').to.equal('-');
        expectPath(cst, '0.delimiterWhitespaceStart').to.equal('-');
        expectPath(cst, '0.delimiterWhitespaceEnd').to.equal(null);
        expectLocation(cst, [0]);
      });
    });

    it('should properly return block{Start,End}Loc{Start,End} locations of raw tags', () => {
      const source = '{% raw -%}<div>{%- endraw %}';
      cst = toLavaHtmlCST(source);
      expectPath(cst, '0.type').to.equal('LavaRawTag');
      expectPath(cst, '0.body').to.equal('<div>');
      expectPath(cst, '0.blockStartLocStart').to.equal(0);
      expectPath(cst, '0.blockStartLocEnd').to.equal(source.indexOf('<'));
      expectPath(cst, '0.blockEndLocStart').to.equal(source.indexOf('>') + 1);
      expectPath(cst, '0.blockEndLocEnd').to.equal(source.length);
      expectPath(cst, '0.delimiterWhitespaceStart').to.equal('-');
      expectPath(cst, '0.delimiterWhitespaceEnd').to.equal(null);
      expectLocation(cst, [0]);
    });

    it('should basically parse lava tags', () => {
      cst = toLavaHtmlCST('{%   assign x = 1 %}{% if hi -%}{%- endif %}');
      expectPath(cst, '0.type').to.equal('LavaTag');
      expectPath(cst, '0.name').to.equal('assign');
      expectPath(cst, '0.markup').to.equal('x = 1');
      expectPath(cst, '0.whitespaceStart').to.equal(null);
      expectPath(cst, '0.whitespaceEnd').to.equal(null);
      expectPath(cst, '1.type').to.equal('LavaTagOpen');
      expectPath(cst, '1.name').to.equal('if');
      expectPath(cst, '1.markup').to.equal('hi');
      expectPath(cst, '1.whitespaceStart').to.equal(null);
      expectPath(cst, '1.whitespaceEnd').to.equal('-');
      expectPath(cst, '2.type').to.equal('LavaTagClose');
      expectPath(cst, '2.name').to.equal('if');
      expectPath(cst, '2.whitespaceStart').to.equal('-');
      expectPath(cst, '2.whitespaceEnd').to.equal(null);
      expectLocation(cst, [0]);
    });

    it('should parse tag open / close', () => {
      BLOCKS.forEach((block: string) => {
        cst = toLavaHtmlCST(`{% ${block} args -%}{%- end${block} %}`);
        expectPath(cst, '0.type').to.equal('LavaTagOpen');
        expectPath(cst, '0.name').to.equal(block);
        expectPath(cst, '0.whitespaceStart').to.equal(null);
        expectPath(cst, '0.whitespaceEnd').to.equal('-');
        expectPath(cst, '0.markup').to.equal('args');
        expectPath(cst, '1.type').to.equal('LavaTagClose');
        expectPath(cst, '1.name').to.equal(block);
        expectPath(cst, '1.whitespaceStart').to.equal('-');
        expectPath(cst, '1.whitespaceEnd').to.equal(null);
      });
    });
  });

  describe('Case: TextNode', () => {
    it('should parse text nodes', () => {
      ['<div>hello</div>', '{% if condition %}hello{% endif %}'].forEach((text) => {
        cst = toLavaHtmlCST(text);
        expectPath(cst, '1.type').to.equal('TextNode');
        expectPath(cst, '1.value').to.equal('hello');
        expectLocation(cst, [1]);
      });
    });

    it('should trim whitespace left and right', () => {
      [
        {
          testCase: '<div>  \n hello  world  </div>',
          expected: 'hello  world',
        },
        { testCase: '<div>  \n bb  </div>', expected: 'bb' },
        { testCase: '<div>  \n b  </div>', expected: 'b' },
        {
          testCase: '{% if a %}  \n hello  world  {% endif %}',
          expected: 'hello  world',
        },
        { testCase: '{% if a %}  \n bb  {% endif %}', expected: 'bb' },
        { testCase: '{% if a %}  \n b  {% endif %}', expected: 'b' },
      ].forEach(({ testCase, expected }) => {
        cst = toLavaHtmlCST(testCase);
        expectPath(cst, '1.type').to.equal('TextNode');
        expectPathStringified(cst, '1.value').to.equal(JSON.stringify(expected));
        expectLocation(cst, [1]);
      });
    });
  });

  it('should throw when trying to parse unparseable code', () => {
    const testCases = ['{% 10293 %}', '<h=>', '{% if', '{{ n', '<div>{{ n{% if'];
    for (const testCase of testCases) {
      try {
        toLavaHtmlCST(testCase);
        expect(true, `expected ${testCase} to throw LavaHTMLCSTParsingError`).to.be.false;
      } catch (e) {
        expect(e.name).to.eql('LavaHTMLParsingError');
        expect(e.loc, `expected ${e} to have location information`).not.to.be.undefined;
      }
    }
  });

  it('should parse inline comments', () => {
    cst = toLavaHtmlCST('{% # hello world \n # hi %}');
    expectPath(cst, '0.type').to.eql('LavaTag');
    expectPath(cst, '0.name').to.eql('#');
    expectPath(cst, '0.markup').to.eql('hello world \n # hi');
    expectLocation(cst, [0]);
  });

  function expectLocation(cst: LavaHtmlCST, path: (string | number)[]) {
    expect(deepGet(path.concat('locStart'), cst)).to.be.a('number');
    expect(deepGet(path.concat('locEnd'), cst)).to.be.a('number');
  }

  function expectPath(cst: LavaHtmlCST, path: string) {
    return expect(deepGet(path.split('.'), cst));
  }

  function expectPathStringified(cst: LavaHtmlCST, path: string) {
    return expect(JSON.stringify(deepGet(path.split('.'), cst)));
  }
});
