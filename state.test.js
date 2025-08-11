import { initializeState, setSetting, subscribe, getState } from './state.js';

describe('state management', () => {
    beforeEach(() => {
        // Reset localStorage before each test
        localStorage.clear();
        // We need to re-initialize the state for each test
        initializeState();
    });

    it('should initialize with default settings', () => {
        const state = getState();
        expect(state.settings.theme).toBe('atom-one-dark');
        expect(state.settings.fontSize).toBe(14);
    });

    it('should update a setting when setSetting is called', (done) => {
        const newTheme = 'github';

        const unsubscribe = subscribe((newState) => {
            expect(newState.settings.theme).toBe(newTheme);
            unsubscribe();
            done();
        });

        setSetting('theme', newTheme);
    });

    it('should persist settings to localStorage', () => {
        const newTheme = 'dracula';
        setSetting('theme', newTheme);
        expect(localStorage.getItem('coder_setting_theme')).toBe(newTheme);
    });
});
