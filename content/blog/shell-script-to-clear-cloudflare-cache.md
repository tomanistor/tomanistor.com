+++
title = "Shell Script to Clear CloudFlare Cache"
date = "2017-05-05T16:03:45-07:00"
description = "How to create a shell script in Linux that clears your website's CloudFlare cache."
draft = false
+++

[CloudFlare](https://cloudflare.com) is a free content delivery network (CDN) that helps deliver static content quickly and efficiently throughout the world. Caching and serving static content through dependable CDNs like CloudFlare, [MaxCDN](https://maxcdn.com), or [AWS CloudFront](https://aws.amazon.com/cloudfront/) can help speed up your website drastically.

>A CDN is essentially a network of geographically dispersed servers. Each CDN node (also called Edge Servers) caches the static content of a site like the images, CSS/JS files and other structural components. The majority of an end-user’s page load time is spent on retrieving this content, and so it makes sense to provide these “building blocks” of a site in as many server nodes as possible, distributed throughout the world.

>When a user requests your site, the node closest in proximity to user will deliver the static content, ensuring the shortest distance for the data to travel (reduced latency), therefore providing the fastest site experience.

Static resources like image, JavaScript, and CSS files that are cached by CloudFlare sometimes need to be purged before the CDN can deliver freshly updated resources. You could always log in to CloudFlare and purge the cache manually each time you make a website update, or you work smarter and create a shell script that does it for you upon deployment.

## Get Your CloudFlare Global API Key
First, you must retrieve the CloudFlare **Global API Key**. This key will be available on your CloudFlare account settings page. Copy this key to use in the next

## Get Your CloudFlare Zone ID
The **Zone ID** can be found on your domain's CloudFlare overview page.

Another way to grab your Zone ID is to enter the following command in the terminal and replace the `X-Auth-Email` with your email and the `X-Auth-Key` with your Global API Key.

```console
$ curl -X GET "https://api.cloudflare.com/client/v4/zones" \
-H "X-Auth-Email: user@example.com" \
-H "X-Auth-Key: c2547eb745079dac9320b638f5e225cf483cc5cfdda42" \
-H "Content-Type: application/json"
```

The resulting output will be a load of information about your CloudFlare account's domain names, including a Zone ID associated with each domain name.

## Clear Your CloudFlare cache
We'll use your domain's Zone ID to clear the cache and force Cloudflare to fetch a fresh versions of your static files. Enter the following command in the terminal and again use your email for the `X-Auth-Email` and your Global API Key for the `X-Auth-Key`. However, now replace `ZONE-ID` with your Zone ID.

```console
$ curl -X DELETE "https://api.cloudflare.com/client/v4/zones/ZONE-ID/purge_cache" \
-H "X-Auth-Email: user@example.com" \
-H "X-Auth-Key: c2547eb745079dac9320b638f5e225cf483cc5cfdda42" \
-H "Content-Type:application/json" \
--data '{"purge_everything":true}'
```

If you made changes to the site they should now be visible since the cache will have been cleared.

## Create the Shell Script
Copy that last command into your text editor and add `#!/bin/bash` to the very top of the file. Feel free to add a comment under that line so you know what the bash file does in the future. At the end, I also added an `echo` to print out a message letting me know that the cache has been cleared. It should look something like this:

```console
#!/bin/bash
# Clear CloudFlare cache for tomanistor.com

curl -X DELETE "https://api.cloudflare.com/client/v4/zones/ZONE-ID/purge_cache" \
-H "X-Auth-Email: user@example.com" \
-H "X-Auth-Key: c2547eb745079dac9320b638f5e225cf483cc5cfdda42" \
-H "Content-Type:application/json" \
--data '{"purge_everything":true}'

echo "CloudFlare cache has been cleared"
```

Shell scripts should be saved in `usr/local/bin/`. I named my script `cloudclear` with no file extensions.

## Run the Script
Type the name of your shell script in the terminal. If everything has been done correctly, the script will run and clear your CloudFlare cache.

```console
$ cloudclear
```

There it is! Faster DNS cache clearing.
