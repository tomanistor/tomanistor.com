+++
title = "How to Remove Untracked Files from Git"
slug = "how-to-remove-untracked-files-from-git"
date = "2018-05-08T10:36:02-07:00"
description = "How to use git clean to remove local untracked files from git."
image = "/images/blog/notebook-paper.jpg"
draft = false
+++
Untracked files are files in the git repository's working tree that are not present in the git index. These are new files that were not present in the previous snapshot of the repository.

When you don't want to stage and commit these files, `git clean` is a useful way to permanently remove all or a selection of your untracked files in git.

This is what untracked files look like when using `git status`

```bash
Untracked files:
  (use "git add <file>..." to include in what will be committed)

	index.html
	style.css
```

## git clean

While commands like `git reset` and `git checkout` can be used to undo changes to files already present in the git tracking index,  `git clean` is used to remove new and untracked files from the working directory.

```bash
$ git clean -f
```

As a safety precaution, `git clean` does not operated unless the `-f` or `--force` flag is attached to the command, or the `clean.requireForce` git configuration option is set to false. By default this setting is set to true.

```bash
$ git clean -n
```

As another safety precaution, the `-n` or `--dry-run` flag simulates and shows what would have been removed without removing anything

```bash
$ git clean -d
```

The `-d` flag removes untracked directories along with untracked files. If you want to remove entire untracked folders in git, this flag is necessary.

```bash
$ git clean -i
```

Interactive mode for `git clean` is activated with the `-i` or `--interactive` flag. This will display prompt with a list of subcommands that allow you to be very selective with what untracked files you want to remove.

```bash
*** Commands ***
    1: clean                2: filter by pattern    3: select by numbers
    4: ask each             5: quit                 6: help
```

1. **clean**: cleans files and directories.
2. **filter by pattern**: displays a prompt that allows you to input space-separated patterns for filtering out files and directories from being removed. For example, inputting `*.html` will exclude all `.html` files from deletion.
3. **select by numbers**: displays a prompt with the untracked files and folders listed by number. You can select specific numbers or ranges of numbers from the list to delete by separating with whitespace or comma, such as `1,4,6-9`.
4. **ask each**: displays each untracked item individually with a prompt asking if you'd like to delete it.
5. **quit**: quits git clean interactive mode without deleting anything.
6. **help**: displays the git clean interactive mode help screen

```bash
$ git clean -idf
```
This is an example of the command I use regularly. By attaching multiple flags, I enable git clean interactive mode, enable the deletion of untracked directories, and force the clean command. In interactive mode, I most often select `1: clean` if I know I want to delete all untracked files and directories or I'll more carefully refine my selections with `3: select by numbers` or `4: ask each`.

## References
* [Git Documentation](https://git-scm.com/docs/git-clean)
* [Atlassian Git Tutorial](https://www.atlassian.com/git/tutorials/undoing-changes/git-clean)
