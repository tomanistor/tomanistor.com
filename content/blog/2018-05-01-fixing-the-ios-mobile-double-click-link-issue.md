+++
layout = "blog"
title = "Fixing the iOS Mobile Double-Click Link Issue"
slug = "fixing-the-mobile-double-click-link-issue"
description = "How I worked around the issue of needing to double click links with hover effects on iPhones and iPads."
date = "2018-05-01T21:06:32-07:00"
+++
One of my recent site builds came back from a round of QA with a bug present only on mobile iOS devices. It was a set of tab links that required two clicks to function on  iPhones and iPads.

The buggy tab links had an effect that added a pseudo element to the right of each link indicating when a link was hovered over, in focus, or active. These tab links worked as just as expected on Chrome, Firefox, and desktop Safari: one single click would activate and display a new tab panel.

```scss
a {
  &:hover {    
    &::after {
      content: " pseudo element";
    }
  }
}
```

However, the tab links didn't work correctly on the iPhone and iPad. When clicked, the pseudo element displayed next to the link but the tab panel did not change until it was followed up with a second link.

A quick investigation brought me to a [CSS-Tricks article by Chris Coyer](https://css-tricks.com/annoying-mobile-double-tap-link-issue/) that discussed the bug I was experiencing. I wasn't quite sure until this moment how the pseudo element was breaking my tab links.

It seems that on Safari mobile, the first click triggers the hover state and the second click  triggers the link click. Since the design necessitated a hover state, I had to keep reading until I found a [solution in the comments](https://css-tricks.com/annoying-mobile-double-tap-link-issue/#comment-1604517).

> This double-click situation happens only when an element inside the link changes from display none to another value of display on hover. An easy workaround is to use any other way of hiding/revealing this element (opacity, visibility, position…) instead of display none.

It worked. I hid the `::after` pseudo element nested inside the `a` tag with `opacity: 0` and changed it to `opacity: 1` on hover.

```js
a {
  &::after {
    content: " pseudo element";
    opacity: 0;
  }

  &:hover {    
  &::after {
    opacity: 1;
  }
}
```

Now the tab links don't require a second click on iPhones and iPads and work just as intended with a singular click.
