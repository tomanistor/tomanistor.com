+++
title = "Cache Bust that Asset"
date = "2017-06-20T13:00:59-07:00"
description = "How to cache bust your static assets and force web browsers to serve uncached, freshly updated files."
draft = false
+++

Static assets like CSS, JavaScript, and image files are normally cached for long periods of time with expiry periods of a few weeks or months after being served to a user's web browser. **Caching is used to speed up a website or application by once downloading a file and storing a cached version of it in the browser.** When a user moves from page to page on a website or revisits the same site in the future, the cached file is served automatically without wasting any time loading the same file.

All in all, a faster loading site is great for usability and user experience, thus also great for SEO. However, caching assets comes with one major drawback: **browsers will continue to serve the same cached version of a file that has not reached its expiry period even if that file has been updated.** This means that if you've made an update to `main.css`, the browser will continue serving the old, outdated version of `main.css` until the expiry period is over or the user clears their cache. This is of course troublesome when you want to deploy your site updates but browsers won't serve your updates.

A user can manually clear their browser's cache if they know how (with a hard refresh or through the browser's settings) and they choose to do so, but serving updated assets shouldn't be left at the whim of a user. Cache busting is a web developer's responsibility.

## What is Cache Busting?
**Cache busting is the forced clearing of files cached in a web browser.** When cached assets are cleared, the cache is effectively reset and assets must be downloaded again via HTTP request when a user visits the same site again. The browser doesn't need to wait for the end of assets' expiry period or the user clearing the cache.

Sure, the file needs to be downloaded again, which may temporarily slow down your site a bit. But the important thing is that cache busting forces browsers to serve your updated files so users experience the newest and most up-to-date version of your web app.

## How is Cache Busting Done?
One effective way to cache bust old files is to "fingerprint" them. A browser will serve the same, old, previously downloaded version of `main.css` regardless of file updates because it only looks for the file name in an HTTP request. The browser notices that it has a cached version of the file requested for the site and serves it to the user.

However, if the file name has changed, the browser will determine that this is a new file and must be downloaded and stored in the cache. **Fingerprinting static assets is adding a unique hash to the file name in order to force the browser to download and serve the asset**. When a user revisits the site and `main.css` has changed to `main-2017206216.css`, the browser fetches, downloads, serves, and caches the new resource. The next time a developer updates the resource and gives the file a new hash, the browser again serves the newly requested resource.

So in short, the cache is "busted" because we trick the browser into serving updated assets by adding unique fingerprints file names to distinguish between different versions. The old, outdated assets remain cached by the browser but aren't touched because they're no longer linked on the website and thus no longer requested by the user visiting the site.

## Cache Busting Tools
Fingerprinting CSS or JS files can be done manually by renaming files and updated links, but that's probably the least optimal way of going about it. For this reason, many programming language frameworks and tools do the dirty work for us.

Ruby on Rails, for example, has the [asset pipeline](http://guides.rubyonrails.org/asset_pipeline.html). The asset pipeline automatically fingerprints CSS, JS, and image files inside of asset folders. Asset files are then linked to using Rails helpers such as `asset_path`, `image_tag`, `javascript_include_tag` and `stylesheet_link_tag`.

On this Hugo static site, I use [Gulp.js](http://gulpjs.com/) and [gulp-hash](https://www.npmjs.com/package/gulp-hash) in order to automatically add a random hash to my CSS and JS file names any time there is an update. These two guides by [Hugh Grigg](https://www.hughgrigg.com/posts/gulp-asset-versioning-hugo-data-files/) and [Dan Bahrami](http://danbahrami.io/articles/building-a-production-website-with-hugo-and-gulp-js/#cache-busting:c9938300a3bdba2018b469c2485ca2b6) provide good instructions on setting up cache busting for a Hugo site with the Gulp.js pipeline and gulp-hash.

## Fingerprinting Image Files and SEO
What about image files? They're static assets too and images may also be updated or changed from time to time. From an SEO standpoint though, is it a good idea to add gibberish in hash form to the file name *and* force search engines to re-index a image files?

My SEO instincts tell me I don't want to reset progress on a highly indexed image if I compressed or changed the file size. I also don't want to add random numbers and letters to a file name that I use to target keywords. Hot-linking isn't a concern to me but broken links are. If an image file name changes from `mysite.com/logo.png` to `mysite.com/logo-201612080755.png` but the first URL is linked elsewhere on the web, the image would not display and show as a broken file path.

I don't know how Google's or Bing's algorithm treat fingerprinting ([I've tried to ask the question on StackOverflow](https://webmasters.stackexchange.com/questions/106195/does-fingerprinting-image-file-names-hurt-seo-rankings)) but I'd assume search engines are intelligent enough to break down a file name into keywords and discard the hash. [Google recommends fingerprinting file names](https://developers.google.com/web/fundamentals/performance/optimizing-content-efficiency/http-caching?hl=en) but doesn't discuss image files in particular. Most image files also aren't updated as often as other assets, so changing file paths shouldn't be too much of a concern, but each project has different circumstances.

Although I'm still on the fence about fingerprinting image files, I take it on a case by case basis. In most of my Ruby on Rails projects, I use the default asset pipeline setting and fingerprint all static assets. On this static Hugo website that doesn't contain many images and images aren't really ever changed, I only fingerprint and cache bust CSS and JS files.
