+++
title = "Const, Let, and Var"
date = 2017-08-11T23:21:07-07:00
description = "The differences between const, let, and var in JavaScript ECMAScript 2015 or ES6, how they affect scope, and when to use them."
draft = false
+++

![JavaScript ES6](images/blog/javascript-logo.png)

One of the very first things I noticed when I took up JavaScript ECMAScript 2015, or more commonly known as ES6, were the new types of variable declarations. Whereas I had previously only used `var` to declare a variable, I could now declare variables using `let` and `const`.

But how are `let` and `const` different from `var`? And in what situations are they each appropriate to use?

## Scope
Each of the the three variable declarations deal with different levels of scope: **global**, **function**, and **block** level scopes. `const` is used on the global scope level, `let` is used on the function scope level, and `var` is used on the block scope level.

### Global Level Scope
On the global level, variables are accessible anywhere inside the script, including inside any child scopes like functions and blocks. These variables are usually the ones declared at the very top of a script.

```js
var number = 3; //  Global level
console.log(number) // Returns 3
```

### Function Level Scope
On the function level, variables are accessible inside of functions and their child scopes but not anywhere outside of the function. You would not be able to access a function level scope on the global level.

```js
function addOne() {
  var number = 3; // Function level
  if (number = 3 ) {
    number = number + 1;
    console.log(number); // Returns 4
  }
  console.log(number); // Returns 4
}
console.log(number); // Returns undefined
```

As you can see in this example, the variable `number` is defined on both the function level and the child block level but not on the global level.

### Block Level Scope
The block level is essentially anything in between two curly braces `{ block level scope }`. Variables declared inside of the block level with `var` are *not* only accessible inside of this block.

```js
function addOne() {
  var number = 3; // Function level
  if (number = 3 ) {
    sum = number + 1; // Block level
    console.log(sum); // Returns 4
  }
  console.log(sum) // Returns 4
}
console.log(sum) // Returns undefined
```

In this example, we stored the value of `number + 1` in a new variable called `sum` on the block level yet it's still somehow accessible on the function level outside of the block. This is because JavaScript does not have block level scope with `var`.

## Var
The original variable declaration in JavaScript was `var`. With it, you could assign a value to a variable to store it and use later. However, as we saw above, `var` is weak. `var` cannot give us block level scope.

So this is where we turn to ES6's new `let` and `const` signals.

## Let
The way to create block level scope in JavaScript is with `let`. With `let`, variables declared within statement or expression will only be defined inside of that block and not its parent function.

```js
var apple = "apple";
var orange = "orange";

if (apple != orange) {
  var apple = "crispy";
  let orange = "juicy";

  console.log(apple); // Returns crispy
  console.log(orange); // Returns juicy
}

console.log(apple); // Returns crispy
console.log(orange); // Returns orange
```

In this example, we see that we changed the values of both fruits inside of the if statement using `var` for `apple` and `let` for `orange`. When we used `var`, the value for `apple` changed outside of the block level also. However, when we used `let` for `orange` the value of `orange` changed only inside of the if statement but remained what it was initially outside of that statement.

For this reason, `let` is the best signal for declaring variables that should have a block level scope and/or are frequently reassigned, like in loops and algorithms.

## Const
Like `let` but unlike `var`, `const` can have block level scope. However, unlike `let`, variables cannot be reassigned and recycled throughout your code. For this reason, `const` variables must be assigned a value when initialized whereas `let` and `var` variables can be initialized without value.

```js
const fruit; // Attempt to intialize const variable without value will throw and error
const fruit = "apples";
const fruit = "oranges"; // Attempt to reassign const variable will throw an error
```

Variable declared with `const` can still be mutable. This means that array values and object keys and object values are not protected and can still be changed.

```js
// Declare an object with two key value pairs using const
const person = {
  firstName: "Jon",
  lastName: "Snow"
};

// Attempt to reassign const variable by adding new key will throw an error
const person = {
  firstName: "Jon",
  lastName: "Snow",
  title: "King in the North"
};

// Change key value in object
person.lastName = "Targaryen";
console.log(person.lastName); // Returns Targaryen
console.log(person); // Returns { firstName: "Jon", lastName: "Targaryen" }

// Add key value in object
person.title = "King in the North";
console.log(person); // Returns { firstName: "Jon", lastName: "Targaryen", title: "King in the North" }
```

Most frequently, I have seen `const` used when declared as global variables at the beginning of a script. However, `const` is almost always the ideal way to declare a variable inside of functions. More often than not, you will run into errors or bugs caused by a variable being changed somewhere in the code without you realizing.

It's best to use `const` to prevent variable reassignments and use `let` inside of loops and statements where you want to reuse the same variable name.
