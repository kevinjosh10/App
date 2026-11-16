import {createAudioPlayer} from 'expo-audio';
import {AppState} from 'react-native';
import Log from '@libs/Log';
import {SOUNDS} from '@libs/Sound/BaseSound';
import playSound from '@libs/Sound/index.native';

jest.mock('expo-audio');
jest.mock('@libs/Log');

describe('Sound (native)', () => {
    let mockPlayer: {
        play: jest.Mock;
        remove: jest.Mock;
        addListener: jest.Mock;
    };
    let mockSubscription: {remove: jest.Mock};

    beforeEach(() => {
        jest.clearAllMocks();
        mockSubscription = {remove: jest.fn()};
        mockPlayer = {
            play: jest.fn(),
            remove: jest.fn(),
            addListener: jest.fn(() => mockSubscription),
        };
        jest.mocked(createAudioPlayer).mockReturnValue(mockPlayer as unknown as ReturnType<typeof createAudioPlayer>);
        Object.defineProperty(AppState, 'currentState', {
            value: 'active',
            configurable: true,
            writable: true,
        });
    });

    it('plays sound successfully when active in foreground', async () => {
        await playSound(SOUNDS.RECEIVE);

        expect(createAudioPlayer).toHaveBeenCalled();
        expect(mockPlayer.play).toHaveBeenCalled();
    });

    it('returns early without creating audio player when AppState is background', async () => {
        AppState.currentState = 'background';

        await playSound(SOUNDS.RECEIVE);

        expect(createAudioPlayer).not.toHaveBeenCalled();
    });

    it('returns early without creating audio player when AppState is inactive', async () => {
        AppState.currentState = 'inactive';

        await playSound(SOUNDS.RECEIVE);

        expect(createAudioPlayer).not.toHaveBeenCalled();
    });

    it('catches Session activation failed, cleans up player and subscription, and logs with Log.hmmm', async () => {
        const error = new Error('UnexpectedException: Session activation failed');
        mockPlayer.play.mockImplementationOnce(() => {
            throw error;
        });

        await expect(playSound(SOUNDS.RECEIVE)).resolves.not.toThrow();

        expect(mockSubscription.remove).toHaveBeenCalled();
        expect(mockPlayer.remove).toHaveBeenCalled();
        expect(Log.hmmm).toHaveBeenCalledWith('[Sound] Failed to play sound', {soundFile: SOUNDS.RECEIVE, error});
    });

    it('cleans up subscription and player when playback finishes', async () => {
        let statusCallback: ((status: {didJustFinish: boolean}) => void) | undefined;
        mockPlayer.addListener.mockImplementationOnce((_event: string, callback: (status: {didJustFinish: boolean}) => void) => {
            statusCallback = callback;
            return mockSubscription;
        });

        await playSound(SOUNDS.RECEIVE);

        expect(statusCallback).toBeDefined();
        statusCallback?.({didJustFinish: true});

        expect(mockSubscription.remove).toHaveBeenCalled();
        expect(mockPlayer.remove).toHaveBeenCalled();
    });
});
