#!/bin/bash

if [ -z "$1" ]; then
    set -- "$(dirname "$0")"/*.ls
fi

for in_fn; do
    (
        while read line; do
            [ -z "$line" ] && break
            echo "//${line#"#"}"
        done <"$in_fn"

        lsc --compile --bare --print "$in_fn"
    ) >"$(dirname "$in_fn")/../$(basename "${in_fn%.*}.js")"
done
