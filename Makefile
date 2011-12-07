FILES=*.html *.js *.json *.css README VERSIONS img/icon*.png img/mercury.png

mercury.zip: $(FILES)
	zip mercury.zip $(FILES)
