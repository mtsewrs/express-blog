var postcss = require('gulp-postcss');
var gulp = require('gulp');
var autoprefixer = require('autoprefixer');
var minifyCss = require('gulp-minify-css');
var uglify = require('gulp-uglify');
var eslint = require('gulp-eslint');

gulp.task('css', function () {
    var processors = [
        require('precss')({ /* options */ }),
        require('postcss-responsive-type'),
        require('lost'),
        autoprefixer({browsers: ['last 1 version']}),
        require('postcss-initial')
    ];
    return gulp.src('./stylesheets/styles.css')
        .pipe(postcss(processors))
        .pipe(gulp.dest('./stylesheets/dist'));
});

gulp.task('minify-css', function() {
  return gulp.src('./stylesheets/dist/styles.css')
    .pipe(minifyCss({compatibility: 'ie8'}))
    .pipe(gulp.dest('./public/css/'));
});

gulp.task('lint', function () {
    return gulp.src(['./public/js/*.js'])
        // eslint() attaches the lint output to the eslint property
        // of the file object so it can be used by other modules.
        .pipe(eslint())
        // eslint.format() outputs the lint results to the console.
        // Alternatively use eslint.formatEach() (see Docs).
        .pipe(eslint.format())
        // To have the process exit with an error code (1) on
        // lint error, return the stream and pipe to failAfterError last.
        .pipe(eslint.failAfterError());
});

// Rerun the task when a file changes
gulp.task('watch', function() {
  gulp.watch('./stylesheets/**.css', ['css', 'minify-css']);
});

gulp.task('default', ['watch', 'css', 'minify-css']);