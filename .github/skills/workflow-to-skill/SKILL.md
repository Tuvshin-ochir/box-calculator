---
name: workflow-to-skill
description: "Use when: converting a repeated multi-step workflow into a reusable SKILL.md that captures process, decision points, and quality checks for future use."
---

# Workflow-to-Skill

## Purpose

Turn a repeated process, checklist, or working method into a reusable skill that future agents or users can invoke on demand. This skill helps package the workflow in a way that is practical, concise, and easy to reuse.

## When to Use

Use this skill when:
- a workflow has been followed more than once
- a method has clear steps, decisions, and exit criteria
- you want to preserve the pattern in a reusable skill file
- the process would be useful across projects or future sessions

## Goal

Produce a SKILL.md that includes:
- the outcome or purpose of the workflow
- the required step-by-step process
- decision points and branching logic
- completion checks or quality criteria
- the correct scope for the file (workspace vs personal)

## Process

1. Extract the workflow from the conversation, task history, repo context, or recurring process.
2. Identify the step sequence and the order in which those steps matter.
3. Capture the decision points: what changes the flow based on the result or context.
4. Define the quality bar: what makes the workflow complete and trustworthy.
5. Decide the scope:
   - workspace-scoped when the workflow is team- or project-specific
   - user-scoped when it should work across projects or personal workflows
6. Draft the skill body with a clear objective, workflow, branching logic, and completion checklist.
7. Save the file in the correct skill location.
8. Review for ambiguity and tighten unclear instructions before finalizing.
9. Summarize what the skill produces and suggest example prompts the user can try.

## Decision Flow

- If a clear recurring workflow is evident, generalize it into a reusable skill.
- If the workflow is not clear enough, ask for the outcome, desired scope, and the level of detail required.
- If the process is broad and shared across the project, prefer the workspace location.
- If the process is personal and reusable across contexts, prefer the user profile location.
- If the work is a single focused task, prefer a prompt instead of a skill.
- If the work is broad and multi-stage, a skill is the right package.

## Quality Criteria

A good skill should:
- be specific enough to guide action without guesswork
- describe the real workflow that has been observed or repeated
- include logic for branching or alternate paths
- include a completion checklist or review step
- be concise but not vague
- clearly state when it should be used

## Output Expectations

When this skill is used, the result should be:
- a valid SKILL.md file
- a reusable workflow document for future use
- clear instructions that can be used by an agent or a human
- a summary of what the skill does and how to invoke it

## Example Prompts

- Turn this debugging flow into a reusable skill.
- Package our review checklist into a SKILL.md.
- Generalize this multi-step workflow into a reusable team skill.
- Create a personal skill from my recurring implementation workflow.

## Final Check

Before finishing, confirm:
- the skill is in the correct folder
- the name matches the file structure
- the description clearly explains when to use it
- the workflow is not too vague
- the decision logic and completion criteria are present
