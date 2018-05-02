+++
layout = "blog"
title = "Fixing the iOS Mobile Double-Click Link Issue"
slug = "fixing-the-mobile-double-click-link-issue"
description = "How I worked around the issue of needing to double click links with hover effects on iPhones and iPads."
date = "2018-05-01T21:06:32-07:00"
+++
One of my recent site builds came back from a round of QA with a bug present only on mobile iOS devices. It was a set of tab links that required two clicks to function on  iPhones and iPads.

The buggy tab links had an effect that added a pseudo element to the right of each link indicating when a link was hovered over, in focus, or active. These tab links worked as just as expected on Chrome, Firefox, and desktop Safari: one single click would activate and display a new tab panel.

However, the tab links didn't work correctly on the iPhone and iPad. When clicked, the pseudo element displayed next to the link but the tab panel did not change until it was followed up with a second link.

A quick investigation brought me to a [CSS-Tricks article by Chris Coyer](https://css-tricks.com/annoying-mobile-double-tap-link-issue/) that discussed the bug I was experiencing. I wasn't quite sure until this moment how the pseudo element was breaking my tab links.

It seems that on Safari mobile, the first click triggers the hover state and the second click  triggers the link click. Since the design necessitated a hover state
