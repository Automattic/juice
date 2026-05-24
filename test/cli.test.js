import assert from 'assert';
import fs from 'fs';
import spawn from 'cross-spawn';
import cli from '../lib/cli.js';

beforeAll(() => {
  if (!fs.existsSync('tmp')) fs.mkdirSync('tmp');
});

let tmpCounter = 0;
const tmpPath = (name) => `tmp/cli-${process.pid}-${++tmpCounter}-${name}`;

function runCliInProcess(argv, overrides = {}) {
  const exitCalls = [];
  const errorCalls = [];
  return new Promise((resolve, reject) => {
    cli.run(
      ['node', 'bin/juice', ...argv],
      Object.assign(
        {
          exit: (code) => exitCalls.push(code),
          error: (msg) => errorCalls.push(msg),
          done: (err) => err ? reject(Object.assign(err, { exitCalls, errorCalls })) : resolve({ exitCalls, errorCalls }),
        },
        overrides
      )
    );
  });
}

it('cli parses options', () => {
  const parseArgs = (args) => cli.argsToOptions({ getOptionValue: (arg) => args[arg] });
  assert.strictEqual(parseArgs({'css': 'file.css'}).cssFile, 'file.css');
  assert.strictEqual(parseArgs({'optionsFile': 'options.json'}).optionsFile, 'options.json');
  assert.strictEqual(parseArgs({'extraCss': 'body{color:red;}'}).extraCss, 'body{color:red;}');
  assert.strictEqual(parseArgs({'insertPreservedExtraCss': 'true'}).insertPreservedExtraCss, true);
  assert.strictEqual(parseArgs({'applyStyleTags': 'true'}).applyStyleTags, true);
  assert.strictEqual(parseArgs({'removeStyleTags': 'true'}).removeStyleTags, true);
  assert.strictEqual(parseArgs({'preserveImportant': 'true'}).preserveImportant, true);
  assert.strictEqual(parseArgs({'preserveMediaQueries': 'true'}).preserveMediaQueries, true);
  assert.strictEqual(parseArgs({'preserveFontFaces': 'true'}).preserveFontFaces, true);
  assert.strictEqual(parseArgs({'preserveKeyFrames': 'true'}).preserveKeyFrames, true);
  assert.strictEqual(parseArgs({'applyWidthAttributes': 'true'}).applyWidthAttributes, true);
  assert.strictEqual(parseArgs({'applyHeightAttributes': 'true'}).applyHeightAttributes, true);
  assert.strictEqual(parseArgs({'applyAttributesTableElements': 'true'}).applyAttributesTableElements, true);
  assert.strictEqual(parseArgs({'xmlMode': 'true'}).xmlMode, true);
  assert.strictEqual(parseArgs({'resolveCSSVariables': 'true'}).resolveCSSVariables, true);
  assert.strictEqual(parseArgs({'decodeStyleAttributes': 'true'}).decodeStyleAttributes, true);
  assert.strictEqual(parseArgs({'webResourcesInlineAttribute': 'true'}).webResources.inlineAttribute, true);
  assert.strictEqual(parseArgs({'webResourcesImages': '12'}).webResources.images, 12);
  assert.strictEqual(parseArgs({'webResourcesLinks': 'true'}).webResources.links, true);
  assert.strictEqual(parseArgs({'webResourcesScripts': '24'}).webResources.scripts, 24);
  assert.strictEqual(parseArgs({'webResourcesRelativeTo': 'web'}).webResources.relativeTo, 'web');
  assert.strictEqual(parseArgs({'webResourcesRebaseRelativeTo': 'root'}).webResources.rebaseRelativeTo, 'root');
  assert.strictEqual(parseArgs({'webResourcesStrict': 'true'}).webResources.strict, true);
});

it('getProgram parses argv into commander program', () => {
  const program = cli.getProgram(['node', 'bin/juice', 'in.html', 'out.html', '--css', 'extra.css', '--remove-style-tags', 'true']);
  assert.deepStrictEqual(program.args, ['in.html', 'out.html']);
  assert.strictEqual(program.getOptionValue('css'), 'extra.css');
  assert.strictEqual(program.getOptionValue('removeStyleTags'), 'true');
});

it('run shows help and skips juicing when args < 2', async () => {
  const helpCalls = [];
  let juiceCalled = false;
  const fakeProgram = {
    args: [],
    help: () => helpCalls.push(true),
    getOptionValue: () => undefined,
  };
  const originalGetProgram = cli.getProgram;
  cli.getProgram = () => fakeProgram;
  try {
    cli.run(['node', 'bin/juice'], {
      juice: { juiceFile: () => { juiceCalled = true; } },
      done: () => {},
    });
  } finally {
    cli.getProgram = originalGetProgram;
  }
  assert.strictEqual(helpCalls.length, 1);
  assert.strictEqual(juiceCalled, false);
});

it('run inlines plain html into the output file', async () => {
  const inputPath = 'test/cases/juice-content/no-css.html';
  const expectedPath = 'test/cases/juice-content/no-css.out';
  const outputPath = tmpPath('plain.html');

  const { exitCalls, errorCalls } = await runCliInProcess([inputPath, outputPath]);

  assert.deepStrictEqual(exitCalls, []);
  assert.deepStrictEqual(errorCalls, []);
  assert.strictEqual(
    fs.readFileSync(outputPath, 'utf8'),
    fs.readFileSync(expectedPath, 'utf8')
  );
});

it('run with --css inlines an extra stylesheet', async () => {
  const htmlPath = 'test/cases/integration.html';
  const cssPath = 'test/cases/integration.css';
  const expectedPath = 'test/cases/integration.out';
  const outputPath = tmpPath('integration.html');

  await runCliInProcess([
    htmlPath,
    '--css', cssPath,
    '--apply-width-attributes', 'false',
    outputPath,
  ]);

  assert.strictEqual(
    fs.readFileSync(outputPath, 'utf8'),
    fs.readFileSync(expectedPath, 'utf8')
  );
});

it('run with --options-file applies options from JSON', async () => {
  const htmlPath = 'test/cases/juice-content/font-face-preserve.html';
  const optionsFilePath = 'test/cases/juice-content/font-face-preserve.json';
  const expectedPath = 'test/cases/juice-content/font-face-preserve.out';
  const outputPath = tmpPath('options-file.html');

  await runCliInProcess([htmlPath, '--options-file', optionsFilePath, outputPath]);

  assert.strictEqual(
    fs.readFileSync(outputPath, 'utf8').replace(/\r/g, ''),
    fs.readFileSync(expectedPath, 'utf8')
  );
});

it('run merges --options-file with CLI flags (CLI wins on top-level)', async () => {
  const captured = {};
  const fakeJuice = {
    juiceFile: (input, options, cb) => {
      captured.input = input;
      captured.options = options;
      cb(null, '<html></html>');
    },
  };
  const fakeFs = {
    writeFile: (_p, _html, cb) => cb(null),
    readFile: fs.readFile,
  };

  await runCliInProcess(
    [
      'in.html',
      '--options-file', 'test/cases/juice-content/font-face-preserve.json',
      '--remove-style-tags', 'false',
      '--web-resources-images', '99',
      'out.html',
    ],
    { juice: fakeJuice, fs: fakeFs }
  );

  // --remove-style-tags from CLI (false) wins over the JSON file's `true`
  assert.strictEqual(captured.options.removeStyleTags, false);
  // values only in the JSON file pass through
  assert.strictEqual(captured.options.preserveFontFaces, true);
  // CLI webResources value lands under webResources
  assert.strictEqual(captured.options.webResources.images, 99);
  // optionsFile / cssFile keys are stripped before juiceFile call
  assert.strictEqual(captured.options.optionsFile, undefined);
  assert.strictEqual(captured.options.cssFile, undefined);
});

it('run reports error and exits 1 when juiceFile fails', async () => {
  const fakeJuice = {
    juiceFile: (_input, _options, cb) => cb(new Error('boom')),
  };

  await assert.rejects(
    runCliInProcess(['in.html', 'out.html'], { juice: fakeJuice }),
    (err) => {
      assert.deepStrictEqual(err.exitCalls, [1]);
      assert.strictEqual(err.errorCalls.length, 1);
      assert.match(err.errorCalls[0], /boom/);
      return true;
    }
  );
});

it('run reports error and exits 1 when --css file is missing', async () => {
  await assert.rejects(
    runCliInProcess(['in.html', '--css', 'does-not-exist.css', 'out.html']),
    (err) => {
      assert.deepStrictEqual(err.exitCalls, [1]);
      assert.match(err.errorCalls[0], /ENOENT/);
      return true;
    }
  );
});

// Smoke test: shells out to bin/juice to prove the shebang + bin wiring
// still works end-to-end. The other CLI paths are exercised in-process
// above against cli.run() directly so v8 coverage actually sees them.
it('bin/juice smoke test (spawn)', () => new Promise((resolve, reject) => {
  const inputPath = 'test/cases/juice-content/no-css.html';
  const expectedPath = 'test/cases/juice-content/no-css.out';
  const outputPath = 'tmp/bin-smoke.out';
  const juiceProcess = spawn('bin/juice', [inputPath, outputPath]);
  juiceProcess.on('error', reject);
  juiceProcess.on('exit', (code) => {
    try {
      assert.strictEqual(code, 0, 'bin/juice exited with non-zero');
      assert.strictEqual(
        fs.readFileSync(outputPath, 'utf8'),
        fs.readFileSync(expectedPath, 'utf8')
      );
      resolve();
    } catch (err) {
      reject(err);
    }
  });
}));
