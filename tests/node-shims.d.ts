declare module "node:test" {
  const test: (name: string, fn: () => void | Promise<void>) => void;
  export const beforeEach: (fn: () => void | Promise<void>) => void;
  export default test;
}

declare module "node:assert/strict" {
  const assert: {
    deepEqual: (actual: unknown, expected: unknown) => void;
    equal: (actual: unknown, expected: unknown) => void;
    ok: (value: unknown, message?: string) => void;
  };
  export default assert;
}
