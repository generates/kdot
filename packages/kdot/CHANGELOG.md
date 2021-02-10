# @generates/kdot

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
