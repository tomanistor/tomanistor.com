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

However, I quickly came to find that it wasn't possible to target and manipulate pseudo-elements as they're not part of the DOM.

## The Solution
