/* eslint-disable @typescript-eslint/naming-convention */
import {TypedParameters} from 'construct-typed-parameters';
import {bootstrap} from '../src/index.js';

const parameters = new TypedParameters(pt => ({
  TOKEN: pt.string({required: true, defaultValue: 'token'}),
  FIREBASE_CONFIG: pt.json<{apiKey: string}>({
    required: true,
    defaultValue: {apiKey: 'apiKey'},
  }),
}));

await bootstrap('TestApp', parameters, {
  ssmBasePath: '/TEST',
  tagKeyPrefix: 'TEST_',
  secureParameterNames: ['TOKEN'],
  onEnded(result) {
    console.log(result);
  },
});
