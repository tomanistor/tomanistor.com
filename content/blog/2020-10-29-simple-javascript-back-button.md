+++
title = "Simple JavaScript Back Button"
slug = "simple-javascript-back-button"
date = 2020-10-29T02:18:41.936Z
description = "How to make a back button that goes to the previous page in JavaScript"
draft = false
+++
The `window.history` object can be used to manipulate a browser's session history. Session history is localized to each specific browser tab. This means that we can also traverse between pages stored in a tab's `window.history` object.

To go back one page:
```js
history.back();
```

Or:
```
history.go(-1);
```

Both methods navigate to the previous page stored in the session history, but `history.go()` can be used to go backward or forward any number of pages specified as the parameter if they exist within the session history's range.

Likewise, `history.forward()` and `history.go(1)` will both go forward one page and `history.go(0)` will reload the current page.

To finish off the creation of a back button that acts like a browser's native back button, we can write it like this:

```html
<button onclick="window.history.back()">Back</button>
```
