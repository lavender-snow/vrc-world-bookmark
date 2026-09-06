import { render, screen } from '@testing-library/react';

import '@testing-library/jest-dom';
import { SettingsHeader } from './settings-header';

describe('SettingsHeader', () => {
  it('指定したアイコンとタイトルでレンダリングされることをテスト', () => {
    const MockIcon = () => <svg data-testid="mock-icon" />;
    const title = 'Test Settings';

    render(<SettingsHeader Icon={MockIcon} title={title} />);

    expect(screen.getByTestId('mock-icon')).toBeInTheDocument();
    expect(screen.getByText(title)).toBeInTheDocument();
  });
});
