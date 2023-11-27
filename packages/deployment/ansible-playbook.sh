#! /bin/sh
exec ansible-playbook -f10 \
  -eSETUP_HOME=/Users/tgreco/agoric-sdk/packages/deployment \
  -eAGORIC_SDK=/Users/tgreco/agoric-sdk \
  -eNETWORK_NAME=`cat /Users/tgreco/agoric-sdk/packages/deployment/network.txt` \
  ${1+"$@"}
