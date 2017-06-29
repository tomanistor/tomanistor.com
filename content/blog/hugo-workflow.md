+++
title = "Hugo Workflow"
date = "2017-04-28T11:32:36-07:00"
description = "The Hugo workflow is fairly simple and straightforward. This is the workflow I use to update and operate this blog and portfolio."
aliases = ["/posts/hugo-workflow", "/post/hugo-workflow"]
draft = false
+++

The Hugo workflow is fairly simple and straightforward. This is the workflow I use to update and operate this blog and portfolio.

Inside of your Hugo project folder, the `public/` folder is generated with all of your static site files once `hugo` is run in the terminal.

## Purge and Serve ##
To generate a new `public/` folder, just remove the existing one and run the server. All updates you have made to your content and theme are now available in the new `public/` folder and visible on the live server.

Always make sure to remove the old `public/` folder otherwise Hugo will continue to update existing files and add new files without removed old unused files. You definitely don't want the clutter and confusion.

```console
$ rm -rf public/
$ hugo server --verbose
```

### LiveReload ###
One of my favorite features in Hugo so far? LiveReload. The Hugo server automatically watches your project folder for changes and refreshes your browser when any new changes are made while editing, creating, or deleting files.

This is great for development when you can make changes in your text editor and immediately see them occur in your browser window.

If you want to disable LiveReload:

```
$ hugo server --disableLiveReload
```

## Gulp Pipeline ##
When making any styling changes or designing themes, I use a Gulp pipeline to compile my SCSS files into compressed CSS files that are then rendering into the `public/` folder appropriately. Besides compiling and compressing style files, my gulpfile also runs a task that minifies my JavaScript files. Dan Bahrami has a [great guide](http://danbahrami.io/articles/building-a-production-website-with-hugo-and-gulp-js/) that includes setting up a Gulp pipeline and assigning Gulp tasks to watch for changes in style folders.

To get the Gulp pipeline going after I start the Hugo server, I simply type:

```console
$ gulp
```

## New Content ##
Creating new content in the project folder is also very simple. For example, I created this page as a markdown file inside of `content/blog/`:

```console
$ hugo new blog/hugo-workflow.md
```

So far I've been enjoying writing blog posts in markdown.

## Hugo Deploy ##
For deploying Hugo, I currently use [hugodeploy](https://github.com/mindok/hugodeploy), a simple FTP/SFTP deployment tool built in Go. Content inside of `public/` is effortlessly uploaded to my website's root folder on my shared webhost account with two simple commands:

```console
$ hugodeploy preview
$ hugodeploy push
```

A neat extra feature of hugodeploy is the minification of CSS, HTML, JavaScript, JSON, and XML files upon deployment. While this option can be turned off, it does help with file size and site speed if you're not already minifying your static files.

### Rsync Process ###
An alternative deployment method I was thinking about using and may try out down the line is using rsync. Andrew Codispoti detailed the steps to [setting up an rsync process](http://www.andrewcodispoti.com/deploy-process/) that can deploy updates when committing and pushing with git.

### Clear Cache ###
I use CloudFlare as my DNS to cache my static files and help serve them faster around the world. When deploying, I sometimes find that I'll need to clear CloudFlare's caches in order to serve up freshly update files. As a little shortcut to constantly going to the CloudFlare site and manually clearing the cache, I created a [shell script that clears the cache](blog/shell-script-to-clear-cloudflare-cache) after deployment when I call it in the terminal with: `cloudclear`.

## Conclusion ##
All in all, my Hugo workflow is short and sweet. A typical update and publication to the live site can look like this:

```console
$ rm -rf public
$ hugo
$ hugodeploy preview
$ hugodeploy push
```
