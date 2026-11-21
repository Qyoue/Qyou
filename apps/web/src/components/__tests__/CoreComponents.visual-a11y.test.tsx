import React from 'react';
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import { Button } from '../Button';
import { Spinner } from '../Spinner';
import { TextField } from '../TextField';
import { Toast } from '../Toast';

describe('Core components visual regression and accessibility', () => {
  it('Button renders consistently and has no axe violations', async () => {
    const { container } = render(<Button>Save</Button>);
    expect(container.firstChild).toMatchSnapshot();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Spinner renders consistently and has no axe violations', async () => {
    const { container } = render(<Spinner />);
    expect(container.firstChild).toMatchSnapshot();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('TextField renders consistently and has no axe violations', async () => {
    const { container } = render(
      <TextField label="Email" name="email" value="" onChange={() => {}} />,
    );
    expect(container.firstChild).toMatchSnapshot();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Toast renders consistently and has no axe violations', async () => {
    const { container } = render(<Toast message="Saved" type="success" onClose={() => {}} />);
    expect(container.firstChild).toMatchSnapshot();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
