---
description: Parse an experience markdown file and submit it to Recall Kit remote server via MCP.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** execute the following steps to parse the experience file and submit it to the remote server.

## Execution Steps

### Step 1: Parse User Input
Extract the file path from `$ARGUMENTS`. 
- If the path is relative (doesn't start with `/` or `D:\` etc.), assume it's relative to `specs/experiences/`
- If no path is provided, ask the user to specify the file path
- Example: `nextjs-hydration-error-nested-layout.md` → `specs/experiences/nextjs-hydration-error-nested-layout.md`

### Step 2: Read and Parse the Markdown File
1. **Read the file** using `read_file` tool
2. **Parse frontmatter** (YAML between the first two `---` markers):
   - Extract `title` (required)
   - Extract `keywords` (required, must be an array with at least 3 items)
3. **Parse markdown content sections**:
   - Extract `## Problem Description` section content (required)
   - Extract `## Root Cause` section content (optional)
   - Extract `## Solution` section content (required)
   - Extract `## Context` section content (optional)
   - Extract `## Lessons Learned` section content (optional)
   - Extract `## References` section content (optional)

### Step 3: Validate Required Fields
Check that all required fields are present and not empty:
- `title`: Must not be empty
- `problem_description`: Must not be empty (from "Problem Description" section)
- `solution`: Must not be empty (from "Solution" section)
- `keywords`: Must have at least 3 keywords

If any required field is missing, report an error listing the missing fields and ask the user to complete the file.

### Step 4: Prepare Submission Data
Combine the extracted data:
- `title`: From frontmatter
- `problem_description`: Content from "Problem Description" section (remove the heading)
- `root_cause`: Content from "Root Cause" section if present (remove the heading)
- `solution`: Content from "Solution" section (remove the heading)
- `context`: Combine "Context", "Lessons Learned", and "References" sections if present (remove headings, separate with newlines)
- `keywords`: Array from frontmatter (convert to lowercase for consistency)

### Step 5: Submit to Remote Server
Use the MCP tool `mcp_recall-kit_submit_experience` with the prepared data:
- Call the tool with all extracted fields
- Handle any errors returned by the tool

### Step 6: Report Result
- **If successful**: Display the experience ID and confirm the submission was successful
- **If failed**: Display the error message and suggest possible fixes

## Example

User input: `nextjs-hydration-error-nested-layout.md`

Execution:
1. Read `specs/experiences/nextjs-hydration-error-nested-layout.md`
2. Parse frontmatter: title="Next.js App Router 嵌套 Layout 导致 React Hydration 错误", keywords=[Next.js, React, hydration, ...]
3. Parse sections: Problem Description, Root Cause, Solution, Context, Lessons Learned, References
4. Validate all required fields are present
5. Submit via MCP tool
6. Report: "Successfully submitted experience with ID: {experience_id}"

## Important Notes

- Remove markdown headings (##) from section content when extracting
- Trim whitespace from all extracted text
- If a section is missing, use empty string or null as appropriate
- Keywords should be converted to lowercase for consistency with the database
- The context field can combine multiple optional sections for richer context

