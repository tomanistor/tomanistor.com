+++
title = "Starting with Vue.js"
date = 2017-07-09T23:23:29-07:00
description = "My newest journey in web development is now learning Vue.js, a JavaScript library."
draft = false
+++

![Vue.js](images/blog/vuejs-logo.png)

Lately, I've been a little indecisive on which JavaScript framework or library to dive into next. Based on all of the job descriptions I've been plowing through, any front-end and even most full-stack web development roles require proficiency with a number of different JavaScript frameworks.

## Vanilla JavaScript is Not Enough
A lot of advice directed at junior web developers that I've come across online stresses the importance of mastering JavaScript before attempting to level up with frameworks. Some even suggest that a junior developer that knows a framework or two isn't as valuable as one with a just a solid understanding of pure JavaScript.

However, that advice doesn't seem to take into account job descriptions and phone screens that specifically filter out candidates who haven't populated their resumes with certain frameworks. With jQuery and [Uni.js](https://github.com/justenPalmer/uni) as the only JavaScript libraries in my tool belt, I figured it was time to gear up with another.

## Picking the Next One
For a while, I was researching various JavaScript frameworks and ranking them based on job demand in my region, ease of learning, availability of guides and tutorials, and figuring out the pros and cons of the actual frameworks themselves.

### AngularJS and Angular
[AngularJS](https://angularjs.org/) and [Angular](https://angular.io/) were the clear winners in my market. Besides being in demand, a big appeal for me was the MVC framework, which I wanted to learn with JavaScript since I enjoyed using it with Ruby on Rails. The MVC structure may also be better for a junior developer to learn and develop good habits with.

Although AngularJS is supposedly on its deathbed (with the arrival of Angular 2 and Angular 4), I still had a little interest in learning it in order to appreciate Angular in the future. Angular seems like a massive framework geared more toward enterprise-sized applications and having to also learn and use TypeScript didn't get me too excited.

### React
[React](https://facebook.github.io/react/) was next big dog on the list. In contrast to the two previous frameworks, React is just a library that deals with the view alone. A company I interviewed with relied heavily on React, so I chose to dive in head first with a [quick tutorial](https://scotch.io/tutorials/build-a-mini-netflix-with-react-in-10-minutes) on building a video uploading, displaying, and sharing app. I created my [Miniflix](https://miniflix-react.herokuapp.com/) app but didn't as much out of it with understanding React as I got dev ops practice with Auth0, Cloudinary, and Heroku. I have a lot to learn and from the opinions I've read online, React requires plenty of time, patience, and practice.

### Vue.js
One week after my interview with the React company, I had a great interview for a front-end web developer role at a different company that used Ruby, JavaScript, and jQuery without any other major JS framework. However, the lead developer informed me that his aim is to adopt a new JavaScript framework or library for their user interfaces. And that framework was [Vue.js](https://vuejs.org/).

I asked the lead dev why he chose Vue.js over something like React and described it basically as a [summary of this article](https://medium.com/js-dojo/react-or-vue-which-javascript-ui-library-should-you-be-using-543a383608d). It piqued my interest. So what did I do? I naturally researched more about Vue.js, its [comparison to Angularjs and React](http://www.valuecoders.com/blog/technology-and-apps/vue-js-comparison-angular-react/), and [comparison to other frameworks](https://vuejs.org/v2/guide/comparison.html), then made up my mind to learn it and start my next app with Vue.js.

## What is Vue.js?

Vue.js is a JavaScript library that deals with just the view and is used for building user interfaces. From [Vuejs.org](https://vuejs.org/):

> Vue (pronounced /vjuː/, like view) is a progressive framework for building user interfaces. Unlike other monolithic frameworks, Vue is designed from the ground up to be incrementally adoptable. The core library is focused on the view layer only, and is very easy to pick up and integrate with other libraries or existing projects. On the other hand, Vue is also perfectly capable of powering sophisticated Single-Page Applications when used in combination with modern tooling and supporting libraries.

Vue.js is very similar to React in scope and AngularJS in syntax, except a lot simpler and lighter than each. Some concepts from both are borrowed, like AngularJS's templating and React's one-way data binding, utilization of a virtual DOM, and component architecture.

In my next post, I'll discuss my first app developed with Vue.js and how surprisingly easy it was to learn by doing.
