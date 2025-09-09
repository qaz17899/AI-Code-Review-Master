export interface ParsedDiff {
  filename: string;
  patch: string;
}

export function parseDiffs(markdown: string): ParsedDiff[] {
  const diffs: ParsedDiff[] = [];
  // This regex captures the filename from both '--- a/path' and '+++ b/path' lines
  // and all content within the diff code block.
  const diffRegex = /```diff\s*--- a\/(.*?)\s*\n\+\+\+ b\/\1\s*([\s\S]*?)```/g;
  
  let match;
  while ((match = diffRegex.exec(markdown)) !== null) {
    diffs.push({
      filename: match[1].trim(),
      patch: match[2].trim(),
    });
  }
  return diffs;
}

export function applyPatch(originalContent: string, patch: string): string {
    const originalLines = originalContent.split(/\r?\n/);
    const patchLines = patch.split(/\r?\n/);
    
    const resultLines: string[] = [];
    let currentOriginalIndex = 0; 
    
    for (const line of patchLines) {
        if (line.startsWith('@@')) {
            const match = line.match(/^@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/);
            if (match) {
                const originalStartLine = parseInt(match[1], 10);
                
                // Add lines from original content before this hunk
                // This handles cases where the patch doesn't start at line 1
                while (currentOriginalIndex < originalStartLine - 1) {
                    if (currentOriginalIndex < originalLines.length) {
                       resultLines.push(originalLines[currentOriginalIndex]);
                    }
                    currentOriginalIndex++;
                }
            }
            continue; // Skip processing the hunk header itself
        }
        
        if (line.startsWith('+')) {
            resultLines.push(line.substring(1));
        } else if (line.startsWith('-')) {
            // A line is removed from the original. We just advance our pointer.
            currentOriginalIndex++;
        } else if (line.startsWith(' ')) {
            // A context line. It should correspond to a line in the original.
            if(currentOriginalIndex < originalLines.length) {
                resultLines.push(originalLines[currentOriginalIndex]);
            }
            currentOriginalIndex++;
        }
    }
    
    // After the patch is applied, add any remaining lines from the original file
    while (currentOriginalIndex < originalLines.length) {
        resultLines.push(originalLines[currentOriginalIndex]);
        currentOriginalIndex++;
    }
    
    return resultLines.join('\n');
}