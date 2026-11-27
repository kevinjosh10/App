import CONST from '@src/CONST';

type InstallRescue = () => () => void;
const installRescueStuckReportTextSelection = jest.requireActual<{default: InstallRescue}>('../../src/libs/rescueStuckReportTextSelection/index.ts').default;

describe('RescueStuckReportTextSelection', () => {
    let cleanup: () => void;
    let mockCaretPositionFromPoint: jest.Mock;
    let mockSetBaseAndExtent: jest.Mock;

    beforeEach(() => {
        document.body.innerHTML = '';
        mockSetBaseAndExtent = jest.fn();
        Object.defineProperty(window, 'getSelection', {
            writable: true,
            value: jest.fn().mockReturnValue({
                anchorNode: document.createElement('div'),
                anchorOffset: 0,
                isCollapsed: true,
                setBaseAndExtent: mockSetBaseAndExtent,
            }),
        });

        mockCaretPositionFromPoint = jest.fn();
        Object.defineProperty(document, 'caretPositionFromPoint', {
            writable: true,
            configurable: true,
            value: mockCaretPositionFromPoint,
        });

        cleanup = installRescueStuckReportTextSelection();
    });

    afterEach(() => {
        if (cleanup) {
            cleanup();
        }
        document.body.innerHTML = '';
        jest.restoreAllMocks();
    });

    it('does not throw IndexSizeError when caretPositionFromPoint returns an Element with offset greater than child count', () => {
        const reportList = document.createElement('div');
        reportList.setAttribute('data-testid', CONST.TEST_ID.REPORT_ACTIONS_LIST);
        document.body.appendChild(reportList);

        const input = document.createElement('input');
        input.value = 'Hello world text input';
        reportList.appendChild(input);

        // caretPositionFromPoint returns the input Element with offset = 13 (character offset inside input)
        // In unpatched code, document.createRange().setStart(input, 13) throws IndexSizeError: There is no child at offset 13.
        mockCaretPositionFromPoint.mockReturnValue({
            offsetNode: input,
            offset: 13,
        });

        const mouseDownEvent = new MouseEvent('mousedown', {
            button: 0,
            bubbles: true,
            clientX: 50,
            clientY: 50,
        });
        reportList.dispatchEvent(mouseDownEvent);

        const mouseMoveEvent = new MouseEvent('mousemove', {
            buttons: 1,
            bubbles: true,
            clientX: 60,
            clientY: 60,
        });

        expect(() => {
            document.dispatchEvent(mouseMoveEvent);
        }).not.toThrow();

        expect(mockSetBaseAndExtent).not.toHaveBeenCalled();
    });

    it('does not throw and safely ignores invalid or out-of-bounds caret positions', () => {
        const reportList = document.createElement('div');
        reportList.setAttribute('data-testid', CONST.TEST_ID.MONEY_REQUEST_REPORT_ACTIONS_LIST);
        document.body.appendChild(reportList);

        const textNode = document.createTextNode('Sample report message');
        reportList.appendChild(textNode);

        const mouseDownEvent = new MouseEvent('mousedown', {
            button: 0,
            bubbles: true,
            clientX: 10,
            clientY: 10,
        });
        reportList.dispatchEvent(mouseDownEvent);

        // Case 1: caretPositionFromPoint returns null
        mockCaretPositionFromPoint.mockReturnValue(null);
        expect(() => {
            document.dispatchEvent(new MouseEvent('mousemove', {buttons: 1, bubbles: true, clientX: 20, clientY: 20}));
        }).not.toThrow();

        // Case 2: caretPositionFromPoint returns negative offset
        mockCaretPositionFromPoint.mockReturnValue({offsetNode: textNode, offset: -1});
        expect(() => {
            document.dispatchEvent(new MouseEvent('mousemove', {buttons: 1, bubbles: true, clientX: 20, clientY: 20}));
        }).not.toThrow();

        // Case 3: caretPositionFromPoint returns offset exceeding text length
        mockCaretPositionFromPoint.mockReturnValue({offsetNode: textNode, offset: textNode.textContent!.length + 50});
        expect(() => {
            document.dispatchEvent(new MouseEvent('mousemove', {buttons: 1, bubbles: true, clientX: 20, clientY: 20}));
        }).not.toThrow();

        // Case 4: caretPositionFromPoint returns disconnected Text node
        const detachedNode = document.createTextNode('Detached text');
        mockCaretPositionFromPoint.mockReturnValue({offsetNode: detachedNode, offset: 2});
        expect(() => {
            document.dispatchEvent(new MouseEvent('mousemove', {buttons: 1, bubbles: true, clientX: 20, clientY: 20}));
        }).not.toThrow();

        // Case 5: caretPositionFromPoint returns Text node outside of report actions list
        const outsideDiv = document.createElement('div');
        const outsideText = document.createTextNode('Outside text');
        outsideDiv.appendChild(outsideText);
        document.body.appendChild(outsideDiv);
        mockCaretPositionFromPoint.mockReturnValue({offsetNode: outsideText, offset: 2});
        expect(() => {
            document.dispatchEvent(new MouseEvent('mousemove', {buttons: 1, bubbles: true, clientX: 20, clientY: 20}));
        }).not.toThrow();

        expect(mockSetBaseAndExtent).not.toHaveBeenCalled();
    });

    it('correctly rescues selection when dragging across valid report text nodes', () => {
        const reportList = document.createElement('div');
        reportList.setAttribute('data-testid', CONST.TEST_ID.REPORT_ACTIONS_LIST);
        document.body.appendChild(reportList);

        const textNodeA = document.createTextNode('First line of message');
        const textNodeB = document.createTextNode('Second line of message');
        reportList.appendChild(textNodeA);
        reportList.appendChild(textNodeB);

        // Mousedown over textNodeA at offset 0
        mockCaretPositionFromPoint.mockReturnValue({offsetNode: textNodeA, offset: 0});
        const mouseDownEvent = new MouseEvent('mousedown', {
            button: 0,
            bubbles: true,
            clientX: 10,
            clientY: 10,
        });
        reportList.dispatchEvent(mouseDownEvent);

        // Mousemove over textNodeB at offset 6
        mockCaretPositionFromPoint.mockReturnValue({offsetNode: textNodeB, offset: 6});
        const mouseMoveEvent = new MouseEvent('mousemove', {
            buttons: 1,
            bubbles: true,
            clientX: 30,
            clientY: 30,
        });
        document.dispatchEvent(mouseMoveEvent);

        expect(mockSetBaseAndExtent).toHaveBeenCalledWith(textNodeA, 0, textNodeB, 6);
    });
});
