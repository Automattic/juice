
test:
	@node test/run.js
	@./node_modules/.bin/mocha \
		--reporter spec \
		test/test.js
	@./node_modules/.bin/expresso \
		-t 3000 \
		--serial \
		test/juice.test.js

.PHONY: test
