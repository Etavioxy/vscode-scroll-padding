# Scroll Padding

A VSCode extension that maintains a comfortable padding between your cursor and the visible window edges while scrolling. Works in both regular editor and diff view.

## Features

- **Smart Padding**: Automatically maintains a configurable number of lines between your cursor and the top/bottom edges of the visible window
- **Universal Support**: Works in regular text editors and diff views
- **Configurable**: Customize the number of padding lines to suit your preference
- **Toggle Control**: Easily enable/disable the feature when needed

## Configuration

You can customize the extension behavior through VSCode settings:

- `scrollPadding.lines` (default: 3): Number of lines to keep as padding between cursor and window edges
- `scrollPadding.enabled` (default: true): Enable/disable the scroll padding feature

## Commands

- `Toggle Scroll Padding`: Enable or disable the scroll padding feature

## Usage

1. Install the extension
2. The extension will automatically activate and start maintaining cursor padding while you scroll
3. Adjust the padding lines in settings if needed: `Preferences > Settings > Extensions > Scroll Padding`
4. Use the command palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and search for "Toggle Scroll Padding" to temporarily disable/enable

## How it works

The extension monitors:
- Cursor position changes
- Visible range changes (scrolling)
- Editor switches

When your cursor gets too close to the visible window edges (within the configured padding), the extension automatically adjusts the scroll position to maintain the desired spacing.

## Requirements

- VSCode 1.74.0 or higher

## Release Notes

### 0.0.1

Initial release with basic scroll padding functionality.