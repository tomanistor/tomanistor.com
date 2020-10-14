+++
title = "Using currentColor for More Concise CSS"
slug = "using-currentcolor-for-more-concise-css"
date = 2020-10-14T05:26:16.833Z
description = "The currentColor value in CSS allows us to style more concisely by leveraging color as a variable."
draft = false
+++
The `currentColor` value in CSS allows us to style more concisely by leveraging color as a variable. In the following examples, you'll see how we use `currentColor` to avoid repeating code when dealing with color values.

## What is `currentColor`?
Simply put, `currentColor` represents the value of an element's `color` property. If `color: #333333` then `currentColor` is `#333333`.

## How is it used?
To make code more concise, it is used like a scoped variable. The current element and child elements have the ability to inherit the element's calculated color value.

### Self
For example, `currentColor` may be used within the same element where the color of something like the border needs to match the color of the text.

Original code:
```scss
button {
  color: #212121;
  border: 1px solid #212121;
}
```

Improved code:
```scss
button {
  color: #212121;
  border: 1px solid currentColor;
}
```

### Children
Descendants of the original element can inherit to color value. This comes in handy for SVGs, which use the `fill` property, have a default value of `#000000` and cannot use the `inherit` value to achieve the same result without also setting the `fill` on the parent element.

Original code:
```scss
button {
  color: #8510D8;

  svg {
    fill: #8510D8;
  }
}
```

Improved code:
```scss
button {
  color: #8510D8;

  svg {
    fill: currentColor;
  }
}
```

### Pseudo Elements
The `currentColor` value also works with pseudo-elements like `before` and `after`.

Original code:
```scss
button {
  color: #8510D8;

  &::before,
  &::after {
    content: "";
    display: block;
    width: 100%;
    height: 1px;
    margin: 2px 0;
    background-color: #8510D8;
  }
}
```

Improved code:
```scss
button {
  color: #8510D8;

  &::before,
  &::after {
    content: "";
    display: block;
    width: 100%;
    height: 1px;
    margin: 2px 0;
    background-color: currentColor;
  }
}
```

### State
Perhaps one of the most useful examples might be when state is changed for an element, such as with `:hover`, `:focus`, or `:active`. The `currentColor` value can be used to maintain a certain color through state changes.
