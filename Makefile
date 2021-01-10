ls_files = $(wildcard source/*.user.ls)
js_files := $(ls_files:.ls=.js)
js_files := $(js_files:source/%=%)

.PHONY: all
all: $(js_files)

%.user.js: source/%.user.ls source/generate.sh
	source/generate.sh $<
