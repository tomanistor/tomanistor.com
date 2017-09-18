+++
title = "My First Vue.js App"
date = 2017-09-16T13:09:33-07:00
description = "This was my experience building an app with Vue.js"
draft = false
+++

![Vue.js](images/blog/vuejs-logo.png)

A little while ago, I spent some time researching which frontend JavaScript framework or library I would learn next. The primary criteria was ease of learning, ease of use, and popularity (community support and career usefulness). I chose to [start with Vue.js](content/blog/starting-with-vuejs.md).

My method of learning was by reading the [Vue.js documentation](https://vuejs.org/) and following [Ayo Isaiah's tutorial](https://ayoisaiah.com/vuejs-todolist-app/) for developing a to-do list application. The former was very helpful in introducing me to concepts and the latter was even more helpful in explaining those concepts in practice.

[Here](/to-do-list) is my To Do List app. And down below is how it went and what I've learned in the process.

[![To Do List App](to-do-list/images/to-do-list-screenshot.jpg)](/to-do-list)

## Vue.js Setup
The most hands-off way to use Vue.js is to add a script tag linking to the Vue.js CDN file in the footer the HTML body. During development, it's best to use `https://unpkg.com/vue` since it contains warnings and is best for debugging. When deploying, this should be linked to the minified and gzipped script that is stripped of warnings and is considerably smaller.

```html
<!-- Use https://unpkg.com/vue for development and minified version for production -->
<script src="https://unpkg.com/vue"></script>
<!-- <script src="https://vuejs.org/js/vue.min.js"></script> -->
```

All other script links that depend on Vue.js come after Vue.js script tag.

Other methods of installation include using the [vue npm package](https://www.npmjs.com/package/vue) or scaffolding an app with [vue-cli](https://github.com/vuejs/vue-cli).

## Vue Instance
Vue.js apps are started off by creating a new Vue instance, which is a function that takes in an options object. Some of these options include `el`, `data`, and `methods`. There are [many more](https://vuejs.org/v2/api/#Options-Data). Developing with the Vue.js library is essentially configuring all of these options to get your app to do what you want it to do.

```js
new Vue({
  el: #el-id; // ID of the HTML element
  data: {
    // Data values will go here
  },
  methods: {
    // Methods will go here
  }
  // Other options can be listed here
});
```

### el
The `el` key inside of the options object is used to bind the Vue instance to an HTML element via the `id` attribute, so that anything inside of that element can be connected to the Vue instance.

### data
This is an object inside of the options object that that holds values for the app in Vue's reactivity system. When a `data` value changes here in the model, the view will react to the change and render it in the view.

### methods
This is another object inside of the options object. The `methods` object is where functions are created that can be called on inside of the app.

## Vue Templating
Vue.js includes some pretty cool templating that I enjoyed more than React's JSX. The template syntax is HTML based and uses double mustache braces. It's very similar to Angular.js's template syntax.

Data from the Vue instance is bound to HTML elements in the view using the template syntax. When the app's state changes, Vue re-renders just the DOM elements needed to display those changes.

Here's an example how a data value would be rendered with the templating syntax:

```html
<div id="demo">
  <p>
    {{ text }}
  </p>
</div>
```

```js
  new Vue({
    el: "#demo",
    data: {
      text: "This text will show in the view."
    }
  });
```

## Two-Way Data Binding
My To Do List app was built with two-way data binding. This means that a value can be manipulated in the model and is simultaneously updated in the view, and vice-versa. Vue.js can do this with form input and textarea elements when binding a data value with the `v-model` directive.

For an example, check out my [To Do List app](/to-do-list) which shows the value changing in both the view and the model.

## Initial Thoughts
Ayo's tutorial for building a Vue.js app is phenomenal. It doesn't just drag you through from start to finish expecting you to copy and paste code until it works. He actually explains important concepts and helps you understand new concepts each step of the way.

Completing the app left me satisfied with both what I had constructed and what I had learned. Overall, Vue.js seems fairly straightforward and almost as easy as jQuery to pick up. I was pleased with both how quickly I could put together a working To Do List app and was able to learn in the process.

## Next Step
My next step is to try out a new Laracasts video series: [Learn Vue.js 2: Step by Step](https://laracasts.com/series/learn-vue-2-step-by-step). It's been called the best way to learn Vue and, best of all, it's free!

The ultimate goal is to build out a Vue.js app and connect it to an API and database. It'll be a big learning experience, as I'll also be using tech I'm largely unfamiliar with on the backend. Right now, I'm thinking Vue.js, Node.js/Hapi and GraphQL or MongoDB. We'll see how it goes!
