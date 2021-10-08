import { useEffect, useReducer, useState } from 'react';

function getFaviconEl(): HTMLLinkElement {
  return document.getElementById('favicon') as HTMLLinkElement;
}

function resolveColorScheme() {
  try {
    return window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  } catch (e) {
    return 'light';
  }
}

function reducer(state, action) {
  switch (action.type) {
    case 'light':
      return { mode: 'light' };
    case 'dark':
      return { mode: 'dark' };
    default:
      throw new Error();
  }
}

function initial(initMode) {
  return { mode: initMode };
}

export function useAppTheme({ initMode }) {
  const [theme, setTheme] = useState(resolveColorScheme());
  const [state] = useReducer(reducer, initMode, initial);

  useEffect(() => {
    try {
      window
        .matchMedia('(prefers-color-scheme: dark)')
        .addEventListener('change', e => {
          setTheme(e.matches ? 'dark' : 'light');
        });

      setTheme(state.mode);
    } catch (e) {
      setTheme('light');
    }
  }, [state]);

  useEffect(() => {
    // add white favicon for dark mode.
    const fav = getFaviconEl();
    fav.href = theme === 'dark' ? '/favicon-white.png' : '/favicon.png';
    console.log('theme', theme);
    fav.type = 'image/png';
    fav.sizes.add('48x48');
  }, [theme]);
}
