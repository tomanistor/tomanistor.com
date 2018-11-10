import gulp         from 'gulp'
import sass         from 'gulp-sass'
import autoprefixer from 'gulp-autoprefixer'
import uglify       from 'gulp-uglify'
import hash         from 'gulp-hash'
import del          from 'del'
import pump         from 'pump'

const staticDir  = 'themes/osprey/static/',
      scriptsDir = `${staticDir}scripts/`,
      stylesDir  = `${staticDir}styles/`

// Minify JS
gulp.task('js', (cb) => {
  // Delete old JS files
  del([`${scriptsDir}*-*.min.js`])

  // Minifiy and hash JS files
  pump([
    gulp.src(`${scriptsDir}src/*.js`),
    uglify(),
    hash({ template: '<%= name %>-<%= hash %>.min<%= ext %>' }),
    gulp.dest(scriptsDir),
    hash.manifest('cachedAssets.json'), // Create hash map
    gulp.dest('data/') // Put hash map in data folder
  ],
  cb
  )
})

// Compile and minify SCSS files to CSS
gulp.task('scss', (cb) => {
  // Delete old CSS files
  del([`${stylesDir}main-*.min.css`])

  // Compile and hash CSS files
  pump([
    gulp.src(`${stylesDir}scss/main.scss`),
    sass({ outputStyle: 'compressed' }),
    autoprefixer({ browsers: ['last 10 versions'] }),
    hash({ template: '<%= name %>-<%= hash %>.min<%= ext %>' }),
    gulp.dest(stylesDir),
    hash.manifest('cachedAssets.json'), // Create hash map
    gulp.dest('data/') // Put hash map in data folder
  ],
  cb
  )
})

// Watch scripts and styles folders for changes
gulp.task('watch', ['js', 'scss'], () => {
  gulp.watch(`${scriptsDir}src/*.js`, ['js']),
  gulp.watch(`${stylesDir}scss/*.scss`, ['scss'])
})

// Set watch as default task
gulp.task('default', ['watch'])
