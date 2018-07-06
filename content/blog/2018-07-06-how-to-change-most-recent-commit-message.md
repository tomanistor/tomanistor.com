+++
title = "How To Change Most Recent Commit Message"
slug = "how-to-change-most-recent-commit-message"
date = "2018-07-06T13:44:09-07:00"
description = "If you're like me, on more than one occasion you've typed out your commit message and noticed a nasty typo after the fact. Here's a quick way to amend your last commit message."
draft = false
+++
If you're like me, on more than one occasion you've typed out your commit message and noticed a nasty typo after the fact.

Here's a quick way to amend your last commit message if you have already entered your commit message in the terminal but have not yet pushed your local branch to the remote branch.

```bash
git commit --amend
```

This will open up your editor to edit your commit message. But if your prefer to do it all on one line in your terminal, you can type it in directly like this:

```bash
git commit --amend -m "Type your new commit message"
```

Remember, this method works only on your most recent commit and only if it has not yet pushed up to its remote branch.
