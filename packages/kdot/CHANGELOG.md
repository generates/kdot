# @generates/kdot

## 0.1.7

### Patch Changes

- 10e3a51: BREAKING: Improving secret config

## 0.1.6

### Patch Changes

- d5b0a2a: Fixing load of json files for full paths and fixing loadEnv for nested dirs
- a9cf66c: Running loading of configs in parallel

## 0.1.5

### Patch Changes

- 6eb14a1: Allowing specifying extension for config

## 0.1.4

### Patch Changes

- b2e4056: Fixing call to getRunningPods in port forward reconnect logic
- 7ffd8e9: Update dependency @generates/prompt to ^0.0.3

## 0.1.3

### Patch Changes

- df76fd0: Fix #208

## 0.1.2

### Patch Changes

- 1a1d9c7: Fix #201: Removed set in scale command

## 0.1.1

### Patch Changes

- 0e55eda: Adding missing err to error log in scale

## 0.1.0

### Minor Changes

- 453677b: Adding scale and rollout commands

## 0.0.73

### Patch Changes

- f9ee17e: Fix #182: Correct image build success ouput

## 0.0.72

### Patch Changes

- d65c8df: Fixing ingress path

## 0.0.71

### Patch Changes

- 2f7947c: Update dependency @sindresorhus/slugify to v2
- fb5eef4: Update dependency p-reduce to v3
- a3c5c38: Showing Ready for pod states

## 0.0.70

### Patch Changes

- 9136a99: Make --namespace-tag replace tags instead of tag

## 0.0.69

### Patch Changes

- 76ea77e: Fix #140
- f9b946d: Fix #171, #172, #160, #168
- 046b0d2: Update dependency p-timeout to v5

## 0.0.68

### Patch Changes

- 57701f9: Fixing configs param

## 0.0.67

### Patch Changes

- b93b73a: Add separate config load function
- 7cd69c6: Fix log level in ns command

## 0.0.66

### Patch Changes

- a80d5af: Export configure function
- efba458: Support exported function in config files

## 0.0.65

### Patch Changes

- 6f20d20: Adding namespace command
- 8a8ca33: Add #161: --namespace-tag option to build command

## 0.0.64

### Patch Changes

- 220d2d8: Improve wait with getReadyPods instead of getRunningPods

## 0.0.63

### Patch Changes

- a1abffa: Update dependency @generates/logger to v1
- 0c3d1eb: Fix #156: Missing services

## 0.0.62

### Patch Changes

- 8d11b62: Fix #151: Duplicate services showing up

## 0.0.61

### Patch Changes

- 6321e04: Added #114: Add --wait flag to del command

## 0.0.60

### Patch Changes

- 32a1c6b: Fix get output formatting
- f0a774a: Add #133: Add verbose flag to show

## 0.0.59

### Patch Changes

- c47991c: Fix #137: Dont forward on localPort: false

## 0.0.58

### Patch Changes

- 177974f: Fix #119: dependsOn issue

## 0.0.57

### Patch Changes

- 7362c57: Clarifying delete message
- 2a10f0f: Fixing env command

## 0.0.56

### Patch Changes

- 1177ed4: Fixing apply timeout
- 625c414: Changing secrets from array to object
- 1177ed4: Updating for port config change
- 1177ed4: Updating for configMap change
- 1177ed4: Allowing additional top-level service config
- b76d828: Changing configMaps from array to object

## 0.0.55

### Patch Changes

- 4a2bc02: Fixing cleanup command options
- 25c1164: Fixing contextSubPath config

## 0.0.54

### Patch Changes

- 76166b3: Adding support for google in kdot-proxy
- d5425bc: Fix #100: Add reconnect on fwd socket error
- 03162f3: Adding env command

## 0.0.53

### Patch Changes

- 12f7a22: Allowing multiple tags for build

## 0.0.52

### Patch Changes

- f1d438f: Updating merger
- 7f9a615: Checking for app.ports in fwd

## 0.0.51

### Patch Changes

- 639bb5c: Adding prop param to getVersion'

## 0.0.50

### Patch Changes

- 4259ddd: Updating cli to 1.0.2

## 0.0.49

### Patch Changes

- 593798d: Fixing getResource filters and improving debugging

## 0.0.48

### Patch Changes

- 3262be2: Loading from file if KUBECONFIG env var set

## 0.0.47

### Patch Changes

- 66e8a99: Adding support for exec

## 0.0.46

### Patch Changes

- 5078891: Fixing GCR build

## 0.0.45

### Patch Changes

- b7307b8: Add error listener to port forward socket

## 0.0.44

### Patch Changes

- 8c4f59e: Fixing getRunningPods failed check

## 0.0.43

### Patch Changes

- 42f169c: Removing async from getVersion

## 0.0.42

### Patch Changes

- e7a5027: Refactoring log to use poll
- 9a6df04: Adding getVersion method

## 0.0.41

### Patch Changes

- c25780f: Streaming build pod logs
- 40afc22: Refactoring del command
- 782df3c: Improving port forward reconnect

## 0.0.40

### Patch Changes

- d27c915: Fixing log and moving dotenv import to configure/index.js
- 61efee8: Adding resource requests to build pod and making it customizeable
- 2550669: Update cli
- 32410c5: #79: Also cleanup completed pods

## 0.0.39

### Patch Changes

- 7c6cbe0: Update dependency @kubernetes/client-node to ^0.14.0
- 13d6dca: Adding cleanup command

## 0.0.38

### Patch Changes

- 9e14e1e: Accepting URL for path to configmap file
- 173b38a: Adding forgotten await

## 0.0.37

### Patch Changes

- 51d92ac: Replace gitinfo logic in getBuildContext

## 0.0.36

### Patch Changes

- 2b601a2: Trying to fix build status issue

## 0.0.35

### Patch Changes

- ebf502e: Adding cp command

## 0.0.34

### Patch Changes

- 18aaa17: Cleaning up getRunningPod debug log

## 0.0.33

### Patch Changes

- 6f4d384: Getting rid of sha from build context

## 0.0.32

### Patch Changes

- 0d50fd1: Fixing missed default for getBuildContext

## 0.0.31

### Patch Changes

- c524b2b: Fixing build context logic

## 0.0.30

### Patch Changes

- 371707c: Using github env vars before reading git info because of checkout differences

## 0.0.29

### Patch Changes

- d1143cc: Fixing build git defaults

## 0.0.28

### Patch Changes

- 76c33a5: Fixing gitinfo import

## 0.0.27

### Patch Changes

- 5ae3e8c: Getting git info for build context defaults

## 0.0.26

### Patch Changes

- 3d07a4f: Fixing isRunning logic

## 0.0.25

### Patch Changes

- fcd391a: Adding imagePullSecret config and fixing getResources filter

## 0.0.24

### Patch Changes

- c09ab16: Reverting build git ref change

## 0.0.23

### Patch Changes

- c47127e: Fixing git ref for build context

## 0.0.22

### Patch Changes

- a1f8bdb: Adding --wait flag to apply

## 0.0.21

### Patch Changes

- f8d5990: kdot-datadog initial release
- 39f105d: Refactoring/simplifying build

## 0.0.20

### Patch Changes

- 533bf60: Apply refactor, initial versions of kdot-proxy and kdot-auth-proxy
- 16ea1c1: Allowing cluster context to be configured

## 0.0.19

### Patch Changes

- 79946be: Filtering out existing namespace from apply
- c84ce54: Refactoring set command to work with new config system

## 0.0.18

### Patch Changes

- 275cd2d: Adding support for dependsOn
- e80038e: Adding build command

## 0.0.17

### Patch Changes

- 78cf533: Fix existing namespace issue
- ae231ab: Adding support for fwd and log reconnection
- 5750ee8: Improving start logic

## 0.0.16

### Patch Changes

- 9a4b3f4: Adding prompt to apply and del commands
- 2384116: Adding support for priority
- c63918d: Adding support for resources config
- 0d60045: Adding support for ConfigMap volumes
- 41ce265: Adding support for probes

## 0.0.15

### Patch Changes

- cbf41f3: Adding ingress support

## 0.0.14

### Patch Changes

- a8dc5b3: Using args for active apps and --prop for get

## 0.0.13

### Patch Changes

- 2a781ab: Adding retry count to port forward for #22
- 8a29307: Trying to fix log done handler

## 0.0.12

### Patch Changes

- 28aa28f: Fix #23: logs error

## 0.0.11

### Patch Changes

- 8cefa7a: Add port name to fwd success if defined
- c36d03c: Fixing service port config and env secret reference
- 992368a: Fix #18: multiple log output issue

## 0.0.10

### Patch Changes

- d99b1f6: Fixing backwards envKey and secretKey

## 0.0.9

### Patch Changes

- ffd2f78: Fixing secret valueFrom issue

## 0.0.8

### Patch Changes

- d61df18: Fixing secret logic

## 0.0.7

### Patch Changes

- 5aad676: base64 encoding secret data

## 0.0.6

### Patch Changes

- 737dee0: Refactoring config logic

## 0.0.5

### Patch Changes

- 1619c71: Adding logic to create secrets
- df170f6: Simplifying logging

## 0.0.4

### Patch Changes

- a26bd82: Fixing port config and log

## 0.0.3

### Patch Changes

- 9e7b13b: Adding missing generates packages

## 0.0.2

### Patch Changes

- f34c837: Fixing image config
- 3adbdd7: Cleaning up port config

## 0.0.1

### Patch Changes

- 55bd27e: Initial version
