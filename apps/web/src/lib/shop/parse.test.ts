import { describe, expect, it } from 'vitest';
import { parseStringArray } from './parse';

describe('parseStringArray', () => {
  it('retourne [] si non tableau', () => {
    expect(parseStringArray(undefined)).toEqual([]);
    expect(parseStringArray({})).toEqual([]);
  });
  it('filtre les chaînes', () => {
    expect(parseStringArray(['a', 1, 'b'])).toEqual(['a', 'b']);
  });
  it('supporte les tableaux serialises JSON', () => {
    expect(parseStringArray('["cinematic","poetic",1]')).toEqual(['cinematic', 'poetic']);
  });
  it('supporte un format CSV legacy', () => {
    expect(parseStringArray('cinematic, poetic , noir')).toEqual(['cinematic', 'poetic', 'noir']);
  });
});
