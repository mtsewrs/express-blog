var postcss = require('gulp-postcss');
var gulp = require('gulp');
var autoprefixer = require('autoprefixer');
var minifyCss = require('gulp-minify-css');
var uglify = require('gulp-uglify');


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



// Rerun the task when a file changes
gulp.task('watch', function() {
  gulp.watch('./stylesheets/**.css', ['css']);
});

gulp.task('default', ['watch', 'css', 'minify-css']);