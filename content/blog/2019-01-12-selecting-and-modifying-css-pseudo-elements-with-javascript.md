+++
title = "Selecting and Modifying CSS Pseudo-Elements with JavaScript"
slug = "selecting-and-modifying-css-pseudo-elements-with-javascript"
date = "2019-01-12T19:59:16-08:00"
description = "How to target, select, and manipulate CSS pseudo-elements with JavaScript."
image = "/images/blog/vaporwave-palm-trees.jpg"
draft = false
+++
Since they're not part of the DOM, CSS pseudo-elements can't be selected and edited with JavaScript the same way as traditional elements on a page. I ended up going a different route by selecting the regular elements, creating CSS rules for their pseudo elements, and injecting those them into the page.

## The Design

One of my recent projects involved creating 10 sections that follow a similar layout. Each section was distinguished by a numbered tab that was incrementally offset to the right of the previous section's tab.

To create each section's tabs, I absolutely positioned a `::before` pseudo-element at the top of the section. One way to accomplish the design would have been to hardcode the text and numbers in each tab individually and do the same with positioning in the stylesheet. However, I wanted to generate these numbered tabs and their positions programmatically since they followed a reproducible pattern.

![Sketch of tabs](/images/blog/tabs.png)

## The Problem

In the stylesheets, I added the base styles of each section and their pseudo-element tabs.

What I wanted to do with JavaScript was to run through a loop of all 10 tabs so I could add tab numbers to the `content` attribute and change their horizontal positions.

JavaScript allowed me to select my pseudo elements with the `getComputedStyle` method and retrieve specific values.

```js
window.getComputedStyle(
	document.querySelector('section'), ':before'
).getPropertyValue('left')
```

However, I quickly came to find that it wasn't possible to target _and_ manipulate pseudo-elements as they're not part of the DOM.

## The Solution

With a little help from some [Stack](https://stackoverflow.com/questions/5041494/selecting-and-manipulating-css-pseudo-elements-such-as-before-and-after-usin) [Overflow](https://stackoverflow.com/questions/21032481/change-the-style-of-before-and-after-pseudo-elements) threads, I learned that the best solution for my situation was to loop through each of my `section` elements, create CSS rules for each pseudo-element, and then insert the rules inside a `style` tag in the head of the site.

I started with an empty string called `cssRules`, and a number value of `7.5` which was used as the initial `left` position of the tabs. This number was also what each subsequent tab would be incremented by in the for loop.

```js
;(function() {
  var cssRules = '',
      origLeftPosition = 7.5,
      newLeftPosition

  $('section').each(function(i) {
    newLeftPosition = origLeftPosition * (i + 1)
    cssRules += '.section-' + i + "::before{content:'Trend #" + i + "';left:" + newLeftPosition + 'vw;}'
  })

  $('head').append('<style>' + cssRules + '</style>')
})()
```
