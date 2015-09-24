var postcss = require('gulp-postcss');
var gulp = require('gulp');
var autoprefixer = require('autoprefixer');

var paths = {
  css: './stylsheets/*.css'
};

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
        .pipe(gulp.dest('./public/css/'));
});

// Rerun the task when a file changes
gulp.task('watch', function() {
  gulp.watch('./stylesheets/**.css', ['css']);
});

gulp.task('default', ['watch', 'css']);