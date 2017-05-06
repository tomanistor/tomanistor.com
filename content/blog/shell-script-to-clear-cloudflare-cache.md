+++
title = "Shell Script to Clear CloudFlare Cache"
date = "2017-05-05T16:03:45-07:00"
description = "How to create a shell script in Linux or iOS that clears the CloudFlare cache."

+++

[CloudFlare](https://cloudflare.com) is a free content delivery network (CDN) that helps deliver static content quickly and efficiently throughout the world. Caching and serving static content through dependable CDNs like CloudFlare, [MaxCDN](https://maxcdn.com), or [AWS CloudFront](https://aws.amazon.com/cloudfront/) can help speed up your website drastically.

>A CDN is essentially a network of geographically dispersed servers. Each CDN node (also called Edge Servers) caches the static content of a site like the images, CSS/JS files and other structural components. The majority of an end-user’s page load time is spent on retrieving this content, and so it makes sense to provide these “building blocks” of a site in as many server nodes as possible, distributed throughout the world.

>When a user requests your site, the node closest in proximity to user will deliver the static content, ensuring the shortest distance for the data to travel (reduced latency), therefore providing the fastest site experience.

Static resources like image, JavaScript, and CSS files that are cached by CloudFlare are sometimes updated on the webhost's server, but CloudFlare will continue serving the older cache versions depending on what browser cache expiration headers are set.

To view your website updates, CloudFlare's cache must be purged and updated files will be retrieved instead. You could always log in to CloudFlare and purge the cache manually each time you make a website update, or you work smarter and create a shell script that does it for you upon deployment.

## How to Create

Shell scripts should be saved in `usr/local/bin/`

```console
$ curl -X GET "https://api.cloudflare.com/client/v4/zones" \
-H "X-Auth-Email: user@example.com" \
-H "X-Auth-Key: c2547eb745079dac9320b638f5e225cf483cc5cfdda41" \
-H "Content-Type: application/json"
```

```
curl -X DELETE "https://api.cloudflare.com/client/v4/zones/:identifier/purge_cache" \
-H "X-Auth-Email: user@example.com" \
-H "X-Auth-Key: 1234567893feefc5f0q5000bfo0c38d90bbeb" \
-H "Content-Type:application/json" \
--data '{"purge_everything":true}'
```

```
cURL (example)
curl -X DELETE "https://api.cloudflare.com/client/v4/zones/023e105f4ecef8ad9ca31a8372d0c353/purge_cache" \
-H "X-Auth-Email: user@example.com" \
-H "X-Auth-Key: c2547eb745079dac9320b638f5e225cf483cc5cfdda41" \
-H "Content-Type: application/json" \
--data '{"purge_everything":true}'
```
