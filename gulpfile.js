// TODO: Figure out how to use pump the same way as .pipe so that hash maps manifested in data folder are not duplicated in data/scripts (css is present also)

var gulp         = require("gulp"),
    sass         = require("gulp-sass"),
    autoprefixer = require("gulp-autoprefixer"),
    uglify       = require("gulp-uglify"),
    hash         = require("gulp-hash"),
    del          = require("del"),
    pump         = require("pump");

// Minify JS
gulp.task("js", function (cb) {

  // Delete old JS files
  del(["themes/osprey/static/scripts/*.js"])

  // Minifiy and hash JS files
  pump([
        gulp.src("themes/osprey/static/scripts/src/*.js"),
        uglify(),
        hash(),
        gulp.dest("themes/osprey/static/scripts"),
        // Create a hash map
        hash.manifest("hash.json"),
        // Put hash map in data folder
        gulp.dest("data/scripts")
      ],
      cb
  );
});

// Compile and minify SCSS files to CSS
gulp.task("scss", function () {

  // Delete old CSS files
  del(["themes/osprey/static/styles/*.css"])

  // Compile and hash CSS files
  gulp.src("themes/osprey/static/styles/scss/main.scss")
      .pipe(sass({
        outputStyle : "compressed"
      }))
      .pipe(autoprefixer({
        browsers : ["last 20 versions"]
      }))
      .pipe(hash())
      .pipe(gulp.dest("themes/osprey/static/styles"))
      // Create a hash map
      .pipe(hash.manifest("hash.json"))
      // Put hash map in data folder
      .pipe(gulp.dest("data/styles"))
});

// Watch scripts and styles folders for changes
gulp.task("watch", ["js", "scss"], function () {
  gulp.watch("themes/osprey/static/scripts/src/*.js", ["js"]),
  gulp.watch("themes/osprey/static/styles/scss/*.scss", ["scss"])
});

// Set watch as default task
gulp.task("default", ["watch"]);
