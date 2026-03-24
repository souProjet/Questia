import { describe, expect, it } from 'vitest';
import { clerkAuthAppearance } from './clerk-auth-appearance';

describe('clerkAuthAppearance', () => {
  it('expose variables et elements', () => {
    expect(clerkAuthAppearance.variables.colorPrimary).toMatch(/^#/);
    expect(clerkAuthAppearance.elements.formButtonPrimary).toBeDefined();
  });
});
