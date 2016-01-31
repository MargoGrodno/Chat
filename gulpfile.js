'use strict';

var gulp = require('gulp');
var concat = require('gulp-concat');
var concatCss = require('gulp-concat-css');
var connect = require('gulp-connect');
var minifyCss = require('gulp-minify-css');
var rename = require('gulp-rename');
var uglify = require('gulp-uglify');

gulp.task('connect', function() {
    connect.server({
        root: 'app',
        livereload: true
    });
});

gulp.task('scripts', function() {
    return root = gulp.src(['bower_components/emitter.js/*.js', 'bower_components/lodash/lodash.js', 'bower_components/jquery/dist/jquery.js', 'client/js/*.js'])
        .pipe(concat('main.js'))
        .pipe(gulp.dest('dist/client/js'))
        .pipe(uglify())
        .pipe(rename('main.min.js'))
        .pipe(gulp.dest('dist/client/js'))
        .pipe(connect.reload());;
});

gulp.task('css', function() {
    return gulp.src(['bower_components/font-awesome/css/*.min.css', 'client/css/*.css'])
        .pipe(concatCss("main.css"))
        .pipe(minifyCss({
            compatibility: 'ie8'
        }))
        .pipe(gulp.dest('dist/client/css'))
        .pipe(connect.reload());;
});

gulp.task('watch', function() {
    gulp.watch(['client/js/*.js'], ['scripts']);
    gulp.watch(['client/css/*.css'], ['css']);
});

gulp.task('default', ['connect', 'watch']);
