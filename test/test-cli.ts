/* eslint-disable @typescript-eslint/naming-convention */
import {TypedParameters} from 'construct-typed-parameters';
import {SsmEnvClient} from 'ssm-env-client';
import {bootstrap} from '../src/index.js';

const parameters = new TypedParameters(pt => ({
  TOKEN: pt.string({required: true, defaultValue: 'token'}),
  FIREBASE_CONFIG: pt.json<{apiKey: string}>({
    required: true,
    defaultValue: {apiKey: 'apiKey'},
  }),
  OPTIONAL: pt.number({required: false}),
}));
const ssmClient = new SsmEnvClient('TestApp');

const result = await bootstrap(parameters, ssmClient);
console.log(result);
