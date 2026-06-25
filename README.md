# HistoryLog

A lightweight browser extension for fast, day-to-day browsing history access.

The extension replaces the default history page with a compact, searchable popup directly accessible from the browser toolbar.

## Features

- Chronological browser history list
- Recently closed tabs and windows view
- Tab-based navigation between history and recently closed entries
- Fast search for titles and URLs
- Lazy loading for large history databases
- Compact layout optimized for quick scanning
- Per-entry delete action
- Clear complete browsing history with confirmation dialog
- Light and dark theme support
- System theme detection
- English and German UI
- System language detection
- Native browser popup integration
- Lightweight and dependency-free implementation

## Browser API Compatibility

The extension targets Manifest V3 and uses the current browser extension APIs for history and session data.

Main APIs used:

- `chrome.history`
- `chrome.sessions`
- `chrome.tabs`

## Installation for Local Development

1. Download or clone the repository.
2. Open your browser extension page:

```text
chrome://extensions
```

or:

```text
edge://extensions
```

3. Enable Developer Mode.
4. Click **Load unpacked**.
5. Select the extension folder.

## Permissions

The extension requires the following permissions:

- `history` to read and manage browsing history entries
- `sessions` to display recently closed tabs and windows
- `tabs` to restore or open tab and session entries

No data is sent to third-party services.

## International Open-Source Notes

The project is intended for international open-source publication. User-facing metadata and documentation should remain in English by default.

Check these files before publishing:

- `manifest.json`
- `README.md`
- browser store descriptions
- screenshots
- issue templates
- pull request templates
- changelog

The UI may still support multiple languages through the built-in localization system.

## Roadmap

- Optional pinning or favorites for frequently visited items
- Improved filtering options (for example domain-only filters)
- Optional keyboard shortcuts for faster navigation
- Optional export functionality for selected entries
- Additional history grouping and statistics views

## Contributing

Issues and pull requests are welcome.

## License

MIT License

## Author

Alexander Karge
