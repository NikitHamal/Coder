// codebaseContext.js - Gathers context from the client-side workspace

import { fileStorage } from './fileStorage.js';

const MAX_CONTEXT_LENGTH = 4000; // Limit context size to avoid overly long prompts

/**
 * Attempts to extract top-level function/class names, imports, and exports from JS code using Regex.
 * This is a simplified approach and may not capture all cases correctly.
 * @param {string} code - The JavaScript code content.
 * @returns {{symbols: string[], imports: string[], exports: string[]}} - Object containing arrays of symbols, imports, and exports.
 */
function extractJsCodeInfo(code) {
    const symbols = [];
    const imports = [];
    const exports = [];

    // Regex for function declarations/expressions (incl. arrow), class declarations
    const symbolRegex = /(?:function\s*\*?\s+([\w$]+)\s*\(|class\s+([\w$]+)[\s{]|(?:const|let|var)\s+([\w$]+)\s*=\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>|class))/g;
    let match;
    while ((match = symbolRegex.exec(code)) !== null) {
        const name = match[1] || match[2] || match[3];
        if (name) {
            symbols.push(name);
        }
    }

    // Regex for imports (captures module path) - Simplified
    // Catches: import ... from '...'; import '...'; import * as ... from '...';
    // Doesn't specifically list named imports/exports within {} for brevity
    const importRegex = /import(?:[\s\S]*?from\s*)?['"]([^'"]+)['"]/g;
    while ((match = importRegex.exec(code)) !== null) {
        imports.push(match[0]); // Push the full import statement for context
    }

    // Regex for exports (captures exported names or paths for re-exports) - Simplified
    // Catches: export { ... }; export default ...; export function/class/const/let ...; export * from '...'; export {...} from '...';
    const exportRegex = /export\s+(?:(?:\{[^}]*\}|default|function|class|const|let|var)\s+([\w$]+)|(?:\*|\{[^}]*\})\s+from\s+['"]([^'"]+)['"])/g;
    while ((match = exportRegex.exec(code)) !== null) {
        // Prefer the explicit name (group 1), then the re-export path (group 2), else the full match
        const exportDetail = match[1] || (match[2] ? `from '${match[2]}'` : match[0]);
         if (exportDetail) {
            // Add 'export ' prefix for clarity if it wasn't the full match
            exports.push(match[0].startsWith('export ') ? match[0] : `export ${exportDetail}`);
         }
    }

    return {
        symbols: [...new Set(symbols)],
        imports: [...new Set(imports)],
        exports: [...new Set(exports)]
    };
}

/**
 * Gathers context about the workspace from fileStorage and active editor state.
 * @param {string | null} activeFilePath - The path of the currently active file.
 * @param {string | null} activeFileContent - The content of the currently active file.
 * @returns {string} - A formatted string containing workspace context.
 */
export function gatherContext(activeFilePath, activeFileContent) {
    console.log("Gathering improved context (with dependencies)...");
    const allFiles = fileStorage.getFiles();
    const fileList = Object.keys(allFiles);

    let codeInfo = { symbols: [], imports: [], exports: [] };
    if (activeFilePath && activeFilePath.endsWith('.js') && activeFileContent) {
        try {
             codeInfo = extractJsCodeInfo(activeFileContent);
             console.log(`Extracted info from ${activeFilePath}:`, codeInfo);
        } catch (e) {
             console.error(`Error extracting code info from ${activeFilePath}:`, e);
        }
    }

    // Build context string parts with Markdown headers
    const fileListString = `## File List (${fileList.length} files):\n${fileList.join('\n')}`;
    const activeFileInfo = `\n\n## Active File Path:\n${activeFilePath || 'None'}`;
    const symbolsString = codeInfo.symbols.length > 0 ? `\n\n## Active File Symbols:\n${codeInfo.symbols.join(', ')}` : '';
    const importsString = codeInfo.imports.length > 0 ? `\n\n## Active File Imports:\n${codeInfo.imports.join('\n')}` : '';
    const exportsString = codeInfo.exports.length > 0 ? `\n\n## Active File Exports:\n${codeInfo.exports.join('\n')}` : '';
    // Ensure backticks are on new lines for better Markdown rendering
    const contentString = `\n\n## Active File Content:\n\`\`\`\n${activeFileContent || '[No active file content]'}\n\`\`\`\n`;

    // Combine and truncate if necessary
    let fullContext = fileListString + activeFileInfo + symbolsString + importsString + exportsString + contentString;

    if (fullContext.length > MAX_CONTEXT_LENGTH) {
        console.warn(`Context length (${fullContext.length}) exceeds limit (${MAX_CONTEXT_LENGTH}). Truncating.`);
        // Prioritize active file info, symbols, deps, and content start. Truncate file list first, then content.
        let availableLength = MAX_CONTEXT_LENGTH;
        let contextParts = [activeFileInfo, symbolsString, importsString, exportsString]; // High priority parts
        let highPriorityLength = contextParts.reduce((sum, part) => sum + part.length, 0);
        availableLength -= highPriorityLength;

        let truncatedFileListString = fileListString;
        let truncatedContentString = contentString;

        // Check if file list needs truncation
        if (availableLength - contentString.length < fileListString.length) {
             const fileListAllowedLength = Math.max(0, availableLength - contentString.length - 50); // Reserve space for labels/truncation markers
             truncatedFileListString = fileListString.substring(0, fileListAllowedLength) + '\n... (file list truncated)';
        }
        availableLength -= truncatedFileListString.length;

        // Check if content needs truncation
         if (availableLength < contentString.length) {
             const contentAllowedLength = Math.max(0, availableLength - 50); // Reserve space
             truncatedContentString = contentString.substring(0, contentAllowedLength) + '\n... (content truncated)\n```\n';
         }


        fullContext = truncatedFileListString + activeFileInfo + symbolsString + importsString + exportsString + truncatedContentString;

        // Final safety truncate if still too long (e.g., huge number of symbols/deps)
        if (fullContext.length > MAX_CONTEXT_LENGTH) {
             fullContext = fullContext.substring(0, MAX_CONTEXT_LENGTH - 20) + '... (heavily truncated)';
        }
    }
    console.log("Context gathering complete.");
    return fullContext;
} 