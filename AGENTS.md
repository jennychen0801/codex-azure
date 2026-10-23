# Project Instructions

## Environment

-Native Windows PowerShell.
-Git is the source of truth for changes.

## Workflow

1.Read relevant files and tests before editing.
2.Reproduce reported failures before changing implementation.
3.Make the smallest change that satisfies the request.
4.Preserve existing behavior unless explicitly changed.
5.Run relevant tests after edits.
6.If tests fail, analyze the actual error before changing more code.
7.After tests pass, stop unnecessary exploration.
8.Summarize changed files and test results concisely.

## Windows File Editing

-If apply_patch fails because of Windows UTF-8 argument handling, do not repeatedly retry it.
-Fall back to Python pathlib for deterministic text edits.
-Always use encoding="utf-8" for text files.
-Retry a failed tool operation at most once after changing the approach.

## Safety

-Never expose, print, modify, or commit secrets.
-Never modify .env unless explicitly requested.
-Never use destructive Git commands such as git reset --hard unless explicitly approved.
-Never commit, push, merge, or deploy without explicit permission.
-Do not modify unrelated files.

## Azure

-Do not create, modify, or delete Azure resources unless explicitly requested.
-Do not run azd deploy unless explicitly requested.

## Definition of Done

-Requested behavior implemented.
-Relevant tests pass.
-No unrelated file changes.

## Windows File Editing

- This repository runs in native Windows PowerShell.
- Do not use `apply_patch` by default on Windows.
- For creating or fully replacing a small text file, use PowerShell `Set-Content` with explicit UTF-8 encoding.
- For appending text, use PowerShell `Add-Content` with explicit UTF-8 encoding.
- For deterministic changes to existing source files, prefer Python `pathlib` with `encoding="utf-8"`.
- Preserve the existing newline style and file encoding whenever possible.
- After writing a file, verify its contents once.

## Tool Failure Policy

- If `apply_patch` fails because of patch formatting, quoting, line-ending, or UTF-8 handling, do not retry `apply_patch`.
- Immediately switch to PowerShell `Set-Content` or Python `pathlib`.
- Never retry an unchanged failed command.
- Retry a failed file-edit operation at most once, and only after changing the editing method.
- If the fallback also fails, stop and report the exact blocker instead of continuing to retry.

## Token and Execution Efficiency

- Use the simplest reliable tool for the requested file operation.
- Do not produce progress commentary before every trivial file operation.
- Do not re-read a file repeatedly after a successful write.
- After verification and tests succeed, stop further exploration.
- Keep the final response concise.

## Native Windows Editing Policy

This project runs in native Windows PowerShell.

- Do not use `apply_patch` in this repository.
- Create or overwrite small text files with PowerShell `Set-Content`.
- Append text with PowerShell `Add-Content`.
- Modify existing source code with Python `pathlib`.
- Always specify UTF-8 encoding explicitly.
- Before replacing text, verify that the expected original text exists exactly once.
- After editing, verify the changed file and run the relevant tests.


# Engineering Calculator Instructions
 
## Environment
 
- Native Windows PowerShell.
- This is a standalone frontend project.
- Use HTML, CSS, and native JavaScript.
- Do not inspect or run Python projects or tests outside this repository.
 
## File Editing
 
- Do not use `apply_patch` on native Windows.
- Use PowerShell `Set-Content` for short new files.
- Use Python `pathlib` with `encoding="utf-8"` for long files and precise edits.
- Write each complete new file in one operation when practical.
- Never retry an unchanged failed command.
- Retry a failed edit at most once after changing the editing method.
 
## Dependency Policy
 
- Do not install npm, Python, browser, or testing packages unless explicitly requested.
- Prefer Node's built-in test runner.
- If Playwright is unavailable, do not install it automatically.
- Fall back to static verification and report the missing browser test capability.
 
## Execution Efficiency
 
- Read all relevant project files in one batch.
- Do not inspect unrelated user directories or repositories.
- Do not check unrelated Python tests.
- Batch logically related file creation.
- Keep progress messages brief.
- After tests pass, stop further exploration.
- Do not continue tool calls solely to create a longer final report.
 
## Testing
 
- Run only tests relevant to this project.
- Do not treat failures from unrelated files as blockers.
- Run full relevant tests once after implementation.
- Rerun only failed or affected tests after a correction.
 
## Safety
 
- Do not modify secrets or environment files.
- Do not commit, push, merge, publish, or deploy.
- Do not use destructive Git commands.