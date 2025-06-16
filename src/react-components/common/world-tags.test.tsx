import { render, screen } from '@testing-library/react';

import '@testing-library/jest-dom';
import { WorldTags } from './world-tags';

jest.mock('src/utils/util', () => ({
  checkTag: (tag: string) => ({
    isChill: tag === 'author_tag_chill',
    isHorror: tag === 'author_tag_horror',
    isGame: tag === 'author_tag_game',
    isAdmin: tag === 'admin_foo',
  }),
}));

describe('WorldTags', () => {
  it('タグがすべて表示される', () => {
    render(<WorldTags tags={['author_tag_chill', 'author_tag_horror', 'author_tag_game', 'admin_foo', 'other']} />);
    expect(screen.getByText('author_tag_chill')).toBeInTheDocument();
    expect(screen.getByText('author_tag_horror')).toBeInTheDocument();
    expect(screen.getByText('author_tag_game')).toBeInTheDocument();
    expect(screen.getByText('admin_foo')).toBeInTheDocument();
    expect(screen.getByText('other')).toBeInTheDocument();
  });

  it('タグごとにクラスが付与される', () => {
    render(<WorldTags tags={['author_tag_chill', 'author_tag_horror', 'author_tag_game', 'admin_foo', 'other']} />);
    expect(screen.getByText('author_tag_chill').className).toMatch(/chillWorldTag/);
    expect(screen.getByText('author_tag_horror').className).toMatch(/horrorWorldTag/);
    expect(screen.getByText('author_tag_game').className).toMatch(/gameWorldTag/);
    expect(screen.getByText('admin_foo').className).toMatch(/adminWorldTag/);
    expect(screen.getByText('other').className).toMatch(/worldTag/);
  });
});
