import * as vscode from 'vscode';

class ScrollPaddingManager {
    private disposables: vscode.Disposable[] = [];
    private isEnabled: boolean = true;
    private paddingLines: number = 5;
    private delay: number = 50;
    private debounceTimer: NodeJS.Timeout | undefined;
    private isAdjustingCursor: boolean = false;
    private lastVisibleStart: number = -1;
    private lastVisibleEnd: number = -1;

    constructor() {
        this.loadConfiguration();
    }

    public activate(context: vscode.ExtensionContext) {
        console.log('Scroll Padding extension activated');

        // 注册命令
        const toggleCommand = vscode.commands.registerCommand('scrollPadding.toggle', () => {
            this.toggle();
        });
        context.subscriptions.push(toggleCommand);

        // 监听配置变化
        const configListener = vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('scrollPadding')) {
                this.loadConfiguration();
            }
        });
        context.subscriptions.push(configListener);

        // 启动核心功能
        this.setupListeners();
        context.subscriptions.push(...this.disposables);
    }

    private loadConfiguration() {
        const config = vscode.workspace.getConfiguration('scrollPadding');
        this.isEnabled = config.get<boolean>('enabled', true);
        this.paddingLines = config.get<number>('lines', 5);
        this.delay = config.get<number>('delay', 50);
    }

    private toggle() {
        this.isEnabled = !this.isEnabled;
        vscode.window.showInformationMessage(
            `Scroll Padding ${this.isEnabled ? 'enabled' : 'disabled'}`
        );
        this.resetState();
    }

    private setupListeners() {
        this.dispose();
        
        if (!this.isEnabled) {
            return;
        }

        // 监听可见区域变化（滚动事件）
        const visibleRangeListener = vscode.window.onDidChangeTextEditorVisibleRanges(e => {
            this.handleVisibleRangeChange(e);
        });

        // 监听编辑器切换
        const activeEditorListener = vscode.window.onDidChangeActiveTextEditor(editor => {
            this.resetState();
            if (editor) {
                this.initializeEditor(editor);
            }
        });

        this.disposables.push(visibleRangeListener, activeEditorListener);

        // 初始化当前活动编辑器
        if (vscode.window.activeTextEditor) {
            this.initializeEditor(vscode.window.activeTextEditor);
        }
    }

    private initializeEditor(editor: vscode.TextEditor) {
        if (editor.visibleRanges.length > 0) {
            const visibleRange = editor.visibleRanges[0];
            this.lastVisibleStart = visibleRange.start.line;
            this.lastVisibleEnd = visibleRange.end.line;
        }
    }

    private handleVisibleRangeChange(e: vscode.TextEditorVisibleRangesChangeEvent) {
        if (!this.isEnabled || this.isAdjustingCursor) {
            return;
        }

        const editor = e.textEditor;
        if (!editor || editor.visibleRanges.length === 0) {
            return;
        }

        // 清除之前的防抖定时器
        // 使用防抖来避免频繁触发
        this.debounceTimer = setTimeout(() => {
            this.processScrollEvent(editor);
        }, this.delay);
    }

    private processScrollEvent(editor: vscode.TextEditor) {
        if (!this.isEnabled || this.isAdjustingCursor || editor.visibleRanges.length === 0) {
            return;
        }

        try {
            const visibleRange = editor.visibleRanges[0];
            const currentVisibleStart = visibleRange.start.line;
            const currentVisibleEnd = visibleRange.end.line;
            const cursorLine = editor.selection.active.line;

            // 检查是否发生了滚动
            if (this.hasScrolled(currentVisibleStart, currentVisibleEnd)) {
                this.adjustCursorAfterScroll(editor, cursorLine, currentVisibleStart, currentVisibleEnd);
            }

            // 更新状态
            this.lastVisibleStart = currentVisibleStart;
            this.lastVisibleEnd = currentVisibleEnd;

        } catch (error) {
            console.error('ScrollPadding: Error processing scroll event:', error);
        }
    }

    private hasScrolled(currentStart: number, currentEnd: number): boolean {
        return (
            this.lastVisibleStart !== -1 &&
            (this.lastVisibleStart !== currentStart || this.lastVisibleEnd !== currentEnd)
        );
    }

    private adjustCursorAfterScroll(
        editor: vscode.TextEditor, 
        cursorLine: number, 
        visibleStart: number, 
        visibleEnd: number
    ) {
        const documentLineCount = editor.document.lineCount - 1;
        let newCursorLine = cursorLine;
        let shouldMoveCursor = false;

        // 检查光标是否超出了上边界的padding
        if (cursorLine < visibleStart + this.paddingLines) {
            newCursorLine = Math.min(documentLineCount, visibleStart + this.paddingLines);
            shouldMoveCursor = true;
        }
        // 检查光标是否超出了下边界的padding
        else if (cursorLine > visibleEnd - this.paddingLines) {
            newCursorLine = Math.max(0, visibleEnd - this.paddingLines);
            shouldMoveCursor = true;
        }

        if (shouldMoveCursor && newCursorLine !== cursorLine) {
            this.moveCursor(editor, newCursorLine);
        }
    }

    private moveCursor(editor: vscode.TextEditor, targetLine: number) {
        this.isAdjustingCursor = true;

        try {
            // 获取目标行的内容来智能定位光标列
            const targetLineText = editor.document.lineAt(targetLine).text;
            const currentColumn = editor.selection.active.character;
            
            // 尝试保持相同的列位置，但不超过行长度
            const targetColumn = Math.min(currentColumn, targetLineText.length);
            
            const newPosition = new vscode.Position(targetLine, targetColumn);
            const newSelection = new vscode.Selection(newPosition, newPosition);
            
            editor.selection = newSelection;

            //// 确保新光标位置可见
            //editor.revealRange(
            //    new vscode.Range(newPosition, newPosition), 
            //    vscode.TextEditorRevealType.InCenterIfOutsideViewport
            //);

        } catch (error) {
            console.error('ScrollPadding: Error moving cursor:', error);
        } finally {
            // 使用短延时来重置标志，确保不会干扰后续操作
            setTimeout(() => {
                this.isAdjustingCursor = false;
            }, 10);
        }
    }

    private resetState() {
        this.lastVisibleStart = -1;
        this.lastVisibleEnd = -1;
        this.isAdjustingCursor = false;
        
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = undefined;
        }
    }

    public dispose() {
        this.resetState();
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
    }
}

// 全局实例
let scrollPaddingManager: ScrollPaddingManager;

export function activate(context: vscode.ExtensionContext) {
    scrollPaddingManager = new ScrollPaddingManager();
    scrollPaddingManager.activate(context);
}

export function deactivate() {
    if (scrollPaddingManager) {
        scrollPaddingManager.dispose();
    }
}