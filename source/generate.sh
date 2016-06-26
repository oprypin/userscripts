#!/bin/bash

cd "$(dirname "$0")"

for in_fn in *.ls; do
    out_fn="../${in_fn%.*}.js"
    echo "$in_fn > $out_fn"

    while read line; do
        [ -z "$line" ] && break
        echo "//${line#"#"}"
    done <"$in_fn" >"$out_fn"

    lsc --compile --bare --print "$in_fn" >>"$out_fn"
done
