import fs from 'fs';
import { Readable } from 'stream';
import spawn from 'cross-spawn';
import cli from '../lib/cli.js';
import juice from '../index.js';

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
  expect(parseArgs({'addImportantToPseudoClasses': 'true'}).addImportantToPseudoClasses).toBe(true);
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

it('run shows help and skips juicing when there are no args and stdin is a TTY', async () => {
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
      stdin: { isTTY: true },
      done: () => {},
    });
  } finally {
    cli.getProgram = originalGetProgram;
  }
  expect(helpCalls.length).toBe(1);
  expect(juiceCalled).toBe(false);
});

const fakeStdout = () => {
  const stdout = { data: '', write: (chunk) => { stdout.data += chunk; } };
  return stdout;
};

it('run reads from stdin and writes to stdout when there are no args', async () => {
  const stdout = fakeStdout();

  await runCliInProcess([], {
    stdin: Readable.from(['<style>div{color:red;}</style><div>x</div>']),
    stdout,
  });

  expect(stdout.data).toBe('<div style="color: red;">x</div>');
});

it('run treats - as stdin and stdout', async () => {
  const stdout = fakeStdout();

  await runCliInProcess(['-', '-'], {
    stdin: Readable.from(['<style>p{margin:0;}</style><p>x</p>']),
    stdout,
  });

  expect(stdout.data).toBe('<p style="margin: 0;">x</p>');
});

it('run reads from stdin into an output file', async () => {
  const outputPath = tmpPath('stdin.html');

  await runCliInProcess(['-', outputPath], {
    stdin: Readable.from(['<style>div{color:red;}</style><div>x</div>']),
  });

  expect(fs.readFileSync(outputPath, 'utf8')).toBe('<div style="color: red;">x</div>');
});

it('run writes to stdout when no output file is given', async () => {
  const stdout = fakeStdout();

  await runCliInProcess(['test/cases/juice-content/no-css.html'], { stdout });

  expect(stdout.data).toBe(fs.readFileSync('test/cases/juice-content/no-css.out', 'utf8'));
});

it('run passes --options-file options through when reading from stdin', async () => {
  const captured = {};
  const fakeJuice = {
    codeBlocks: {},
    juiceResources: (html, options, cb) => {
      captured.html = html;
      captured.options = options;
      cb(null, html);
    },
  };

  await runCliInProcess(
    ['--options-file', 'test/cases/juice-content/font-face-preserve.json'],
    { juice: fakeJuice, stdin: Readable.from(['<p>x</p>']), stdout: fakeStdout() }
  );

  expect(captured.html).toBe('<p>x</p>');
  expect(captured.options.preserveFontFaces).toBe(true);
  expect(captured.options.optionsFile).toBeUndefined();
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

it('run applies codeBlocks from --options-file when reading from stdin', async () => {
  const originalCodeBlocks = { ...juice.codeBlocks };
  const optionsPath = tmpPath('code-blocks.json');
  fs.writeFileSync(optionsPath, JSON.stringify({ codeBlocks: { TWIG: { start: '{%', end: '%}' } } }));
  const stdout = fakeStdout();

  try {
    await runCliInProcess(['--options-file', optionsPath], {
      stdin: Readable.from(['<style>p{color:red}</style>{% if user %}<p>Hi</p>{% endif %}']),
      stdout,
    });

    expect(juice.codeBlocks.TWIG).toStrictEqual({ start: '{%', end: '%}' });
    expect(stdout.data).toBe('{% if user %}<p style="color: red;">Hi</p>{% endif %}');
  } finally {
    juice.codeBlocks = originalCodeBlocks;
  }
});

it('run reports error and exits 1 when stdin fails', async () => {
  const stdin = new Readable({ read() { this.destroy(new Error('stdin broke')); } });

  let caught;
  try {
    await runCliInProcess([], { stdin, stdout: fakeStdout() });
  } catch (err) { caught = err; }
  expect(caught).toBeDefined();
  expect(caught.exitCalls).toStrictEqual([1]);
  expect(caught.errorCalls[0]).toMatch(/stdin broke/);
});

it('run reports error and exits 1 when the output file cannot be written', async () => {
  const fakeFs = { writeFile: (_path, _html, cb) => cb(new Error('disk full')), readFile: fs.readFile };

  let caught;
  try {
    await runCliInProcess(['test/cases/juice-content/no-css.html', 'out.html'], { fs: fakeFs });
  } catch (err) { caught = err; }
  expect(caught).toBeDefined();
  expect(caught.exitCalls).toStrictEqual([1]);
  expect(caught.errorCalls[0]).toMatch(/disk full/);
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

it('bin/juice pipes stdin to stdout (spawn)', () => new Promise((resolve, reject) => {
  const juiceProcess = spawn('bin/juice', []);
  let output = '';
  juiceProcess.stdout.on('data', (chunk) => { output += chunk; });
  juiceProcess.on('error', reject);
  juiceProcess.on('exit', (code) => {
    try {
      expect(code, 'bin/juice exited with non-zero').toBe(0);
      expect(output).toBe('<div style="color: red;">x</div>');
      resolve();
    } catch (err) {
      reject(err);
    }
  });
  juiceProcess.stdin.end('<style>div{color:red;}</style><div>x</div>');
}));

describe('directory input', () => {
  const write = (file, content) => {
    fs.mkdirSync(file.slice(0, file.lastIndexOf('/')), { recursive: true });
    fs.writeFileSync(file, content);
  };
  const setup = (name) => {
    const root = tmpPath(name);
    write(`${root}/src/a.html`, '<link rel="stylesheet" href="a.css"><p>A</p>');
    write(`${root}/src/a.css`, 'p { color: red; }');
    write(`${root}/src/sub/b.html`, '<link rel="stylesheet" href="b.css"><p>B</p>');
    write(`${root}/src/sub/b.css`, 'p { color: blue; }');
    write(`${root}/src/sub/deep/c.htm`, '<style>p { color: green; }</style><p>C</p>');
    write(`${root}/src/notes.txt`, 'not html');
    return root;
  };

  it('inlines every .html and .htm file into the output directory, keeping the structure', async () => {
    const root = setup('dir-basic');

    const { exitCalls, errorCalls } = await runCliInProcess([`${root}/src`, `${root}/dist`]);

    expect(exitCalls).toStrictEqual([]);
    expect(errorCalls).toStrictEqual([]);
    expect(fs.readFileSync(`${root}/dist/a.html`, 'utf8')).toBe('<p style="color: red;">A</p>');
    expect(fs.readFileSync(`${root}/dist/sub/b.html`, 'utf8')).toBe('<p style="color: blue;">B</p>');
    expect(fs.readFileSync(`${root}/dist/sub/deep/c.htm`, 'utf8')).toBe('<p style="color: green;">C</p>');
    expect(fs.existsSync(`${root}/dist/notes.txt`)).toBe(false);
  });

  it('applies --css to every file', async () => {
    const root = setup('dir-css');
    write(`${root}/extra.css`, 'p { font-weight: bold; }');

    await runCliInProcess([`${root}/src`, `${root}/dist`, '--css', `${root}/extra.css`]);

    expect(fs.readFileSync(`${root}/dist/a.html`, 'utf8')).toBe('<p style="color: red; font-weight: bold;">A</p>');
    expect(fs.readFileSync(`${root}/dist/sub/deep/c.htm`, 'utf8')).toBe('<p style="color: green; font-weight: bold;">C</p>');
  });

  it('skips the output directory when it is inside the input directory', async () => {
    const root = setup('dir-nested-output');

    await runCliInProcess([`${root}/src`, `${root}/src/dist`]);
    await runCliInProcess([`${root}/src`, `${root}/src/dist`]);

    expect(fs.readFileSync(`${root}/src/dist/a.html`, 'utf8')).toBe('<p style="color: red;">A</p>');
    expect(fs.existsSync(`${root}/src/dist/dist`)).toBe(false);
  });

  it('keeps going when a file fails, then exits 1', async () => {
    const root = setup('dir-failure');
    fs.mkdirSync(`${root}/src/broken.html`);

    let caught;
    try {
      await runCliInProcess([`${root}/src`, `${root}/dist`]);
    } catch (err) { caught = err; }

    expect(caught).toBeDefined();
    expect(caught.exitCalls).toStrictEqual([1]);
    expect(caught.errorCalls).toHaveLength(1);
    expect(caught.errorCalls[0]).toContain('broken.html');
    expect(fs.readFileSync(`${root}/dist/a.html`, 'utf8')).toBe('<p style="color: red;">A</p>');
    expect(fs.readFileSync(`${root}/dist/sub/deep/c.htm`, 'utf8')).toBe('<p style="color: green;">C</p>');
  });

  it('requires an output directory', async () => {
    const root = setup('dir-no-output');

    let caught;
    try {
      await runCliInProcess([`${root}/src`], { stdout: fakeStdout() });
    } catch (err) { caught = err; }

    expect(caught.exitCalls).toStrictEqual([1]);
    expect(caught.errorCalls[0]).toMatch(/output directory/);
  });
});
