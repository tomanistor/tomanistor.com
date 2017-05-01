var gulp         = require("gulp"),
    sass         = require("gulp-sass"),
    autoprefixer = require("gulp-autoprefixer"),
    uglify       = require("gulp-uglify"),
    pump         = require("pump");

// Minify JS
gulp.task("compress", function (cb) {
    pump([
            gulp.src("themes/outrun/static/scripts/src/*.js"),
            uglify(),
            gulp.dest("themes/outrun/static/scripts")
        ],
        cb
    );
});

// Compile and Minify SCSS files to CSS
gulp.task("scss", function () {
    gulp.src("themes/outrun/static/styles/scss/main.scss")
        .pipe(sass({
            outputStyle : "compressed"
        }))
        .pipe(autoprefixer({
            browsers : ["last 20 versions"]
        }))
        .pipe(gulp.dest("themes/outrun/static/styles"))
});

// Watch scripts and styles folders for changes
gulp.task("watch", ["compress", "scss"], function () {
    gulp.watch("themes/outrun/static/scripts/src/*.js", ["compress"]),
    gulp.watch("themes/outrun/static/styles/scss/main.scss", ["scss"])
});

// Set watch as default task
gulp.task("default", ["watch"]);
