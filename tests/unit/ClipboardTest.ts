import Clipboard from '@libs/Clipboard';

describe('Clipboard (web)', () => {
    const originalClipboard = navigator.clipboard;

    afterEach(() => {
        Object.defineProperty(navigator, 'clipboard', {
            value: originalClipboard,
            configurable: true,
            writable: true,
        });
        jest.restoreAllMocks();
    });

    it('returns true when navigator.clipboard.writeText succeeds', async () => {
        const mockWriteText = jest.fn(() => Promise.resolve());
        Object.defineProperty(navigator, 'clipboard', {
            value: {writeText: mockWriteText},
            configurable: true,
            writable: true,
        });

        const result = await Clipboard.setString('test string');

        expect(mockWriteText).toHaveBeenCalledWith('test string');
        expect(result).toBe(true);
    });

    it('falls back to execCommand when navigator.clipboard.writeText rejects with NotAllowedError', async () => {
        const mockWriteText = jest.fn(() => Promise.reject(new Error("Failed to execute 'writeText' on 'Clipboard': Document is not focused.")));
        Object.defineProperty(navigator, 'clipboard', {
            value: {writeText: mockWriteText},
            configurable: true,
            writable: true,
        });
        const mockExecCommand = jest.spyOn(document, 'execCommand').mockImplementation(() => true);

        const result = await Clipboard.setString('test string');

        expect(mockWriteText).toHaveBeenCalledWith('test string');
        expect(mockExecCommand).toHaveBeenCalledWith('copy');
        expect(result).toBe(true);
    });

    it('returns false and does not throw an unhandled rejection when both writeText and fallback fail', async () => {
        const mockWriteText = jest.fn(() => Promise.reject(new Error("Failed to execute 'writeText' on 'Clipboard': Document is not focused.")));
        Object.defineProperty(navigator, 'clipboard', {
            value: {writeText: mockWriteText},
            configurable: true,
            writable: true,
        });
        jest.spyOn(document, 'execCommand').mockImplementation(() => {
            throw new Error('execCommand copy failed');
        });

        const result = await Clipboard.setString('test string');

        expect(result).toBe(false);
    });
});
