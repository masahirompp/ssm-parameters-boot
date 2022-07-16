import { bootstrap } from '../src/index.js';
import { TypedParameters } from 'construct-typed-parameters';

const parameters = new TypedParameters(pt => ({
  TOKEN: pt.String({ required: true, defaultValue: 'token' }),
  FIREBASE_CONFIG: pt.Json<{ apiKey: string }>({
    required: true,
    defaultValue: { apiKey: 'apiKey' },
  }),
}));

await bootstrap('TestApp', parameters, {
  ssmBasePath: '/TEST',
  tagKeyPrefix: 'TEST_',
  secureParameterNames: ['TOKEN'],
  onEnded: result => console.log(result),
});
