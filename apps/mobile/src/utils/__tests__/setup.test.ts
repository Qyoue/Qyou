describe('mobile foundation setup', () => {
  it('runs TypeScript test files via the configured test runner', () => {
    const sum = (a: number, b: number): number => a + b;
    expect(sum(2, 3)).toBe(5);
  });
});
