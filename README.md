# ssm-parameters-boot

[![npm package][npm-img]][npm-url]
[![Build Status][build-img]][build-url]
[![Downloads][downloads-img]][downloads-url]
[![Issues][issues-img]][issues-url]
[![Commitizen Friendly][commitizen-img]][commitizen-url]
[![Semantic Release][semantic-release-img]][semantic-release-url]

> Edit parameters in CLI and store to aws ssm parameter store

## DEMO

![CLI](https://raw.githubusercontent.com/masahirompp/images/main/ssm-parameters-boot.gif)

## Requirements

```txt
node >= 16.0
typescript >= 4.7
ts-node >= 10.8
```

## Install

```bash
npm i ssm-parameters-boot construct-typed-parameters
```

## Setup

```ts
// cli.ts
import { bootstrap } from "../src/index.js"; // for ESM
import { TypedParameters } from "construct-typed-parameters";

const parameters = new TypedParameters((pt) => ({
  TOKEN: pt.string({ required: true, defaultValue: "token" }),
  FIREBASE_CONFIG: pt.json<{ apiKey: string }>({
    required: true,
    defaultValue: { apiKey: "apiKey" },
  }),
}));

const result = await bootstrap("TestApp", parameters, {
  ssmBasePath: "/TEST",
  tagKeyPrefix: "TEST_",
  secureParameterNames: ["TOKEN"],
});
console.log(result);
```

## Usage

```sh
node --loader ts-node/esm cli.ts
```

### Output

![OUTPUT](https://raw.githubusercontent.com/masahirompp/images/main/ssm-parameters-boot_ssm.png)

[build-img]: https://github.com/masahirompp/ssm-parameters-boot/actions/workflows/release.yml/badge.svg
[build-url]: https://github.com/masahirompp/ssm-parameters-boot/actions/workflows/release.yml
[downloads-img]: https://img.shields.io/npm/dt/ssm-parameters-boot
[downloads-url]: https://www.npmtrends.com/ssm-parameters-boot
[npm-img]: https://img.shields.io/npm/v/ssm-parameters-boot
[npm-url]: https://www.npmjs.com/package/ssm-parameters-boot
[issues-img]: https://img.shields.io/github/issues/masahirompp/ssm-parameters-boot
[issues-url]: https://github.com/masahirompp/ssm-parameters-boot/issues
[codecov-img]: https://codecov.io/gh/masahirompp/ssm-parameters-boot/branch/main/graph/badge.svg
[codecov-url]: https://codecov.io/gh/masahirompp/ssm-parameters-boot
[semantic-release-img]: https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg
[semantic-release-url]: https://github.com/semantic-release/semantic-release
[commitizen-img]: https://img.shields.io/badge/commitizen-friendly-brightgreen.svg
[commitizen-url]: http://commitizen.github.io/cz-cli/
