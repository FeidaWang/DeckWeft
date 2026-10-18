# Start here: your first five minutes

[中文](../zh-CN/start.md) · [Home](../../README.md)

You need a computer, a browser, and Node.js 22 or newer. Node is the small engine that runs the workbench. Codex, Claude Code, Figma, Adobe, and an API account are **not** needed for this first exercise.

## 1. Find the right folder

Unzip the source. Open a terminal in the folder containing `package.json`. Run:

```bash
node --version
node bin/deckweft.mjs doctor
```

A version beginning with `v22` or a larger number meets this project's minimum. The doctor may say that Codex or Claude is missing. That is fine for the local editor; “found” would not prove the host is logged in anyway.

## 2. Open the workbench

```bash
node bin/deckweft.mjs studio --open
```

Keep this terminal open. Visit the printed local address if a browser does not appear. You should see a six-slide example and four small layout choices below the main slide.

## 3. Make one small change

Click a slide on the left. Change its **Headline** on the right. Choose a different layout below. Your words should remain, but their arrangement should change. Click **Save**. The message should say **Saved on this computer**.

## 4. Carry away a copy

Click **Export**, then **PowerPoint**. Open the `.pptx` file in your presentation software. Click a title: it should be text you can edit, not a screenshot.

Also export **Project JSON**. This is your complete working backup. PowerPoint is a delivery format, not a file DeckWeft can currently import back.

## 5. Come back later

Stop the terminal with `Ctrl+C`, then run the studio command again. Your saved project should still be in the library. Default storage is `~/.deckweft/`; the tilde means your personal home folder. Use `--home ./my-local-library` to choose another real folder.

Stuck? Read the [simple manual](manual.md). Ready to use an AI coding assistant? Read [installation](installation.md).
