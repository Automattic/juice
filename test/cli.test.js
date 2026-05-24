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
  expect(parseArgs({'css': 'file.css'}).cssFile).toBe('file.css');
  expect(parseArgs({'optionsFile': 'options.json'}).optionsFile).toBe('options.json');
  expect(parseArgs({'extraCss': 'body{color:red;}'}).extraCss).toBe('body{color:red;}');
  expect(parseArgs({'insertPreservedExtraCss': 'true'}).insertPreservedExtraCss).toBe(true);
  expect(parseArgs({'applyStyleTags': 'true'}).applyStyleTags).toBe(true);
  expect(parseArgs({'removeStyleTags': 'true'}).removeStyleTags).toBe(true);
  expect(parseArgs({'preserveImportant': 'true'}).preserveImportant).toBe(true);
  expect(parseArgs({'preserveMediaQueries': 'true'}).preserveMediaQueries).toBe(true);
  expect(parseArgs({'preserveFontFaces': 'true'}).preserveFontFaces).toBe(true);
  expect(parseArgs({'preserveKeyFrames': 'true'}).preserveKeyFrames).toBe(true);
  expect(parseArgs({'applyWidthAttributes': 'true'}).applyWidthAttributes).toBe(true);
  expect(parseArgs({'applyHeightAttributes': 'true'}).applyHeightAttributes).toBe(true);
  expect(parseArgs({'applyAttributesTableElements': 'true'}).applyAttributesTableElements).toBe(true);
  expect(parseArgs({'xmlMode': 'true'}).xmlMode).toBe(true);
  expect(parseArgs({'resolveCSSVariables': 'true'}).resolveCSSVariables).toBe(true);
  expect(parseArgs({'decodeStyleAttributes': 'true'}).decodeStyleAttributes).toBe(true);
  expect(parseArgs({'webResourcesInlineAttribute': 'true'}).webResources.inlineAttribute).toBe(true);
  expect(parseArgs({'webResourcesImages': '12'}).webResources.images).toBe(12);
  expect(parseArgs({'webResourcesLinks': 'true'}).webResources.links).toBe(true);
  expect(parseArgs({'webResourcesScripts': '24'}).webResources.scripts).toBe(24);
  expect(parseArgs({'webResourcesRelativeTo': 'web'}).webResources.relativeTo).toBe('web');
  expect(parseArgs({'webResourcesRebaseRelativeTo': 'root'}).webResources.rebaseRelativeTo).toBe('root');
  expect(parseArgs({'webResourcesStrict': 'true'}).webResources.strict).toBe(true);
});

it('getProgram parses argv into commander program', () => {
  const program = cli.getProgram(['node', 'bin/juice', 'in.html', 'out.html', '--css', 'extra.css', '--remove-style-tags', 'true']);
  expect(program.args).toStrictEqual(['in.html', 'out.html']);
  expect(program.getOptionValue('css')).toBe('extra.css');
  expect(program.getOptionValue('removeStyleTags')).toBe('true');
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
  expect(helpCalls.length).toBe(1);
  expect(juiceCalled).toBe(false);
});

it('run inlines plain html into the output file', async () => {
  const inputPath = 'test/cases/juice-content/no-css.html';
  const expectedPath = 'test/cases/juice-content/no-css.out';
  const outputPath = tmpPath('plain.html');

  const { exitCalls, errorCalls } = await runCliInProcess([inputPath, outputPath]);

  expect(exitCalls).toStrictEqual([]);
  expect(errorCalls).toStrictEqual([]);
  expect(fs.readFileSync(outputPath, 'utf8'))
    .toBe(fs.readFileSync(expectedPath, 'utf8'));
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

  expect(fs.readFileSync(outputPath, 'utf8'))
    .toBe(fs.readFileSync(expectedPath, 'utf8'));
});

it('run with --options-file applies options from JSON', async () => {
  const htmlPath = 'test/cases/juice-content/font-face-preserve.html';
  const optionsFilePath = 'test/cases/juice-content/font-face-preserve.json';
  const expectedPath = 'test/cases/juice-content/font-face-preserve.out';
  const outputPath = tmpPath('options-file.html');

  await runCliInProcess([htmlPath, '--options-file', optionsFilePath, outputPath]);

  expect(fs.readFileSync(outputPath, 'utf8').replace(/\r/g, ''))
    .toBe(fs.readFileSync(expectedPath, 'utf8'));
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
  expect(captured.options.removeStyleTags).toBe(false);
  // values only in the JSON file pass through
  expect(captured.options.preserveFontFaces).toBe(true);
  // CLI webResources value lands under webResources
  expect(captured.options.webResources.images).toBe(99);
  // optionsFile / cssFile keys are stripped before juiceFile call
  expect(captured.options.optionsFile).toBeUndefined();
  expect(captured.options.cssFile).toBeUndefined();
});

it('run reports error and exits 1 when juiceFile fails', async () => {
  const fakeJuice = {
    juiceFile: (_input, _options, cb) => cb(new Error('boom')),
  };

  let caught;
  try {
    await runCliInProcess(['in.html', 'out.html'], { juice: fakeJuice });
  } catch (err) { caught = err; }
  expect(caught).toBeDefined();
  expect(caught.exitCalls).toStrictEqual([1]);
  expect(caught.errorCalls.length).toBe(1);
  expect(caught.errorCalls[0]).toMatch(/boom/);
});

it('run reports error and exits 1 when --css file is missing', async () => {
  let caught;
  try {
    await runCliInProcess(['in.html', '--css', 'does-not-exist.css', 'out.html']);
  } catch (err) { caught = err; }
  expect(caught).toBeDefined();
  expect(caught.exitCalls).toStrictEqual([1]);
  expect(caught.errorCalls[0]).toMatch(/ENOENT/);
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
      expect(code, 'bin/juice exited with non-zero').toBe(0);
      expect(fs.readFileSync(outputPath, 'utf8'))
        .toBe(fs.readFileSync(expectedPath, 'utf8'));
      resolve();
    } catch (err) {
      reject(err);
    }
  });
}));
