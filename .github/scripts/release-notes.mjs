#!/usr/bin/env node
/**
 * Prints the GitHub release notes for the release about to be cut from HEAD, as
 * Markdown, to stdout. Run it from the repository root:
 *
 *   node .github/scripts/release-notes.mjs
 *
 * GitHub's own generated notes are built from merged pull requests, and this
 * repository is pushed to directly, so `generate_release_notes` produced a body
 * with nothing in it. These are built from the commits instead.
 *
 * The publish workflow runs this AFTER `phips28/gh-action-bump-version` has
 * bumped package.json and tagged HEAD locally, and BEFORE the image is built --
 * so the version read here is the one being released, and a failure in here
 * stops the run while it is still free of side effects.
 *
 * Locally the same command previews what the next release would say.
 *
 * Grouping: Conventional Commit prefixes are honoured when present (`feat:`,
 * `fix:`, a `!` or a `BREAKING CHANGE:` footer). This repository does not use
 * them today, so anything else is bucketed on its leading verb -- "Fixed the
 * grid" into Fixes, "Added a column" into Features. The heuristic only looks at
 * the FIRST WORD, so a subject that opens with a noun ("API to fetch users")
 * lands in "Other changes". Writing verb-first subjects, or adopting `feat:`
 * and `fix:`, is what sharpens the grouping over time.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const git = (...args) =>
  execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const version = pkg.version;

/*
 * In CI the bump step has already committed the new version and tagged HEAD, so
 * the tag sitting on HEAD is the release being cut. Run by hand on a branch,
 * nothing is tagged yet and package.json still holds the LAST released version
 * -- the next number is whatever the bump step decides -- so that run is
 * labelled a preview instead of claiming a version it cannot know.
 *
 * A useful consequence: checking out a `v*` tag reproduces exactly what CI
 * produced for that release, which is the cheapest way to test this file.
 */
let headTag = '';
try {
  headTag = git('tag', '--points-at', 'HEAD', '--list', 'v*').split('\n')[0].trim();
} catch {
  headTag = '';
}

const isPreview = !headTag;
const tag = headTag || `v${version}`;

/*
 * The nearest release tag strictly before HEAD; none on the first release.
 *
 * `HEAD^` rather than `HEAD` is load-bearing: by the time this runs the bump
 * action has already created `v<version>` pointing AT HEAD, so describing from
 * HEAD would answer with the tag we are about to release and produce an empty
 * range. Starting one commit back skips it and finds the previous release.
 */
let previous = '';
try {
  previous = git('describe', '--tags', '--abbrev=0', '--match', 'v*', 'HEAD^');
} catch {
  previous = '';
}

// Unit and record separators, so subjects and bodies can hold anything.
const log = git(
  'log',
  '--no-merges',
  '--format=%h%x1f%s%x1f%b%x1e',
  previous ? `${previous}..HEAD` : 'HEAD'
);

const CONVENTIONAL = /^(\w+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/;

/*
 * Markers people put in front of a real subject. Stripped for display and
 * before classifying, so "[skip ci] Consistent kebab menu" is still read as a
 * change and still grouped on "Consistent".
 *
 * Note what is NOT dropped here: a `[skip ci]` commit is somebody's work and
 * belongs in the notes. Only the bot's own bump commit is skipped, below.
 */
const NOISE_PREFIX = /^(?:\[(?:skip ci|ci skip)\]|IMPORTANT:|NOTE:)\s*/i;

/** The version-bump commit the workflow itself pushes. */
const isBumpCommit = (subject) => /version bump to/i.test(subject);

const FIX_VERB = /^(?:fix(?:e[ds])?|resolved?|correct(?:ed)?|patch(?:ed)?|repair(?:ed)?)\b/i;
const FEATURE_VERB =
  /^(?:add(?:ed|s)?|implement(?:ed)?|introduc(?:e|ed)|creat(?:e|ed)|enabl(?:e|ed)|support(?:s|ed)?|migrat(?:e|ed)|improv(?:e|ed)|enhanc(?:e|ed)|optimi[sz](?:e|ed)|standardi[sz](?:e|ed))\b/i;

const sections = { breaking: [], feat: [], fix: [], other: [] };

for (const record of log.split('\x1e')) {
  if (!record.trim()) continue;
  const [hash, rawSubject, body = ''] = record.trim().split('\x1f');
  if (isBumpCommit(rawSubject)) continue;

  const subject = rawSubject.replace(NOISE_PREFIX, '').trim();
  if (!subject) continue;

  const match = CONVENTIONAL.exec(subject);
  const type = match?.[1].toLowerCase();
  const scope = match?.[2];
  const text = match ? match[4] : subject;
  const line = `- ${scope ? `**${scope}:** ` : ''}${text} (${hash})`;

  if (match?.[3] || /^BREAKING[ -]CHANGE:/m.test(body)) sections.breaking.push(line);
  else if (type === 'feat') sections.feat.push(line);
  else if (type === 'fix') sections.fix.push(line);
  // A conventional `chore:`/`docs:`/`ci:` is deliberately left as other rather
  // than guessed at from its text.
  else if (match) sections.other.push(line);
  else if (FIX_VERB.test(text)) sections.fix.push(line);
  else if (FEATURE_VERB.test(text)) sections.feat.push(line);
  else sections.other.push(line);
}

/*
 * package.json carries no `repository` field here (the package is private and
 * never published), so the remote is the only local source for the URL. The
 * remote is written with credentials in it -- https://allquill@github.com/... --
 * and that userinfo has to come out or every link in the notes is broken.
 */
const repoUrlFromRemote = () => {
  try {
    return git('remote', 'get-url', 'origin')
      .replace(/^git\+/, '')
      .replace(/\.git$/, '')
      .replace(/^(https?:\/\/)[^@/]+@/, '$1');
  } catch {
    return '';
  }
};

const repoUrl =
  process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY
    ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}`
    : repoUrlFromRemote();

const out = [];
const section = (title, lines) => {
  if (lines.length) out.push(`## ${title}`, '', ...lines, '');
};

section('⚠️ Breaking changes', sections.breaking);
section('Features', sections.feat);
section('Fixes', sections.fix);
// Only call it "other" when there is something for it to be other than.
section(
  sections.breaking.length || sections.feat.length || sections.fix.length
    ? 'Other changes'
    : 'Changes',
  sections.other
);
if (out.length === 0) out.push('No changes since the previous release.', '');

if (isPreview) {
  // No version to name and no image to point at yet, so neither is invented.
  let branch = '';
  try {
    branch = git('rev-parse', '--abbrev-ref', 'HEAD');
  } catch {
    branch = '';
  }

  out.push(
    `_Preview of the release that would be cut from here. The version is chosen by the bump step in CI._`,
    ''
  );
  if (repoUrl && previous && branch && branch !== 'HEAD') {
    out.push(`**Changes since ${previous}:** ${repoUrl}/compare/${previous}...${branch}`);
  }
} else {
  /*
   * The artifact is a Docker image, not an npm package. The registry host is a
   * repository secret, so it is deliberately left out: it would be written into
   * the public release body and would render as *** in the run summary.
   */
  // This repo publishes three images: the website, the admin app and the API.
  const images = ['web', 'admin', 'api'].map((suffix) => `${pkg.name}-${suffix}`);
  out.push(images.length > 1 ? '## Images' : '## Image', '', '```', ...images.flatMap((n) => [`${n}:${version}`, `${n}:latest`]), '```', '');

  if (repoUrl) {
    out.push(
      previous
        ? `**Full changelog:** ${repoUrl}/compare/${previous}...${tag}`
        : `**Commits:** ${repoUrl}/commits/${tag}`
    );
  }
}

console.log(out.join('\n'));
