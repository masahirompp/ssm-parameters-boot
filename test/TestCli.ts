import { bootstrap } from '../src/index.js';
import { createTypedParameters } from 'construct-typed-parameters';

await bootstrap(
  'TestApp',
  createTypedParameters(pt => ({
    TOKEN: pt.String({ required: true, defaultValue: 'token' }),
    FIREBASE_CONFIG: pt.Json<{ apiKey: string }>({
      required: true,
      defaultValue: { apiKey: 'apiKey' },
    }),
  })),
  {
    ssmBasePath: '/TEST',
    tagKeyPrefix: 'TEST_',
    secureParameterNames: ['TOKEN'],
    onEnded: result => console.log(result),
  }
);
