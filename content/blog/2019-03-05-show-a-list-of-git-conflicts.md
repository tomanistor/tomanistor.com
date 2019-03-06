+++
title = "Show a List of Git Conflicts"
slug = "show-a-list-of-git-conflicts"
date = "Invalid date"
description = "How to set up a git alias that can display a list of files with merge conflicts when attempting a git merge."
draft = false
+++
Working in a large code base with many other developers can lead to instances of merge conflicts. Merge conflicts happen when two branches modify the same lines of code and git can't resolve which changes to keep.

Typically, git is pretty good with merging distinctly separate work together up to this point, when merge conflicts arise and require human intervention. When that happens, git will alert you in the terminal with a message that looks like this:

```bash
$ git merge feature-branch
Auto-merging app.js
CONFLICT (content): Merge conflict in app.js
Auto-merging header.js
CONFLICT (content): Merge conflict in header.js
Auto-merging menu.js
CONFLICT (content): Merge conflict in menu.js
Automatic merge failed; fix conflicts and then commit the result.
```
With one to two merge conflicts, they may be easy to find and resolve. At times, I've had to merge a newer branch into a much older branch which resulted in hundreds of file changes. Most of the merge was smooth, but there were conflicts in about a dozen files that required manual merging.

Although my editor certainly aids me in finding the correct files, I wanted to display an output of all the files that showed a `CONFLICT` during the merge right in my terminal. With a little advice from [Stack Overflow](https://stackoverflow.com/questions/3065650/whats-the-simplest-way-to-get-a-list-of-conflicted-files), I used `git diff` to print out a filtered list of all the files that were unmerged (`--name-only` shows only the names of files and `--diff-filter=U` shows only unmerged files).

```bash
$ git diff --name-only --diff-filter=U
```

## Set Up an Alias
To go a step further, I took this command and gave it a global git alias so that I wouldn't have to keep typing it all out each time since I'll be using it frequently enough.

```bash
$ git config --global alias.conflicts "diff --name-only --diff-filter=U"
```

Now, with a git alias called `conflicts`, I can just type `git conflicts` to display a list of files with merge conflicts. When I have three files with merge conflicts, I can list them off like this:

```bash
$ git conflicts
app.js
header.js
menu.js
```
