import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import GameMenu from './GameMenu';

/* ── GameMenu ────────────────────────────────────────────────────────────────
   A static index, so its contract is that every mode is listed, described and linked once
   ───────────────────────────────────────────────────────────────────────── */

const renderMenu = () =>
  render(
    <MemoryRouter>
      <GameMenu />
    </MemoryRouter>
  );

/* A static index page, so these check that every game is listed and correctly linked */
describe('GameMenu', () => {
  it('lists all three games with Play links to the right routes, plus a way home', () => {
    renderMenu();

    expect(screen.getByRole('heading', { name: 'FlashFlip' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'FlashChoice' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'FlashMatch' })).toBeInTheDocument();

    const playLinks = screen.getAllByRole('link', { name: 'Play' });
    expect(playLinks.map(link => link.getAttribute('href'))).toEqual([
      '/flash-flip',
      '/flash-choice',
      '/flash-match',
    ]);

    expect(screen.getByRole('link', { name: 'Back to Home' })).toHaveAttribute('href', '/home');
  });

  it('describes each game so the choice can be made without playing it', () => {
    renderMenu();

    const items = document.querySelectorAll('.game-item');
    expect(items).toHaveLength(3);
    for (const item of items) {
      expect(['FlashFlip', 'FlashChoice', 'FlashMatch']).toContain(item.querySelector('h3')?.textContent);
      expect(item.querySelector('p')?.textContent?.length).toBeGreaterThan(20);
    }
  });

  it('gives every game exactly one way in', () => {
    renderMenu();

    const items = document.querySelectorAll('.game-item');
    for (const item of items) {
      expect(item.querySelectorAll('a')).toHaveLength(1);
    }
  });

  it('names the page so it is identifiable in the route history', () => {
    renderMenu();

    expect(screen.getByRole('heading', { name: 'Game Menu' })).toBeInTheDocument();
  });
});
