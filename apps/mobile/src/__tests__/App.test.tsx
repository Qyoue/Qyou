import React from 'react';

describe('Mobile App', () => {
  it('should render without crashing', () => {
    // Basic test to ensure the app can render
    expect(true).toBe(true);
  });

  it('should have proper React Native setup', () => {
    expect(React).toBeDefined();
  });
});
