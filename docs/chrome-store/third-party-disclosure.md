# Third-Party Code Disclosure

## Summary

**Comfortable Video does NOT include any third-party libraries or external code in the distributed extension.**

All code included in the extension package is original work licensed under the MIT License.

## Development Dependencies

The following tools are used during development and build process but are **NOT included** in the final extension package:

### Build Tools
- **TypeScript** (v5.0.0) - MIT License
  - Purpose: Type-safe JavaScript compilation
  - Not included in final build (compiles to vanilla JavaScript)

- **Sass** (v1.97.3) - MIT License
  - Purpose: CSS preprocessing
  - Not included in final build (compiles to standard CSS)

### Type Definitions
- **@types/chrome** (v0.0.246) - MIT License
  - Purpose: TypeScript type definitions for Chrome Extension APIs
  - Not included in final build (types only, no runtime code)

### Testing Tools
- **Puppeteer** (v24.27.0) - Apache-2.0 License
  - Purpose: Automated testing of extension functionality
  - Not included in final build (development/testing only)

## Verification

You can verify that no third-party code is included by:

1. **Inspecting the extension package:**
   ```bash
   unzip comfortable-video.zip -d temp/
   cat temp/dist/*.js
   ```
   All JavaScript is compiled from TypeScript source in `src/` directory.

2. **Checking file sizes:**
   - background.js: ~71 lines
   - content.js: ~1148 lines
   - options.js: ~215 lines

   These sizes are consistent with the original TypeScript source, with no bundled libraries.

3. **Source code inspection:**
   - No `node_modules` content in `dist/`
   - No minified third-party library code
   - All code follows project coding style and structure

## Chrome APIs Used

The extension only uses standard Chrome Extension APIs provided by the browser:

- `chrome.storage` - Local storage of user preferences
- `chrome.contextMenus` - Right-click menu integration
- `chrome.tabs` - Tab interaction for content script messaging
- `chrome.i18n` - Internationalization/localization

These APIs are provided by Chrome itself and require no external libraries.

## Build Process

The build process is transparent and verifiable:

```bash
bun run build:scss  # Compiles src/content.scss → public/content.css
bun run build:ts    # Compiles src/*.ts → dist/*.js
bun run build:copy  # Copies public/ → dist/
```

No bundling, minification with external code injection, or other processes that might introduce third-party code.

## License Compliance

Since no third-party code is included:
- ✅ No license conflicts
- ✅ No attribution requirements beyond this project's MIT License
- ✅ No need for separate third-party licenses file
- ✅ Full source code available at: https://github.com/TomoTom0/ComfortableVideo

## Future Updates

If third-party libraries are added in future versions:
1. This document will be updated with full disclosure
2. Appropriate license files will be included
3. Attribution will be provided in the extension and documentation
4. Chrome Web Store listing will be updated accordingly

## Contact

For questions about third-party code or licensing:
- GitHub Issues: https://github.com/TomoTom0/ComfortableVideo/issues
- Review the source code: https://github.com/TomoTom0/ComfortableVideo

---

**Last Updated:** 2026-02-16
**Extension Version:** 1.1.4
