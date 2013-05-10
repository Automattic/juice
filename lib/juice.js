
/**
 * juice
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

module.exports = juice;

/**
 * Module dependencies.
 */

var utils = require('./utils')
  , Selector = require('./selector')
  , Property = require('./property')
  , packageJson = require('../package')
  , fs = require('fs')
  , Batch = require('batch')
  , url = require('url')
  , superagent = require('superagent')
  , path = require('path')
  , assert = require('assert')
  , os = require('os')
  , styleSelector = new Selector('<style attribute>', [1, 0, 0, 0])
  , importantSelector = new Selector('<!important>', [2, 0, 0, 0])

/**
 * Package version
 */

juice.version = packageJson.version;

/**
 * Export Selector.
 */

juice.Selector = Selector;

/**
 * Export Property.
 */

juice.Property = Property;

/**
 * Export utils.
 */

juice.utils = require('./utils');


juice.ignoredPseudos = ['hover', 'active', 'focus', 'visited', 'link'];

juice.juiceDocument = juiceDocument;
juice.juiceContent = juiceContent;
juice.juiceFile = juiceFile;
juice.inlineDocument = inlineDocument;
juice.inlineContent = inlineContent;

function inlineDocument(document, css) {
  var rules = utils.parseCSS(css)
    , editedElements = []

  rules.forEach(handleRule);
  editedElements.forEach(setStyleAttrs);

  function handleRule(rule) {
    var sel = rule[0]
      , style = rule[1]
      , selector = new Selector(sel)

    // skip rule if the selector has any pseudos which are ignored
    var parsedSelector = selector.parsed();
    for (var i = 0; i < parsedSelector.length; ++i) {
      var subSel = parsedSelector[i];
      if (subSel.pseudos) {
        for (var j = 0; j < subSel.pseudos.length; ++j) {
          var subSelPseudo = subSel.pseudos[j];
          if (juice.ignoredPseudos.indexOf(subSelPseudo.name) >= 0) return;
        }
      }
    }

    var els;
    try {
      els = document.querySelectorAll(sel);
    } catch (err) {
      // skip invalid selector
      return;
    }
    utils.toArray(els).forEach(function (el) {
      if (!el.styleProps) {
        el.styleProps = {}

        // if the element has inline styles, fake selector with topmost specificity
        if (el.getAttribute('style')) {
          var cssText = '* { ' + el.getAttribute('style') + ' } '
          addProps(utils.parseCSS(cssText)[0][1], styleSelector);
        }

        // store reference to an element we need to compile style="" attr for
        editedElements.push(el);
      }

      // go through the properties
      function addProps (style, selector) {
        for (var i = 0, l = style.length; i < l; i++) {
          var name = style[i]
            , value = style[name]
            , sel = style._importants[name] ? importantSelector : selector
            , prop = new Property(name, value, sel)
            , existing = el.styleProps[name]

          if (existing) {
            var winner = existing.compare(prop)
              , loser = prop === winner ? existing : prop

            if (winner === prop) el.styleProps[name] = prop;
          } else {
            el.styleProps[name] = prop;
          }
        }
      }

      addProps(style, selector);
    });
  }

  function setStyleAttrs(el) {
    var style = '';
    for (var i in el.styleProps) {
      style += el.styleProps[i].toString() + ' ';
    }
    el.setAttribute('style', style.trim());
  }
}

function juiceDocument(document, options, callback) {
  assert.ok(options.url, "options.url is required");
  options = getDefaultOptions(options);
  extractCssFromDocument(document, options, function(err, css) {
    css += "\n" + options.extraCss;
    inlineDocumentWithCb(document, css, callback);
  });
}

function specialCharToEntity(s) {  
  var charByEntityName = {'"': '&quot;','&': '&amp;','\'': '&apos;','<': '&lt;','>': '&gt;',' ': '&nbsp;','‑': '&#8209;','¡': '&iexcl;','¢': '&cent;','£': '&pound;','¤': '&curren;','¥': '&yen;','¦': '&brvbar;','§': '&sect;','¨': '&uml;','©': '&copy;','ª': '&ordf;','«': '&laquo;','¬': '&not;','­': '&shy;','®': '&reg;','¯': '&macr;','¯': '&strns;','°': '&deg;','±': '&plusmn;','±': '&pm;','²': '&sup2;','³': '&sup3;','´': '&acute;','µ': '&micro;','¶': '&para;','·': '&middot;','¸': '&cedil;','¹': '&sup1;','º': '&ordm;','»': '&raquo;','¼': '&frac14;','½': '&half;','½': '&frac12;','¾': '&frac34;','¿': '&iquest;','À': '&Agrave;','Á': '&Aacute;','Â': '&Acirc;','Ã': '&Atilde;','Ä': '&Auml;','Å': '&Aring;','Å': '&angst;','Æ': '&AElig;','Ç': '&Ccedil;','È': '&Egrave;','É': '&Eacute;','Ê': '&Ecirc;','Ë': '&Euml;','Ì': '&Igrave;','Í': '&Iacute;','Î': '&Icirc;','Ï': '&Iuml;','Ð': '&ETH;','Ñ': '&Ntilde;','Ò': '&Ograve;','Ó': '&Oacute;','Ô': '&Ocirc;','Õ': '&Otilde;','Ö': '&Ouml;','×': '&times;','Ø': '&Oslash;','Ù': '&Ugrave;','Ú': '&Uacute;','Û': '&Ucirc;','Ü': '&Uuml;','Ý': '&Yacute;','Þ': '&THORN;','ß': '&szlig;','à': '&agrave;','á': '&aacute;','â': '&acirc;','ã': '&atilde;','ä': '&auml;','å': '&aring;','æ': '&aelig;','ç': '&ccedil;','è': '&egrave;','é': '&eacute;','ê': '&ecirc;','ë': '&euml;','ì': '&igrave;','í': '&iacute;','î': '&icirc;','ï': '&iuml;','ð': '&eth;','ñ': '&ntilde;','ò': '&ograve;','ó': '&oacute;','ô': '&ocirc;','õ': '&otilde;','ö': '&ouml;','÷': '&divide;','ø': '&oslash;','ù': '&ugrave;','ú': '&uacute;','û': '&ucirc;','ü': '&uuml;','ý': '&yacute;','þ': '&thorn;','ÿ': '&yuml;','Ā': '&Amacr;','ā': '&amacr;','Ă': '&Abreve;','ă': '&abreve;','Ą': '&Aogon;','ą': '&aogon;','Ć': '&Cacute;','ć': '&cacute;','Ĉ': '&Ccirc;','ĉ': '&ccirc;','Ċ': '&Cdot;','ċ': '&cdot;','Č': '&Ccaron;','č': '&ccaron;','Ď': '&Dcaron;','ď': '&dcaron;','Đ': '&Dstrok;','đ': '&dstrok;','Ē': '&Emacr;','ē': '&emacr;','Ė': '&Edot;','ė': '&edot;','Ę': '&Eogon;','ę': '&eogon;','Ě': '&Ecaron;','ě': '&ecaron;','Ĝ': '&Gcirc;','ĝ': '&gcirc;','Ğ': '&Gbreve;','ğ': '&gbreve;','Ġ': '&Gdot;','ġ': '&gdot;','Ģ': '&Gcedil;','Ĥ': '&Hcirc;','ĥ': '&hcirc;','Ħ': '&Hstrok;','ħ': '&hstrok;','Ĩ': '&Itilde;','ĩ': '&itilde;','Ī': '&Imacr;','ī': '&imacr;','Į': '&Iogon;','į': '&iogon;','İ': '&Idot;','ı': '&inodot;','Ĳ': '&IJlig;','ĳ': '&ijlig;','Ĵ': '&Jcirc;','ĵ': '&jcirc;','Ķ': '&Kcedil;','ķ': '&kcedil;','ĸ': '&kgreen;','Ĺ': '&Lacute;','ĺ': '&lacute;','Ļ': '&Lcedil;','ļ': '&lcedil;','Ľ': '&Lcaron;','ľ': '&lcaron;','Ŀ': '&Lmidot;','ŀ': '&lmidot;','Ł': '&Lstrok;','ł': '&lstrok;','Ń': '&Nacute;','ń': '&nacute;','Ņ': '&Ncedil;','ņ': '&ncedil;','Ň': '&Ncaron;','ň': '&ncaron;','ŉ': '&napos;','Ŋ': '&ENG;','ŋ': '&eng;','Ō': '&Omacr;','ō': '&omacr;','Ő': '&Odblac;','ő': '&odblac;','Œ': '&OElig;','œ': '&oelig;','Ŕ': '&Racute;','ŕ': '&racute;','Ŗ': '&Rcedil;','ŗ': '&rcedil;','Ř': '&Rcaron;','ř': '&rcaron;','Ś': '&Sacute;','ś': '&sacute;','Ŝ': '&Scirc;','ŝ': '&scirc;','Ş': '&Scedil;','ş': '&scedil;','Š': '&Scaron;','š': '&scaron;','Ţ': '&Tcedil;','ţ': '&tcedil;','Ť': '&Tcaron;','ť': '&tcaron;','Ŧ': '&Tstrok;','ŧ': '&tstrok;','Ũ': '&Utilde;','ũ': '&utilde;','Ū': '&Umacr;','ū': '&umacr;','Ŭ': '&Ubreve;','ŭ': '&ubreve;','Ů': '&Uring;','ů': '&uring;','Ű': '&Udblac;','ű': '&udblac;','Ų': '&Uogon;','ų': '&uogon;','Ŵ': '&Wcirc;','ŵ': '&wcirc;','Ŷ': '&Ycirc;','ŷ': '&ycirc;','Ÿ': '&Yuml;','Ź': '&Zacute;','ź': '&zacute;','Ż': '&Zdot;','ż': '&zdot;','Ž': '&Zcaron;','ž': '&zcaron;','ƒ': '&fnof;','Ƶ': '&imped;','ǵ': '&gacute;','ȷ': '&jmath;','ˆ': '&circ;','ˇ': '&caron;','˘': '&breve;','˙': '&dot;','˚': '&ring;','˛': '&ogon;','˜': '&tilde;','˝': '&dblac;','Α': '&Alpha;','Β': '&Beta;','Γ': '&Gamma;','Δ': '&Delta;','Ε': '&Epsilon;','Ζ': '&Zeta;','Η': '&Eta;','Θ': '&Theta;','Ι': '&Iota;','Κ': '&Kappa;','Λ': '&Lambda;','Μ': '&Mu;','Ν': '&Nu;','Ξ': '&Xi;','Ο': '&Omicron;','Π': '&Pi;','Ρ': '&Rho;','Σ': '&Sigma;','Τ': '&Tau;','Υ': '&Upsilon;','Φ': '&Phi;','Χ': '&Chi;','Ψ': '&Psi;','Ω': '&Omega;','Ω': '&ohm;','α': '&alpha;','β': '&beta;','γ': '&gamma;','δ': '&delta;','ε': '&epsilon;','ζ': '&zeta;','η': '&eta;','θ': '&theta;','ι': '&iota;','κ': '&kappa;','λ': '&lambda;','μ': '&mu;','ν': '&nu;','ξ': '&xi;','ο': '&omicron;','π': '&pi;','ρ': '&rho;','ς': '&sigmaf;','ς': '&varsigma;','σ': '&sigma;','τ': '&tau;','υ': '&upsilon;','φ': '&phi;','χ': '&chi;','ψ': '&psi;','ω': '&omega;','ϑ': '&thetasym;','ϑ': '&vartheta;','ϒ': '&upsih;','ϕ': '&varphi;','ϖ': '&piv;','ϖ': '&varpi;','Ϝ': '&Gammad;','ϝ': '&gammad;','ϰ': '&varkappa;','ϱ': '&varrho;','ϵ': '&varepsilon;','϶': '&bepsi;','Ё': '&IOcy;','Ђ': '&DJcy;','Ѓ': '&GJcy;','Є': '&Jukcy;','Ѕ': '&DScy;','І': '&Iukcy;','Ї': '&YIcy;','Ј': '&Jsercy;','Љ': '&LJcy;','Њ': '&NJcy;','Ћ': '&TSHcy;','Ќ': '&KJcy;','Ў': '&Ubrcy;','Џ': '&DZcy;','А': '&Acy;','Б': '&Bcy;','В': '&Vcy;','Г': '&Gcy;','Д': '&Dcy;','Е': '&IEcy;','Ж': '&ZHcy;','З': '&Zcy;','И': '&Icy;','Й': '&Jcy;','К': '&Kcy;','Л': '&Lcy;','М': '&Mcy;','Н': '&Ncy;','О': '&Ocy;','П': '&Pcy;','Р': '&Rcy;','С': '&Scy;','Т': '&Tcy;','У': '&Ucy;','Ф': '&Fcy;','Х': '&KHcy;','Ц': '&TScy;','Ч': '&CHcy;','Ш': '&SHcy;','Щ': '&SHCHcy;','Ъ': '&HARDcy;','Ы': '&Ycy;','Ь': '&SOFTcy;','Э': '&Ecy;','Ю': '&YUcy;','Я': '&YAcy;','а': '&acy;','б': '&bcy;','в': '&vcy;','г': '&gcy;','д': '&dcy;','е': '&iecy;','ж': '&zhcy;','з': '&zcy;','и': '&icy;','й': '&jcy;','к': '&kcy;','л': '&lcy;','м': '&mcy;','н': '&ncy;','о': '&ocy;','п': '&pcy;','р': '&rcy;','с': '&scy;','т': '&tcy;','у': '&ucy;','ф': '&fcy;','х': '&khcy;','ц': '&tscy;','ч': '&chcy;','ш': '&shcy;','щ': '&shchcy;','ъ': '&hardcy;','ы': '&ycy;','ь': '&softcy;','э': '&ecy;','ю': '&yucy;','я': '&yacy;','ё': '&iocy;','ђ': '&djcy;','ѓ': '&gjcy;','є': '&jukcy;','ѕ': '&dscy;','і': '&iukcy;','ї': '&yicy;','ј': '&jsercy;','љ': '&ljcy;','њ': '&njcy;','ћ': '&tshcy;','ќ': '&kjcy;','ў': '&ubrcy;','џ': '&dzcy;',' ': '&ensp;',' ': '&emsp;',' ': '&emsp13;',' ': '&emsp14;',' ': '&numsp;',' ': '&puncsp;',' ': '&thinsp;',' ': '&hairsp;','​': '&ZeroWidthSpace;','‌': '&zwnj;','‍': '&zwj;','‎': '&lrm;','‏': '&rlm;','‐': '&hyphen;','–': '&ndash;','—': '&mdash;','―': '&horbar;','‖': '&Vert;','‘': '&lsquo;','’': '&rsquo;','’': '&rsquor;','‚': '&sbquo;','“': '&ldquo;','”': '&rdquo;','”': '&rdquor;','“': '&ldquo;','„': '&ldquor;','†': '&dagger;','‡': '&Dagger;','‡': '&ddagger;','•': '&bull;','•': '&bullet;','‥': '&nldr;','…': '&hellip;','…': '&mldr;','‰': '&permil;','‱': '&pertenk;','′': '&prime;','″': '&Prime;','‴': '&tprime;','‵': '&bprime;','‹': '&lsaquo;','›': '&rsaquo;','‾': '&oline;','⁁': '&caret;','⁃': '&hybull;','⁄': '&frasl;','⁏': '&bsemi;','⁗': '&qprime;',' ': '&MediumSpace;','⁠': '&NoBreak;','⁡': '&af;','⁢': '&it;','⁣': '&ic;','€': '&euro;','ℂ': '&complexes;','℅': '&incare;','ℊ': '&gscr;','ℋ': '&hamilt;','ℌ': '&Poincareplane;','ℍ': '&quaternions;','ℎ': '&planckh;','ℏ': '&plankv;','ℐ': '&imagline;','ℑ': '&image;','ℑ': '&imagpart;','ℒ': '&lagran;','ℓ': '&ell;','ℕ': '&naturals;','№': '&numero;','℗': '&copysr;','℘': '&weierp;','℘': '&wp;','ℙ': '&primes;','ℚ': '&rationals;','ℛ': '&realine;','ℜ': '&real;','ℜ': '&realpart;','ℝ': '&reals;','℞': '&rx;','™': '&trade;','ℤ': '&integers;','℧': '&mho;','ℨ': '&zeetrf;','℩': '&iiota;','ℬ': '&bernou;','ℭ': '&Cfr;','ℯ': '&escr;','ℰ': '&expectation;','ℱ': '&Fscr;','ℳ': '&phmmat;','ℴ': '&oscr;','ℵ': '&alefsym;','ℵ': '&aleph;','ℶ': '&beth;','ℷ': '&gimel;','ℸ': '&daleth;','ⅅ': '&DD;','ⅆ': '&dd;','ⅇ': '&exponentiale;','ⅈ': '&ii;','⅓': '&frac13;','⅔': '&frac23;','⅕': '&frac15;','⅖': '&frac25;','⅗': '&frac35;','⅘': '&frac45;','⅙': '&frac16;','⅚': '&frac56;','⅛': '&frac18;','⅜': '&frac38;','⅝': '&frac58;','⅞': '&frac78;','←': '&larr;','←': '&slarr;','↑': '&uarr;','↑': '&uparrow;','→': '&rarr;','→': '&srarr;','↓': '&darr;','↓': '&downarrow;','↔': '&harr;','↔': '&leftrightarrow;','↕': '&varr;','↖': '&nwarrow;','↗': '&nearrow;','↘': '&searrow;','↙': '&swarrow;','↚': '&nleftarrow;','↛': '&nrightarrow;','↝': '&rightsquigarrow;','↞': '&twoheadleftarrow;','↟': '&Uarr;','↠': '&twoheadrightarrow;','↡': '&Darr;','↢': '&leftarrowtail;','↣': '&rightarrowtail;','↤': '&mapstoleft;','↥': '&mapstoup;','↦': '&mapsto;','↧': '&mapstodown;','↩': '&larrhk;','↪': '&rarrhk;','↫': '&looparrowleft;','↬': '&rarrlp;','↭': '&leftrightsquigarrow;','↮': '&nleftrightarrow;','↰': '&lsh;','↱': '&rsh;','↲': '&ldsh;','↳': '&rdsh;','↵': '&crarr;','↶': '&curvearrowleft;','↷': '&curvearrowright;','↺': '&olarr;','↻': '&orarr;','↼': '&lharu;','↽': '&lhard;','↾': '&upharpoonright;','↿': '&upharpoonleft;','⇀': '&rightharpoonup;','⇁': '&rightharpoondown;','⇂': '&downharpoonright;','⇃': '&downharpoonleft;','⇄': '&rlarr;','⇅': '&udarr;','⇆': '&lrarr;','⇇': '&llarr;','⇈': '&uuarr;','⇉': '&rrarr;','⇊': '&downdownarrows;','⇋': '&lrhar;','⇌': '&rlhar;','⇍': '&nlArr;','⇎': '&nhArr;','⇏': '&nrArr;','⇐': '&lArr;','⇑': '&uArr;','⇒': '&rArr;','⇓': '&dArr;','⇔': '&hArr;','⇔': '&iff;','⇕': '&vArr;','⇖': '&nwArr;','⇗': '&neArr;','⇘': '&seArr;','⇙': '&swArr;','⇚': '&lAarr;','⇛': '&rAarr;','⇝': '&zigrarr;','⇤': '&larrb;','⇥': '&rarrb;','⇵': '&duarr;','⇽': '&loarr;','⇾': '&roarr;','⇿': '&hoarr;','∀': '&forall;','∁': '&complement;','∂': '&part;','∃': '&exist;','∄': '&nexists;','∅': '&empty;','∅': '&varnothing;','∇': '&nabla;','∈': '&isin;','∈': '&isinv;','∉': '&notin;','∉': '&notinva;','∋': '&ni;','∋': '&niv;','∌': '&notniva;','∏': '&prod;','∐': '&coprod;','∑': '&sum;','−': '&minus;','∓': '&mp;','∔': '&plusdo;','∖': '&ssetmn;','∗': '&lowast;','∘': '&compfn;','√': '&radic;','∝': '&prop;','∝': '&vprop;','∞': '&infin;','∟': '&angrt;','∠': '&ang;','∠': '&angle;','∡': '&measuredangle;','∢': '&angsph;','∣': '&smid;','∤': '&nsmid;','∥': '&spar;','∦': '&nspar;','∧': '&and;','∧': '&wedge;','∨': '&or;','∨': '&vee;','∩': '&cap;','∪': '&cup;','∫': '&int;','∬': '&Int;','∭': '&tint;','∮': '&oint;','∯': '&DoubleContourIntegral;','∰': '&Cconint;','∱': '&cwint;','∲': '&cwconint;','∳': '&awconint;','∴': '&there4;','∴': '&therefore;','∵': '&because;','∶': '&ratio;','∷': '&Proportion;','∸': '&minusd;','∺': '&mDDot;','∻': '&homtht;','∼': '&sim;','∼': '&thksim;','∽': '&bsim;','∾': '&mstpos;','∿': '&acd;','≀': '&wreath;','≁': '&nsim;','≂': '&esim;','≃': '&simeq;','≄': '&nsimeq;','≅': '&cong;','≆': '&simne;','≇': '&ncong;','≈': '&asymp;','≈': '&thkap;','≉': '&napprox;','≊': '&approxeq;','≋': '&apid;','≌': '&bcong;','≍': '&asympeq;','≎': '&bump;','≏': '&bumpeq;','≐': '&esdot;','≑': '&eDot;','≒': '&fallingdotseq;','≓': '&risingdotseq;','≔': '&coloneq;','≕': '&eqcolon;','≖': '&eqcirc;','≗': '&cire;','≙': '&wedgeq;','≚': '&veeeq;','≜': '&trie;','≟': '&questeq;','≠': '&ne;','≡': '&equiv;','≢': '&nequiv;','≤': '&le;','≤': '&leq;','≥': '&ge;','≥': '&geq;','≦': '&leqq;','≧': '&geqq;','≨': '&lneqq;','≩': '&gneqq;','≪': '&ll;','≫': '&gg;','≬': '&twixt;','≭': '&NotCupCap;','≮': '&nlt;','≯': '&ngtr;','≰': '&nleq;','≱': '&ngeq;','≲': '&lsim;','≳': '&gtrsim;','≴': '&nlsim;','≵': '&ngsim;','≶': '&lg;','≷': '&gtrless;','≸': '&ntlg;','≹': '&ntgl;','≺': '&prec;','≻': '&succ;','≼': '&preccurlyeq;','≽': '&succcurlyeq;','≾': '&prsim;','≿': '&succsim;','⊀': '&nprec;','⊁': '&nsucc;','⊂': '&sub;','⊂': '&subset;','⊃': '&sup;','⊃': '&supset;','⊄': '&nsub;','⊅': '&nsup;','⊆': '&sube;','⊆': '&subseteq;','⊇': '&supe;','⊇': '&supseteq;','⊈': '&nsubseteq;','⊉': '&nsupseteq;','⊊': '&subsetneq;','⊋': '&supsetneq;','⊍': '&cupdot;','⊎': '&uplus;','⊏': '&sqsubset;','⊐': '&sqsupset;','⊑': '&sqsubseteq;','⊒': '&sqsupseteq;','⊓': '&sqcap;','⊔': '&sqcup;','⊕': '&oplus;','⊖': '&ominus;','⊗': '&otimes;','⊘': '&osol;','⊙': '&odot;','⊚': '&ocir;','⊛': '&oast;','⊝': '&odash;','⊞': '&plusb;','⊟': '&minusb;','⊠': '&timesb;','⊡': '&sdotb;','⊢': '&vdash;','⊣': '&dashv;','⊤': '&top;','⊥': '&perp;','⊧': '&models;','⊨': '&vDash;','⊩': '&Vdash;','⊪': '&Vvdash;','⊫': '&VDash;','⊬': '&nvdash;','⊭': '&nvDash;','⊮': '&nVdash;','⊯': '&nVDash;','⊰': '&prurel;','⊲': '&vltri;','⊳': '&vrtri;','⊴': '&trianglelefteq;','⊵': '&trianglerighteq;','⊶': '&origof;','⊷': '&imof;','⊸': '&mumap;','⊹': '&hercon;','⊺': '&intercal;','⊻': '&veebar;','⊽': '&barvee;','⊾': '&angrtvb;','⊿': '&lrtri;','⋀': '&xwedge;','⋁': '&xvee;','⋂': '&xcap;','⋃': '&xcup;','⋄': '&diamond;','⋅': '&sdot;','⋆': '&sstarf;','⋇': '&divonx;','⋈': '&bowtie;','⋉': '&ltimes;','⋊': '&rtimes;','⋋': '&lthree;','⋌': '&rthree;','⋍': '&bsime;','⋎': '&cuvee;','⋏': '&cuwed;','⋐': '&Subset;','⋑': '&Supset;','⋒': '&Cap;','⋓': '&Cup;','⋔': '&pitchfork;','⋕': '&epar;','⋖': '&ltdot;','⋗': '&gtrdot;','⋘': '&Ll;','⋙': '&ggg;','⋚': '&lesseqgtr;','⋛': '&gtreqless;','⋞': '&curlyeqprec;','⋟': '&curlyeqsucc;','⋠': '&nprcue;','⋡': '&nsccue;','⋢': '&nsqsube;','⋣': '&nsqsupe;','⋦': '&lnsim;','⋧': '&gnsim;','⋨': '&prnsim;','⋩': '&succnsim;','⋪': '&ntriangleleft;','⋫': '&ntriangleright;','⋬': '&ntrianglelefteq;','⋭': '&ntrianglerighteq;','⋮': '&vellip;','⋯': '&ctdot;','⋰': '&utdot;','⋱': '&dtdot;','⋲': '&disin;','⋳': '&isinsv;','⋴': '&isins;','⋵': '&isindot;','⋶': '&notinvc;','⋷': '&notinvb;','⋹': '&isinE;','⋺': '&nisd;','⋻': '&xnis;','⋼': '&nis;','⋽': '&notnivc;','⋾': '&notnivb;','⌅': '&barwedge;','⌆': '&doublebarwedge;','⌈': '&lceil;','⌉': '&rceil;','⌊': '&lfloor;','⌋': '&rfloor;','⌌': '&drcrop;','⌍': '&dlcrop;','⌎': '&urcrop;','⌏': '&ulcrop;','⌐': '&bnot;','⌒': '&profline;','⌓': '&profsurf;','⌕': '&telrec;','⌖': '&target;','⌜': '&ulcorner;','⌝': '&urcorner;','⌞': '&llcorner;','⌟': '&lrcorner;','⌢': '&sfrown;','⌣': '&ssmile;','〈': '&lang;','〉': '&rang;','⌭': '&cylcty;','⌮': '&profalar;','⌶': '&topbot;','⌽': '&ovbar;','⌿': '&solbar;','⍼': '&angzarr;','⎰': '&lmoustache;','⎱': '&rmoustache;','⎴': '&tbrk;','⎵': '&bbrk;','⎶': '&bbrktbrk;','⏜': '&OverParenthesis;','⏝': '&UnderParenthesis;','⏞': '&OverBrace;','⏟': '&UnderBrace;','⏢': '&trpezium;','⏧': '&elinters;','␣': '&blank;','Ⓢ': '&oS;','─': '&boxh;','│': '&boxv;','┌': '&boxdr;','┐': '&boxdl;','└': '&boxur;','┘': '&boxul;','├': '&boxvr;','┤': '&boxvl;','┬': '&boxhd;','┴': '&boxhu;','┼': '&boxvh;','═': '&boxH;','║': '&boxV;','╒': '&boxdR;','╓': '&boxDr;','╔': '&boxDR;','╕': '&boxdL;','╖': '&boxDl;','╗': '&boxDL;','╘': '&boxuR;','╙': '&boxUr;','╚': '&boxUR;','╛': '&boxuL;','╜': '&boxUl;','╝': '&boxUL;','╞': '&boxvR;','╟': '&boxVr;','╠': '&boxVR;','╡': '&boxvL;','╢': '&boxVl;','╣': '&boxVL;','╤': '&boxHd;','╥': '&boxhD;','╦': '&boxHD;','╧': '&boxHu;','╨': '&boxhU;','╩': '&boxHU;','╪': '&boxvH;','╫': '&boxVh;','╬': '&boxVH;','▀': '&uhblk;','▄': '&lhblk;','█': '&block;','░': '&blk14;','▒': '&blk12;','▓': '&blk34;','□': '&square;','▪': '&squf;','▫': '&EmptyVerySmallSquare;','▭': '&rect;','▮': '&marker;','▱': '&fltns;','△': '&xutri;','▴': '&utrif;','▵': '&utri;','▸': '&rtrif;','▹': '&triangleright;','▽': '&xdtri;','▾': '&dtrif;','▿': '&triangledown;','◂': '&ltrif;','◃': '&triangleleft;','◊': '&loz;','◊': '&lozenge;','○': '&cir;','◬': '&tridot;','◯': '&xcirc;','◸': '&ultri;','◹': '&urtri;','◺': '&lltri;','◻': '&EmptySmallSquare;','◼': '&FilledSmallSquare;','★': '&starf;','☆': '&star;','☎': '&phone;','♀': '&female;','♂': '&male;','♠': '&spades;','♠': '&spadesuit;','♣': '&clubs;','♣': '&clubsuit;','♥': '&hearts;','♥': '&heartsuit;','♦': '&diams;','♪': '&sung;','♭': '&flat;','♮': '&natural;','♯': '&sharp;','✓': '&checkmark;','✗': '&cross;','✠': '&maltese;','✶': '&sext;','❘': '&VerticalSeparator;','❲': '&lbbrk;','❳': '&rbbrk;','⟈': '&bsolhsub;','⟉': '&suphsol;','⟦': '&lobrk;','⟧': '&robrk;','⟨': '&langle;','⟩': '&rangle;','⟪': '&Lang;','⟫': '&Rang;','⟬': '&loang;','⟭': '&roang;','⟵': '&xlarr;','⟶': '&xrarr;','⟷': '&xharr;','⟸': '&xlArr;','⟹': '&xrArr;','⟺': '&xhArr;','⟼': '&xmap;','⟿': '&dzigrarr;','⤂': '&nvlArr;','⤃': '&nvrArr;','⤄': '&nvHarr;','⤅': '&Map;','⤌': '&lbarr;','⤍': '&rbarr;','⤎': '&lBarr;','⤏': '&rBarr;','⤐': '&drbkarow;','⤑': '&DDotrahd;','⤒': '&UpArrowBar;','⤓': '&DownArrowBar;','⤖': '&Rarrtl;','⤙': '&latail;','⤚': '&ratail;','⤛': '&lAtail;','⤜': '&rAtail;','⤝': '&larrfs;','⤞': '&rarrfs;','⤟': '&larrbfs;','⤠': '&rarrbfs;','⤣': '&nwarhk;','⤤': '&nearhk;','⤥': '&searhk;','⤦': '&swarhk;','⤧': '&nwnear;','⤨': '&toea;','⤩': '&tosa;','⤪': '&swnwar;','⤳': '&rarrc;','⤵': '&cudarrr;','⤶': '&ldca;','⤷': '&rdca;','⤸': '&cudarrl;','⤹': '&larrpl;','⤼': '&curarrm;','⤽': '&cularrp;','⥅': '&rarrpl;','⥈': '&harrcir;','⥉': '&Uarrocir;','⥊': '&lurdshar;','⥋': '&ldrushar;','⥎': '&LeftRightVector;','⥏': '&RightUpDownVector;','⥐': '&DownLeftRightVector;','⥑': '&LeftUpDownVector;','⥒': '&LeftVectorBar;','⥓': '&RightVectorBar;','⥔': '&RightUpVectorBar;','⥕': '&RightDownVectorBar;','⥖': '&DownLeftVectorBar;','⥗': '&DownRightVectorBar;','⥘': '&LeftUpVectorBar;','⥙': '&LeftDownVectorBar;','⥚': '&LeftTeeVector;','⥛': '&RightTeeVector;','⥜': '&RightUpTeeVector;','⥝': '&RightDownTeeVector;','⥞': '&DownLeftTeeVector;','⥟': '&DownRightTeeVector;','⥠': '&LeftUpTeeVector;','⥡': '&LeftDownTeeVector;','⥢': '&lHar;','⥣': '&uHar;','⥤': '&rHar;','⥥': '&dHar;','⥦': '&luruhar;','⥧': '&ldrdhar;','⥨': '&ruluhar;','⥩': '&rdldhar;','⥪': '&lharul;','⥫': '&llhard;','⥬': '&rharul;','⥭': '&lrhard;','⥮': '&udhar;','⥯': '&duhar;','⥰': '&RoundImplies;','⥱': '&erarr;','⥲': '&simrarr;','⥳': '&larrsim;','⥴': '&rarrsim;','⥵': '&rarrap;','⥶': '&ltlarr;','⥸': '&gtrarr;','⥹': '&subrarr;','⥻': '&suplarr;','⥼': '&lfisht;','⥽': '&rfisht;','⥾': '&ufisht;','⥿': '&dfisht;','⦅': '&lopar;','⦆': '&ropar;','⦋': '&lbrke;','⦌': '&rbrke;','⦍': '&lbrkslu;','⦎': '&rbrksld;','⦏': '&lbrksld;','⦐': '&rbrkslu;','⦑': '&langd;','⦒': '&rangd;','⦓': '&lparlt;','⦔': '&rpargt;','⦕': '&gtlPar;','⦖': '&ltrPar;','⦚': '&vzigzag;','⦜': '&vangrt;','⦝': '&angrtvbd;','⦤': '&ange;','⦥': '&range;','⦦': '&dwangle;','⦧': '&uwangle;','⦨': '&angmsdaa;','⦩': '&angmsdab;','⦪': '&angmsdac;','⦫': '&angmsdad;','⦬': '&angmsdae;','⦭': '&angmsdaf;','⦮': '&angmsdag;','⦯': '&angmsdah;','⦰': '&bemptyv;','⦱': '&demptyv;','⦲': '&cemptyv;','⦳': '&raemptyv;','⦴': '&laemptyv;','⦵': '&ohbar;','⦶': '&omid;','⦷': '&opar;','⦹': '&operp;','⦻': '&olcross;','⦼': '&odsold;','⦾': '&olcir;','⦿': '&ofcir;','⧀': '&olt;','⧁': '&ogt;','⧂': '&cirscir;','⧃': '&cirE;','⧄': '&solb;','⧅': '&bsolb;','⧉': '&boxbox;','⧍': '&trisb;','⧎': '&rtriltri;','⧏': '&LeftTriangleBar;','⧐': '&RightTriangleBar;','⧜': '&iinfin;','⧝': '&infintie;','⧞': '&nvinfin;','⧣': '&eparsl;','⧤': '&smeparsl;','⧥': '&eqvparsl;','⧫': '&lozf;','⧴': '&RuleDelayed;','⧶': '&dsol;','⨀': '&xodot;','⨁': '&xoplus;','⨂': '&xotime;','⨄': '&xuplus;','⨆': '&xsqcup;','⨌': '&qint;','⨍': '&fpartint;','⨐': '&cirfnint;','⨑': '&awint;','⨒': '&rppolint;','⨓': '&scpolint;','⨔': '&npolint;','⨕': '&pointint;','⨖': '&quatint;','⨗': '&intlarhk;','⨢': '&pluscir;','⨣': '&plusacir;','⨤': '&simplus;','⨥': '&plusdu;','⨦': '&plussim;','⨧': '&plustwo;','⨩': '&mcomma;','⨪': '&minusdu;','⨭': '&loplus;','⨮': '&roplus;','⨯': '&Cross;','⨰': '&timesd;','⨱': '&timesbar;','⨳': '&smashp;','⨴': '&lotimes;','⨵': '&rotimes;','⨶': '&otimesas;','⨷': '&Otimes;','⨸': '&odiv;','⨹': '&triplus;','⨺': '&triminus;','⨻': '&tritime;','⨼': '&iprod;','⨿': '&amalg;','⩀': '&capdot;','⩂': '&ncup;','⩃': '&ncap;','⩄': '&capand;','⩅': '&cupor;','⩆': '&cupcap;','⩇': '&capcup;','⩈': '&cupbrcap;','⩉': '&capbrcup;','⩊': '&cupcup;','⩋': '&capcap;','⩌': '&ccups;','⩍': '&ccaps;','⩐': '&ccupssm;','⩓': '&And;','⩔': '&Or;','⩕': '&andand;','⩖': '&oror;','⩗': '&orslope;','⩘': '&andslope;','⩚': '&andv;','⩛': '&orv;','⩜': '&andd;','⩝': '&ord;','⩟': '&wedbar;','⩦': '&sdote;','⩪': '&simdot;','⩭': '&congdot;','⩮': '&easter;','⩯': '&apacir;','⩰': '&apE;','⩱': '&eplus;','⩲': '&pluse;','⩳': '&Esim;','⩴': '&Colone;','⩵': '&Equal;','⩷': '&eDDot;','⩸': '&equivDD;','⩹': '&ltcir;','⩺': '&gtcir;','⩻': '&ltquest;','⩼': '&gtquest;','⩽': '&les;','⩾': '&ges;','⩿': '&lesdot;','⪀': '&gesdot;','⪁': '&lesdoto;','⪂': '&gesdoto;','⪃': '&lesdotor;','⪄': '&gesdotol;','⪅': '&lessapprox;','⪆': '&gtrapprox;','⪇': '&lneq;','⪈': '&gneq;','⪉': '&lnapprox;','⪊': '&gnapprox;','⪋': '&lesseqqgtr;','⪌': '&gtreqqless;','⪍': '&lsime;','⪎': '&gsime;','⪏': '&lsimg;','⪐': '&gsiml;','⪑': '&lgE;','⪒': '&glE;','⪓': '&lesges;','⪔': '&gesles;','⪕': '&eqslantless;','⪖': '&eqslantgtr;','⪗': '&elsdot;','⪘': '&egsdot;','⪙': '&el;','⪚': '&eg;','⪝': '&siml;','⪞': '&simg;','⪟': '&simlE;','⪠': '&simgE;','⪡': '&LessLess;','⪢': '&GreaterGreater;','⪤': '&glj;','⪥': '&gla;','⪦': '&ltcc;','⪧': '&gtcc;','⪨': '&lescc;','⪩': '&gescc;','⪪': '&smt;','⪫': '&lat;','⪬': '&smte;','⪭': '&late;','⪮': '&bumpE;','⪯': '&preceq;','⪰': '&succeq;','⪳': '&prE;','⪴': '&scE;','⪵': '&prnE;','⪶': '&succneqq;','⪷': '&precapprox;','⪸': '&succapprox;','⪹': '&prnap;','⪺': '&succnapprox;','⪻': '&Pr;','⪼': '&Sc;','⪽': '&subdot;','⪾': '&supdot;','⪿': '&subplus;','⫀': '&supplus;','⫁': '&submult;','⫂': '&supmult;','⫃': '&subedot;','⫄': '&supedot;','⫅': '&subseteqq;','⫆': '&supseteqq;','⫇': '&subsim;','⫈': '&supsim;','⫋': '&subsetneqq;','⫌': '&supsetneqq;','⫏': '&csub;','⫐': '&csup;','⫑': '&csube;','⫒': '&csupe;','⫓': '&subsup;','⫔': '&supsub;','⫕': '&subsub;','⫖': '&supsup;','⫗': '&suphsub;','⫘': '&supdsub;','⫙': '&forkv;','⫚': '&topfork;','⫛': '&mlcp;','⫤': '&DoubleLeftTee;','⫦': '&Vdashl;','⫧': '&Barv;','⫨': '&vBar;','⫩': '&vBarv;','⫫': '&Vbar;','⫬': '&Not;','⫭': '&bNot;','⫮': '&rnmid;','⫯': '&cirmid;','⫰': '&midcir;','⫱': '&topcir;','⫲': '&nhpar;','⫳': '&parsim;','⫽': '&parsl;','ﬀ': '&fflig;','ﬁ': '&filig;','ﬂ': '&fllig;','ﬃ': '&ffilig;','ﬄ': '&ffllig;','풜': '&Ascr;','풞': '&Cscr;','풟': '&Dscr;','풢': '&Gscr;','풥': '&Jscr;','풦': '&Kscr;','풩': '&Nscr;','풪': '&Oscr;','풫': '&Pscr;','풬': '&Qscr;','풮': '&Sscr;','풯': '&Tscr;','풰': '&Uscr;','풱': '&Vscr;','풲': '&Wscr;','풳': '&Xscr;','풴': '&Yscr;','풵': '&Zscr;','풶': '&ascr;','풷': '&bscr;','풸': '&cscr;','풹': '&dscr;','풻': '&fscr;','풽': '&hscr;','풾': '&iscr;','풿': '&jscr;','퓀': '&kscr;','퓁': '&lscr;','퓂': '&mscr;','퓃': '&nscr;','퓅': '&pscr;','퓆': '&qscr;','퓇': '&rscr;','퓈': '&sscr;','퓉': '&tscr;','퓊': '&uscr;','퓋': '&vscr;','퓌': '&wscr;','퓍': '&xscr;','퓎': '&yscr;','퓏': '&zscr;','프': '&Afr;','픅': '&Bfr;','픇': '&Dfr;','픈': '&Efr;','픉': '&Ffr;','픊': '&Gfr;','픍': '&Jfr;','픎': '&Kfr;','픏': '&Lfr;','픐': '&Mfr;','픑': '&Nfr;','픒': '&Ofr;','픓': '&Pfr;','픔': '&Qfr;','픖': '&Sfr;','픗': '&Tfr;','픘': '&Ufr;','픙': '&Vfr;','픚': '&Wfr;','픛': '&Xfr;','픜': '&Yfr;','픞': '&afr;','픟': '&bfr;','픠': '&cfr;','픡': '&dfr;','픢': '&efr;','픣': '&ffr;','픤': '&gfr;','픥': '&hfr;','픦': '&ifr;','픧': '&jfr;','픨': '&kfr;','픩': '&lfr;','픪': '&mfr;','픫': '&nfr;','픬': '&ofr;','픭': '&pfr;','픮': '&qfr;','픯': '&rfr;','픰': '&sfr;','픱': '&tfr;','픲': '&ufr;','픳': '&vfr;','픴': '&wfr;','픵': '&xfr;','픶': '&yfr;','픷': '&zfr;','픸': '&Aopf;','픹': '&Bopf;','픻': '&Dopf;','피': '&Eopf;','픽': '&Fopf;','픾': '&Gopf;','핀': '&Iopf;','핁': '&Jopf;','핂': '&Kopf;','핃': '&Lopf;','필': '&Mopf;','핆': '&Oopf;','핊': '&Sopf;','핋': '&Topf;','핌': '&Uopf;','핍': '&Vopf;','핎': '&Wopf;','핏': '&Xopf;','핐': '&Yopf;','핒': '&aopf;','핓': '&bopf;','핔': '&copf;','핕': '&dopf;','핖': '&eopf;','핗': '&fopf;','하': '&gopf;','학': '&hopf;','핚': '&iopf;','핛': '&jopf;','한': '&kopf;','핝': '&lopf;','핞': '&mopf;','핟': '&nopf;','할': '&oopf;','핡': '&popf;','핢': '&qopf;','핣': '&ropf;','핤': '&sopf;','핥': '&topf;','핦': '&uopf;','핧': '&vopf;','함': '&wopf;','합': '&xopf;','핪': '&yopf;','zopf': '핫'};
  var entity = charByEntityName[s];
  return entity ? entity : s;
}

function htmlEncode(s){
  var specialCharEntities = /[‑¡¢£¤¥¦§¨©ª«¬­®¯¯°±±²³´µ¶·¸¹º»¼½½¾¿ÀÁÂÃÄÅÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿĀāĂăĄąĆćĈĉĊċČčĎďĐđĒēĖėĘęĚěĜĝĞğĠġĢĤĥĦħĨĩĪīĮįİıĲĳĴĵĶķĸĹĺĻļĽľĿŀŁłŃńŅņŇňŉŊŋŌōŐőŒœŔŕŖŗŘřŚśŜŝŞşŠšŢţŤťŦŧŨũŪūŬŭŮůŰűŲųŴŵŶŷŸŹźŻżŽžƒƵǵȷˆˇ˘˙˚˛˜˝ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩΩαβγδεζηθικλμνξοπρςςστυφχψωϑϑϒϕϖϖϜϝϰϱϵ϶ЁЂЃЄЅІЇЈЉЊЋЌЎЏАБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдежзийклмнопрстуфхцчшщъыьэюяёђѓєѕіїјљњћќўџ        ​‌‍‎‏‐–—―‖‘’’‚“””“„†‡‡••‥……‰‱′″‴‵‹›‾⁁⁃⁄⁏⁗ ⁠⁡⁢⁣€ℂ℅ℊℋℌℍℎℏℐℑℑℒℓℕ№℗℘℘ℙℚℛℜℜℝ℞™ℤ℧ℨ℩ℬℭℯℰℱℳℴℵℵℶℷℸⅅⅆⅇⅈ⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞←←↑↑→→↓↓↔↔↕↖↗↘↙↚↛↝↞↟↠↡↢↣↤↥↦↧↩↪↫↬↭↮↰↱↲↳↵↶↷↺↻↼↽↾↿⇀⇁⇂⇃⇄⇅⇆⇇⇈⇉⇊⇋⇌⇍⇎⇏⇐⇑⇒⇓⇔⇔⇕⇖⇗⇘⇙⇚⇛⇝⇤⇥⇵⇽⇾⇿∀∁∂∃∄∅∅∇∈∈∉∉∋∋∌∏∐∑−∓∔∖∗∘√∝∝∞∟∠∠∡∢∣∤∥∦∧∧∨∨∩∪∫∬∭∮∯∰∱∲∳∴∴∵∶∷∸∺∻∼∼∽∾∿≀≁≂≃≄≅≆≇≈≈≉≊≋≌≍≎≏≐≑≒≓≔≕≖≗≙≚≜≟≠≡≢≤≤≥≥≦≧≨≩≪≫≬≭≮≯≰≱≲≳≴≵≶≷≸≹≺≻≼≽≾≿⊀⊁⊂⊂⊃⊃⊄⊅⊆⊆⊇⊇⊈⊉⊊⊋⊍⊎⊏⊐⊑⊒⊓⊔⊕⊖⊗⊘⊙⊚⊛⊝⊞⊟⊠⊡⊢⊣⊤⊥⊧⊨⊩⊪⊫⊬⊭⊮⊯⊰⊲⊳⊴⊵⊶⊷⊸⊹⊺⊻⊽⊾⊿⋀⋁⋂⋃⋄⋅⋆⋇⋈⋉⋊⋋⋌⋍⋎⋏⋐⋑⋒⋓⋔⋕⋖⋗⋘⋙⋚⋛⋞⋟⋠⋡⋢⋣⋦⋧⋨⋩⋪⋫⋬⋭⋮⋯⋰⋱⋲⋳⋴⋵⋶⋷⋹⋺⋻⋼⋽⋾⌅⌆⌈⌉⌊⌋⌌⌍⌎⌏⌐⌒⌓⌕⌖⌜⌝⌞⌟⌢⌣〈〉⌭⌮⌶⌽⌿⍼⎰⎱⎴⎵⎶⏜⏝⏞⏟⏢⏧␣Ⓢ─│┌┐└┘├┤┬┴┼═║╒╓╔╕╖╗╘╙╚╛╜╝╞╟╠╡╢╣╤╥╦╧╨╩╪╫╬▀▄█░▒▓□▪▫▭▮▱△▴▵▸▹▽▾▿◂◃◊◊○◬◯◸◹◺◻◼★☆☎♀♂♠♠♣♣♥♥♦♪♭♮♯✓✗✠✶❘❲❳⟈⟉⟦⟧⟨⟩⟪⟫⟬⟭⟵⟶⟷⟸⟹⟺⟼⟿⤂⤃⤄⤅⤌⤍⤎⤏⤐⤑⤒⤓⤖⤙⤚⤛⤜⤝⤞⤟⤠⤣⤤⤥⤦⤧⤨⤩⤪⤳⤵⤶⤷⤸⤹⤼⤽⥅⥈⥉⥊⥋⥎⥏⥐⥑⥒⥓⥔⥕⥖⥗⥘⥙⥚⥛⥜⥝⥞⥟⥠⥡⥢⥣⥤⥥⥦⥧⥨⥩⥪⥫⥬⥭⥮⥯⥰⥱⥲⥳⥴⥵⥶⥸⥹⥻⥼⥽⥾⥿⦅⦆⦋⦌⦍⦎⦏⦐⦑⦒⦓⦔⦕⦖⦚⦜⦝⦤⦥⦦⦧⦨⦩⦪⦫⦬⦭⦮⦯⦰⦱⦲⦳⦴⦵⦶⦷⦹⦻⦼⦾⦿⧀⧁⧂⧃⧄⧅⧉⧍⧎⧏⧐⧜⧝⧞⧣⧤⧥⧫⧴⧶⨀⨁⨂⨄⨆⨌⨍⨐⨑⨒⨓⨔⨕⨖⨗⨢⨣⨤⨥⨦⨧⨩⨪⨭⨮⨯⨰⨱⨳⨴⨵⨶⨷⨸⨹⨺⨻⨼⨿⩀⩂⩃⩄⩅⩆⩇⩈⩉⩊⩋⩌⩍⩐⩓⩔⩕⩖⩗⩘⩚⩛⩜⩝⩟⩦⩪⩭⩮⩯⩰⩱⩲⩳⩴⩵⩷⩸⩹⩺⩻⩼⩽⩾⩿⪀⪁⪂⪃⪄⪅⪆⪇⪈⪉⪊⪋⪌⪍⪎⪏⪐⪑⪒⪓⪔⪕⪖⪗⪘⪙⪚⪝⪞⪟⪠⪡⪢⪤⪥⪦⪧⪨⪩⪪⪫⪬⪭⪮⪯⪰⪳⪴⪵⪶⪷⪸⪹⪺⪻⪼⪽⪾⪿⫀⫁⫂⫃⫄⫅⫆⫇⫈⫋⫌⫏⫐⫑⫒⫓⫔⫕⫖⫗⫘⫙⫚⫛⫤⫦⫧⫨⫩⫫⫬⫭⫮⫯⫰⫱⫲⫳⫽ﬀﬁﬂﬃﬄ풜풞풟풢풥풦풩풪풫풬풮풯풰풱풲풳풴풵풶풷풸풹풻풽풾풿퓀퓁퓂퓃퓅퓆퓇퓈퓉퓊퓋퓌퓍퓎퓏프픅픇픈픉픊픍픎픏픐픑픒픓픔픖픗픘픙픚픛픜픞픟픠픡픢픣픤픥픦픧픨픩픪픫픬픭픮픯픰픱픲픳픴픵픶픷픸픹픻피픽픾핀핁핂핃필핆핊핋핌핍핎핏핐핒핓핔핕핖핗하학핚핛한핝핞핟할핡핢핣핤핥핦핧함합핪\핫]/g;
    return s.replace(specialCharEntities, specialCharToEntity);
}

function juiceContent(html, options, callback) {
  assert.ok(options.url, "options.url is required");
  options = getDefaultOptions(options);
  // hack to force jsdom to see this argument as html content, not a url
  // or a filename. https://github.com/tmpvar/jsdom/issues/554
  html += "\n";

  var document = utils.jsdom(html);

  juiceDocument(document, options, function(err) {
    if (err) {
     // free the associated memory
     // with lazily created parentWindow
     try {
       document.parentWindow.close();
     } catch (cleanupErr) {}
     callback(err);
    }

    var inner = document.innerHTML;

    if(options.addDoctype && options.preserveEntities) {
     inner = options.addDoctype + document.innerHTML;
     // free the associated memory
     // with lazily created parentWindow
     try {
       document.parentWindow.close();
     } catch (cleanupErr) {}
      return callback(null, htmlEncode(inner));
    } 

    if(options.preserveEntities) {
     // free the associated memory
     // with lazily created parentWindow
     try {
       document.parentWindow.close();
     } catch (cleanupErr) {}
     return callback(null, htmlEncode(inner));
    } 

    if(options.addDoctype) {
     inner = options.addDoctype + document.innerHTML;
     // free the associated memory
     // with lazily created parentWindow
     try {
       document.parentWindow.close();
     } catch (cleanupErr) {}
      return callback(null, inner);
    } else{
      
      // free the associated memory
       // with lazily created parentWindow
       try {
         document.parentWindow.close();
       } catch (cleanupErr) {}
       callback(null, inner);
    }
  });
}

function getDefaultOptions(options) {
  return utils.extend({
    addDoctype: "",
    extraCss: "",
    preserveEntities: true,
    applyStyleTags: true,
    removeStyleTags: true,
    applyLinkTags: true,
    removeLinkTags: true,
  }, options);
}

function juiceFile(filePath, options, callback) {
  // set default options
  fs.readFile(filePath, 'utf8', function(err, content) {
    if (err) return callback(err);
    options = getDefaultOptions(options); // so we can mutate options without guilt
    var slashes = os.platform() === 'win32' ? '\\\\' : '//';
    options.url = options.url || ("file:" + slashes + path.resolve(process.cwd(), filePath));
    juiceContent(content, options, callback);
  });
}

function inlineContent(html, css) {
  var document = utils.jsdom(html);
  inlineDocument(document, css);
  var inner = document.innerHTML;
  // free the associated memory
  // with lazily created parentWindow
  try {
    document.parentWindow.close();
  } catch (cleanupErr) {}
  return inner;
}

/**
 * Inlines the CSS specified by `css` into the `html`
 *
 * @param {String} html
 * @param {String} css
 * @api public
 */

function juice (arg1, arg2, arg3) {
  // legacy behavior
  if (typeof arg2 === 'string') return inlineContent(arg1, arg2);
  var options = arg3 ? arg2 : {};
  var callback = arg3 ? arg3 : arg2;
  juiceFile(arg1, options, callback);
}

function inlineDocumentWithCb(document, css, callback) {
  try {
    inlineDocument(document, css);
    callback();
  } catch (err) {
    callback(err);
  }
}

function getStylesData(document, options, callback) {
  var results = [];
  var stylesList = document.getElementsByTagName("style");
  var i, styleDataList, styleData, styleElement;
  for (i = 0; i < stylesList.length; ++i) {
    styleElement = stylesList[i];
    styleDataList = styleElement.childNodes;
    if (styleDataList.length !== 1) {
      callback(new Error("empty style element"));
      return;
    }
    styleData = styleDataList[0].data;
    if (options.applyStyleTags && !styleElement.hasAttribute('data-ignore')) results.push(styleData);
    if (options.removeStyleTags && !styleElement.hasAttribute('data-ignore')) styleElement.parentNode.removeChild(styleElement);
  }
  callback(null, results);
}

function getHrefContent(destHref, sourceHref, callback) {
  var resolvedUrl = url.resolve(sourceHref, destHref);
  var parsedUrl = url.parse(resolvedUrl);
  if (parsedUrl.protocol === 'file:') {
    fs.readFile(parsedUrl.pathname, 'utf8', callback);
  } else {
    getRemoteContent(resolvedUrl, callback);
  }
}

function getRemoteContent(remoteUrl, callback) {
  superagent.get(remoteUrl).buffer().end(function(err, resp) {
    if (err) {
      callback(err);
    } else if (resp.ok) {
      callback(null, resp.text);
    } else {
      callback(new Error("GET " + remoteUrl + " " + resp.status));
    }
  });
}

function getStylesheetList(document, options) {
  var results = [];
  var linkList = document.getElementsByTagName("link");
  var link, i, j, attr, attrs;
  for (i = 0; i < linkList.length; ++i) {
    link = linkList[i];
    attrs = {};
    for (j = 0; j < link.attributes.length; ++j) {
      attr = link.attributes[j];
      attrs[attr.name.toLowerCase()] = attr.value;
    }
    if (attrs.rel && attrs.rel.toLowerCase() === 'stylesheet') {
      if (options.applyLinkTags) results.push(attrs.href);
      if (options.removeLinkTags) link.parentNode.removeChild(link);
    }
  }
  return results;
}

function extractCssFromDocument(document, options, callback) {
  var batch = new Batch();
  batch.push(function(callback) { getStylesData(document, options, callback); });
  getStylesheetList(document, options).forEach(function(stylesheetHref) {
    batch.push(function(callback) {
      getHrefContent(stylesheetHref, options.url, callback);
    });
  });
  batch.end(function(err, results) {
    if (err) return callback(err);
    var stylesData = results.shift();
    results.forEach(function(content) {
      stylesData.push(content);
    });
    var css = stylesData.join("\n");
    callback(null, css);
  });
}

