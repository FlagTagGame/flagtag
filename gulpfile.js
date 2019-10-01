let gulp = require('gulp'),
	javascriptObfuscator = require('gulp-javascript-obfuscator');

gulp.task('default', function(){
	return gulp.src('src/js/*.js')
		.pipe(javascriptObfuscator())
		.pipe(gulp.dest('public/js'));
});
