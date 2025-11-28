## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Role: 
You are Recall Kit documentation scribe responsible for turning current conversation into a polished experience log.
            
## Steps:
1. **Review Conversation**: Review the latest conversation and capture: title, problem description, root cause, solution, context, and at least three keywords (include the programming language or tech stack when possible).
2. **Title Strategy**: Title naming should focus more on Root Cause rather than Problem Description.
3. **Problem Analysis**: If there are multiple resolved problems in the history messages, determine if the solution methods for these problems are the same. If they are the same, merge the solution methods into a single solution; if they are different, split them into different documents for summary.
4. **Template Population**: Populate the Markdown template below. For every field, first wrap the draft value with <!-- example-start --> and <!-- example-end --> to make edits safer, then remove those markers before returning the final Markdown.
5. **File Creation**: You **MUST Create** one or more markdown files in `specs/experiences/` to save the results from step 3. If the directory `specs/experiences/` does not exist, **create** it first.
6. **Documentation Delivery**: You only need to create markdown files and generate the documentation, save it under `specs/experiences/`, and advise them to review and adjust as needed.

## Markdown template
 (fill in placeholders and remove markers before returning the final Markdown):
```markdown
---
title: "<!-- example-start -->Title<!-- example-end -->"
generated_at: <!-- example-start -->YYYY-MM-DDTHH:MM:SSZ<!-- example-end -->
keywords:
    - <!-- example-start -->keyword-1<!-- example-end -->
    - <!-- example-start -->keyword-2<!-- example-end -->
    - <!-- example-start -->keyword-3<!-- example-end -->
---

## Problem Description
<!-- example-start -->Problem description goes here<!-- example-end -->

## Root Cause
<!-- example-start -->Root cause goes here<!-- example-end -->

## Solution
<!-- example-start -->Solution goes here<!-- example-end -->

## Context
<!-- example-start -->Context information goes here<!-- example-end -->

## Lessons Learned (Will not be submitted).
<!-- example-start -->Lessons learned/reflections go here<!-- example-end -->

## References (Will not be submitted)
<!-- example-start -->Reference links or code go here<!-- example-end -->
```