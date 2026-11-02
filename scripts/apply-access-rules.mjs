#!/usr/bin/env node
/**
 * Applies a staged access-rules file to the entity definitions in base44/entities.
 *
 *   node scripts/apply-access-rules.mjs base44/access-rules/round2-access-rules.json [--dry-run]
 *
 * Entity access rules take effect on the live app as soon as the entity files are
 * saved to the platform (a checkpoint does this), so run this only in the go-live
 * window, together with publishing the screens that rely on the new rules.
 *
 * "INT" anywhere in a rule stands for internal staff. Only the operations listed are
 * changed; everything else in each entity file is left as it is.
 */
import fs from 'node:fs';
import path from 'node:path';

const [, , rulesPath, flag] = process.argv;
if (!rulesPath) {
  console.error('Usage: node scripts/apply-access-rules.mjs <rules.json> [--dry-run]');
  process.exit(1);
}
const dryRun = flag === '--dry-run';
const staged = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
const INT = staged._int;
const expand = (rule) => {
  if (rule === 'INT') return structuredClone(INT);
  if (Array.isArray(rule)) return rule.map(expand);
  if (rule && typeof rule === 'object') {
    return Object.fromEntries(Object.entries(rule).map(([k, v]) => [k, expand(v)]));
  }
  return rule;
};

const entityDir = path.resolve('base44/entities');
const load = (name) => {
  const file = path.join(entityDir, `${name}.jsonc`);
  return { file, schema: JSON.parse(fs.readFileSync(file, 'utf8')) };
};
const changed = new Map();
const touch = (name) => {
  if (!changed.has(name)) changed.set(name, load(name));
  return changed.get(name).schema;
};

for (const [name, ops] of Object.entries(staged.entities || {})) {
  const schema = touch(name);
  schema.rls = schema.rls || {};
  for (const [op, rule] of Object.entries(ops)) schema.rls[op] = expand(rule);
}
for (const [key, ops] of Object.entries(staged.fields || {})) {
  const [name, field] = key.split('.');
  const schema = touch(name);
  const prop = schema.properties?.[field];
  if (!prop) throw new Error(`${key}: no such field`);
  prop.rls = prop.rls || {};
  for (const [op, rule] of Object.entries(ops)) prop.rls[op] = expand(rule);
}
for (const [key, value] of Object.entries(staged.defaults || {})) {
  const [name, field] = key.split('.');
  const schema = touch(name);
  const prop = schema.properties?.[field];
  if (!prop) throw new Error(`${key}: no such field`);
  prop.default = value;
  if (Array.isArray(prop.enum) && !prop.enum.includes(value)) throw new Error(`${key}: ${value} is not one of ${prop.enum}`);
}

for (const [name, { file, schema }] of changed) {
  const out = `${JSON.stringify(schema, null, 2)}`;
  if (dryRun) {
    console.log(`would update ${name}: rls ${JSON.stringify(schema.rls).slice(0, 160)}…`);
  } else {
    fs.writeFileSync(file, out);
    console.log(`updated ${name}`);
  }
}
