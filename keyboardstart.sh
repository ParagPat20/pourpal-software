#!/bin/bash

# Check if wvkbd-mobintl is running
if pgrep -x "wvkbd-mobintl" > /dev/null
then
    echo "wvkbd-mobintl is already running."
else
    # Start wvkbd-mobintl with the desired options
    wvkbd-mobintl -L 300 -bg 90EE90 --press 00ff00 --press-sp 00ff00 -O &
    echo "wvkbd-mobintl started."
fi